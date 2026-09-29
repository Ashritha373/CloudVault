// Core configuration & Auth
const API_BASE = window.CloudVaultAuth?.API_BASE || '';

// DOM Elements
const nodesContainer = document.getElementById('nodes-container');
const filesListContainer = document.getElementById('files-list-container');
const fileCountBadge = document.getElementById('file-count-badge');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadProgressWrapper = document.getElementById('upload-progress-wrapper');
const uploadFilename = document.getElementById('upload-filename');
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadPercentage = document.getElementById('upload-percentage');
const toastContainer = document.getElementById('toast-container');

// Global Stats elements
const statTotalFiles = document.getElementById('stat-total-files');
const statUniqueChunks = document.getElementById('stat-unique-chunks');
const statSpaceSaved = document.getElementById('stat-space-saved');
const metricSpaceSavedDisplay = document.getElementById('metric-space-saved-display');
const storageProgressFill = document.getElementById('storage-progress-fill');
const statOnlineNodes = document.getElementById('stat-online-nodes');
const systemHealth = document.getElementById('system-health');

// State tracking
let nodeStatus = {};
let filesCache = []; // Cache for file manifests
let foldersCache = []; // Cache for folders
let currentFolderId = 'root';
let folderStack = [{ id: 'root', name: 'Root Storage' }];
let currentViewMode = 'my-storage'; // 'my-storage' | 'shared-with-me'
let searchQuery = '';

// Helper: Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '';
  if (type === 'success') {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else if (type === 'error') {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`;
  } else {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>`;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toast-slide-in 0.25s reverse cubic-bezier(0, 0, 0.2, 1) forwards';
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 4000);
}

// Helper: Format Bytes to human readable size
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper: Format date strings
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper: Get File Type Icon SVG
function getFileIconSvg(filename, mimeType) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  
  // Folder
  if (mimeType === 'folder') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>`;
  }

  // Image
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`;
  }

  // Code / Document / Default
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;
}

// Fetch Node status & update registry UI
async function updateNodes() {
  try {
    const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/nodes`);
    if (!res.ok) throw new Error('Failed to fetch node registry');
    const nodes = await res.json();
    
    // Sort nodes alphabetically by ID
    nodes.sort((a, b) => a.id.localeCompare(b.id));

    nodesContainer.innerHTML = '';
    let onlineCount = 0;
    
    nodes.forEach(node => {
      const isOnline = node.status === 'ONLINE' && !node.simulatedFailure;
      if (isOnline) onlineCount++;
      
      nodeStatus[node.id] = isOnline;
      nodeStatus[node.id.toLowerCase()] = isOnline;

      const card = document.createElement('div');
      card.className = `node-card ${node.status.toLowerCase()} ${node.simulatedFailure ? 'offline' : ''}`;
      
      // Determine label & action button text
      const statusLabel = node.simulatedFailure ? 'OFFLINE (Simulated)' : node.status;
      const actionText = node.simulatedFailure ? 'Recover Node' : 'Simulate Failure';
      const actionType = node.simulatedFailure ? 'recover' : 'fail';
      
      let latencyClass = 'latency-ok';
      if (node.latencyMs > 50) latencyClass = 'latency-warn';

      card.innerHTML = `
        <div class="node-card-header">
          <div class="node-title-area">
            <div class="node-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div class="node-name-group">
              <h4>${node.id.toUpperCase()}</h4>
              <span class="node-url">${node.url}</span>
            </div>
          </div>
          <span class="node-status-label">${statusLabel}</span>
        </div>
        <div class="node-stats-grid">
          <div class="node-stat-item">
            <span class="label">Response Time</span>
            <span class="val ${latencyClass}">${isOnline ? node.latencyMs + ' ms' : '--'}</span>
          </div>
          <div class="node-stat-item">
            <span class="label">Stored Chunks</span>
            <span class="val">${node.chunkCount || 0}</span>
          </div>
        </div>
        <div class="node-card-actions">
          <button class="btn-simulate" data-node="${node.id}" data-action="${actionType}">
            ${actionText}
          </button>
        </div>
      `;

      nodesContainer.appendChild(card);
    });

    // Update global Stats Online nodes counter
    if (statOnlineNodes) {
      statOnlineNodes.textContent = `${onlineCount} / ${nodes.length}`;
    }
    
    // Update global System Health label
    if (systemHealth) {
      if (onlineCount === nodes.length) {
        systemHealth.className = 'system-pill status-healthy';
        systemHealth.innerHTML = `<span class="pill-dot"></span> HEALTHY`;
      } else if (onlineCount > 0) {
        systemHealth.className = 'system-pill status-degraded';
        systemHealth.innerHTML = `<span class="pill-dot"></span> DEGRADED`;
      } else {
        systemHealth.className = 'system-pill status-offline';
        systemHealth.innerHTML = `<span class="pill-dot"></span> FULLY OFFLINE`;
      }
    }

  } catch (err) {
    console.error(err);
    nodesContainer.innerHTML = `<div class="loading-placeholder" style="color: var(--color-danger);">Failed to sync with node registry: ${err.message}</div>`;
  }
}

// Render Files and Folders with optional live filter
function renderFilesTable() {
  const query = searchQuery.trim().toLowerCase();

  if (currentViewMode === 'shared-with-me') {
    let filteredFiles = filesCache;
    let filteredFolders = foldersCache;

    if (query) {
      filteredFiles = filteredFiles.filter(f => (f.filename || '').toLowerCase().includes(query));
      filteredFolders = filteredFolders.filter(f => (f.name || '').toLowerCase().includes(query));
    }

    fileCountBadge.textContent = `${filteredFiles.length} Shared Files, ${filteredFolders.length} Shared Folders`;
    if (statTotalFiles) statTotalFiles.textContent = filesCache.length;

    if (filteredFiles.length === 0 && filteredFolders.length === 0) {
      filesListContainer.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            ${query ? 'No matching shared files or folders found.' : 'No files or folders shared with you yet.'}
          </td>
        </tr>
      `;
      if (statUniqueChunks) statUniqueChunks.textContent = '0';
      return;
    }

    filesListContainer.innerHTML = '';

    // Render Shared Folders
    filteredFolders.forEach(folder => {
      const row = document.createElement('tr');
      row.className = 'folder-row';
      row.innerHTML = `
        <td>
          <div class="file-name-cell open-folder" data-id="${folder.id}" data-name="${folder.name}">
            <div class="file-icon folder">
              ${getFileIconSvg(folder.name, 'folder')}
            </div>
            <div class="file-details">
              <span class="name">${folder.name}</span>
              <span class="date">Owner: ${folder.ownerName || 'Unknown'}</span>
            </div>
          </div>
        </td>
        <td class="mime-cell"><span class="folder-badge">${folder.permission || 'VIEWER'}</span></td>
        <td>--</td>
        <td><span class="empty-text">Shared Directory</span></td>
        <td class="actions-col">
          <div class="action-buttons">
            <button class="btn-action open-folder" data-id="${folder.id}" data-name="${folder.name}" title="Open Folder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </td>
      `;
      filesListContainer.appendChild(row);
    });

    // Render Shared Files
    filteredFiles.forEach(file => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="file-name-cell">
            <div class="file-icon file">
              ${getFileIconSvg(file.filename, file.mimeType || file.mime_type)}
            </div>
            <div class="file-details">
              <span class="name">${file.filename}</span>
              <span class="date">Owner: ${file.ownerName || 'Unknown'} | Uploaded: ${formatDate(file.uploadedAt || file.uploaded_at)}</span>
            </div>
          </div>
        </td>
        <td class="mime-cell"><span class="folder-badge" style="background: var(--color-purple-subtle); color: var(--color-purple-text); border-color: var(--color-purple-border);">${file.permission || 'VIEWER'}</span></td>
        <td>${formatBytes(file.size)}</td>
        <td><span class="empty-text">Shared File</span></td>
        <td class="actions-col">
          <div class="action-buttons">
            <button class="btn-action download" data-id="${file.id}" title="Download Shared File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          </div>
        </td>
      `;
      filesListContainer.appendChild(row);
    });

    return;
  }

  // My Storage View
  let filteredFiles = filesCache;
  let filteredFolders = foldersCache;

  if (query) {
    filteredFiles = filteredFiles.filter(f => (f.filename || '').toLowerCase().includes(query));
    filteredFolders = filteredFolders.filter(f => (f.name || '').toLowerCase().includes(query));
  }

  fileCountBadge.textContent = `${filteredFiles.length} Files, ${filteredFolders.length} Folders`;
  if (statTotalFiles) statTotalFiles.textContent = filesCache.length;

  if (filteredFiles.length === 0 && filteredFolders.length === 0) {
    filesListContainer.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          ${query ? 'No matching files or folders found in this directory.' : 'No files or folders stored in this directory.'}
        </td>
      </tr>
    `;
    if (statUniqueChunks) statUniqueChunks.textContent = '0';
    return;
  }

  // Compute reference counts for all chunks in the system
  let totalLogicalSize = 0;
  const uniqueChunks = new Map();
  const chunkRefCounts = {};

  filesCache.forEach(file => {
    totalLogicalSize += parseInt(file.size, 10) || 0;
    if (file.chunks) {
      file.chunks.forEach(chunk => {
        const hash = chunk.hash || chunk.chunk_hash;
        if (hash) {
          chunkRefCounts[hash] = (chunkRefCounts[hash] || 0) + 1;
          uniqueChunks.set(hash, parseInt(chunk.size, 10) || 0);
        }
      });
    }
  });

  // Calculate space savings
  let totalPhysicalSize = 0;
  uniqueChunks.forEach(size => { totalPhysicalSize += size; });
  
  let percentSaved = 0;
  if (totalLogicalSize > 0) {
    percentSaved = Math.max(0, 100 * (1 - (totalPhysicalSize / totalLogicalSize)));
  }

  const spaceSavedFormatted = `${percentSaved.toFixed(1)}%`;
  if (statSpaceSaved) statSpaceSaved.textContent = spaceSavedFormatted;
  if (metricSpaceSavedDisplay) metricSpaceSavedDisplay.textContent = spaceSavedFormatted;
  if (storageProgressFill) {
    storageProgressFill.style.width = `${Math.min(100, Math.max(10, percentSaved))}%`;
  }

  const uniqueChunkHashes = new Set();
  filesListContainer.innerHTML = '';

  // Render Folders first
  filteredFolders.forEach(folder => {
    const row = document.createElement('tr');
    row.className = 'folder-row';
    row.innerHTML = `
      <td>
        <div class="file-name-cell open-folder" data-id="${folder.id}" data-name="${folder.name}">
          <div class="file-icon folder">
            ${getFileIconSvg(folder.name, 'folder')}
          </div>
          <div class="file-details">
            <span class="name">${folder.name}</span>
            <span class="date">Directory Container</span>
          </div>
        </div>
      </td>
      <td class="mime-cell"><span class="folder-badge">Directory</span></td>
      <td>--</td>
      <td><span class="empty-text">Folder container</span></td>
      <td class="actions-col">
        <div class="action-buttons">
          <button class="btn-action open-folder" data-id="${folder.id}" data-name="${folder.name}" title="Open Folder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <button class="btn-action share-item" data-type="folder" data-id="${folder.id}" data-name="${folder.name}" title="Manage Sharing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </button>
          <button class="btn-action delete-folder" data-id="${folder.id}" title="Delete Folder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.8m-6 0v-1.8m6 0H9" />
            </svg>
          </button>
        </div>
      </td>
    `;
    filesListContainer.appendChild(row);
  });

  // Render Files
  filteredFiles.forEach(file => {
    const row = document.createElement('tr');
    
    // Calculate chunks mapping badges
    let chunkFlowHTML = '<div class="chunk-flow-container">';
    
    if (file.chunks && file.chunks.length > 0) {
      file.chunks.forEach((chunk, index) => {
        const hash = chunk.hash || chunk.chunk_hash;
        if (hash) uniqueChunkHashes.add(hash);
        
        // Check if chunk is reused (deduplicated)
        const isReused = hash && chunkRefCounts[hash] > 1;
        const reusedClass = isReused ? 'reused' : '';
        const reusedLabel = isReused ? ' (Deduplicated)' : '';

        // Node names where this chunk is stored
        const hostNodes = chunk.nodeIds || chunk.node_ids || [chunk.nodeId];
        
        let indicatorsHTML = '';
        hostNodes.forEach(nodeId => {
          if (!nodeId) return;
          const isNodeOnline = nodeStatus[nodeId] === true || nodeStatus[nodeId.toLowerCase()] === true;
          const offlineClass = isNodeOnline ? '' : 'offline';
          indicatorsHTML += `<span class="node-indicator ${nodeId.toLowerCase()} ${offlineClass}"></span>`;
        });

        const tooltipText = `Chunk ${index + 1}: ${hash ? hash.substring(0, 8) : 'unknown'}... | Size: ${formatBytes(chunk.size)}${reusedLabel} | Hosts: ${hostNodes.join(', ')}`;
        
        chunkFlowHTML += `
          <span class="chunk-badge ${reusedClass}" title="${tooltipText}">
            ${indicatorsHTML}
            <span>C${index + 1}</span>
            <div class="chunk-tooltip">${tooltipText}</div>
          </span>
        `;
      });
    } else {
      chunkFlowHTML += '<span class="empty-text">No chunks mapped</span>';
    }
    chunkFlowHTML += '</div>';

    row.innerHTML = `
      <td>
        <div class="file-name-cell">
          <div class="file-icon file">
            ${getFileIconSvg(file.filename, file.mimeType || file.mime_type)}
          </div>
          <div class="file-details">
            <span class="name">${file.filename}</span>
            <span class="date">Uploaded: ${formatDate(file.uploadedAt || file.uploaded_at)}</span>
          </div>
        </div>
      </td>
      <td class="mime-cell">${file.mimeType || file.mime_type || 'application/octet-stream'}</td>
      <td>${formatBytes(file.size)}</td>
      <td>${chunkFlowHTML}</td>
      <td class="actions-col">
        <div class="action-buttons">
          <button class="btn-action share-item" data-type="file" data-id="${file.id}" data-name="${file.filename}" title="Share File">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </button>
          <button class="btn-action inspect-json" data-id="${file.id}" title="Inspect JSON Manifest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </button>
          <button class="btn-action download" data-id="${file.id}" title="Download File">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <button class="btn-action delete" data-id="${file.id}" title="Delete File">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.8m-6 0v-1.8m6 0H9" />
            </svg>
          </button>
        </div>
      </td>
    `;

    filesListContainer.appendChild(row);
  });

  // Update unique chunks counter
  if (statUniqueChunks) statUniqueChunks.textContent = uniqueChunkHashes.size;
}

// Fetch Files & Folders registry & update UI
async function updateFiles() {
  try {
    if (currentViewMode === 'shared-with-me') {
      const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/shared`);
      if (!res.ok) throw new Error('Failed to fetch shared items');
      const sharedData = await res.json();
      filesCache = sharedData.files || [];
      foldersCache = sharedData.folders || [];
      renderFilesTable();
      return;
    }

    // Default: My Storage view
    const folderRes = await CloudVaultAuth.authFetch(`${API_BASE}/api/folders?parentId=${currentFolderId}`);
    foldersCache = folderRes.ok ? await folderRes.json() : [];

    const fileRes = await CloudVaultAuth.authFetch(`${API_BASE}/api/files?folderId=${currentFolderId}`);
    if (!fileRes.ok) throw new Error('Failed to fetch files');
    filesCache = await fileRes.json();
    
    renderFilesTable();

  } catch (err) {
    console.error(err);
    filesListContainer.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state" style="color: var(--color-danger);">Failed to sync with file registry: ${err.message}</td>
      </tr>
    `;
  }
}

// Toggle simulated failure / recover
nodesContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-simulate');
  if (!btn) return;

  const nodeId = btn.dataset.node;
  const action = btn.dataset.action; // 'fail' or 'recover'
  
  btn.disabled = true;
  const endpoint = action === 'fail' ? 'simulate-failure' : 'recover';

  try {
    const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/nodes/${nodeId}/${endpoint}`, {
      method: 'POST'
    });
    const result = await res.json();
    
    if (res.ok) {
      showToast(
        action === 'fail' 
          ? `Simulated failure activated for node ${nodeId.toUpperCase()}`
          : `Restored node ${nodeId.toUpperCase()} back online`, 
        action === 'fail' ? 'info' : 'success'
      );
      await updateNodes();
      await updateFiles();
    } else {
      throw new Error(result.error || 'Server error');
    }
  } catch (err) {
    showToast(`Failed to update state: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

// Click delegation for table operations (Inspect JSON, Download, Delete file, Open folder, Delete folder, Share)
filesListContainer.addEventListener('click', async (e) => {
  // 1. Inspect JSON Manifest
  const inspectBtn = e.target.closest('.inspect-json');
  if (inspectBtn) {
    const fileId = inspectBtn.dataset.id;
    const file = filesCache.find(f => f.id === fileId);
    if (file) {
      document.getElementById('modal-file-id').textContent = `manifest://${file.filename}`;
      document.getElementById('json-renderer').textContent = JSON.stringify(file, null, 2);
      document.getElementById('json-modal').style.display = 'flex';
    }
    return;
  }

  // 2. Open Folder
  const openFolderTarget = e.target.closest('.open-folder');
  if (openFolderTarget) {
    const folderId = openFolderTarget.dataset.id;
    const folderName = openFolderTarget.dataset.name;
    if (folderId && folderName) {
      folderStack.push({ id: folderId, name: folderName });
      currentFolderId = folderId;
      renderBreadcrumbs();
      await updateFiles();
    }
    return;
  }

  // 3. Delete Folder
  const deleteFolderBtn = e.target.closest('.delete-folder');
  if (deleteFolderBtn) {
    const folderId = deleteFolderBtn.dataset.id;
    if (!confirm('Are you sure you want to delete this folder and its contents?')) return;
    
    deleteFolderBtn.disabled = true;
    try {
      const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/folders/${folderId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Folder deleted successfully', 'success');
        await updateFiles();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete folder');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      deleteFolderBtn.disabled = false;
    }
    return;
  }

  // 4. File Downloads
  const downloadBtn = e.target.closest('.download');
  if (downloadBtn) {
    const fileId = downloadBtn.dataset.id;
    const file = filesCache.find(f => f.id === fileId);
    
    // Check if replica nodes are offline
    if (file && Array.isArray(file.chunks) && file.chunks.length > 0) {
      const offlineChunks = [];
      file.chunks.forEach((chunk, index) => {
        if (Array.isArray(chunk.nodeIds) && chunk.nodeIds.length > 0) {
          const hasOnlineReplica = chunk.nodeIds.some(nodeId => {
            const norm = (nodeId || '').toLowerCase();
            return nodeStatus[norm] === true || nodeStatus[nodeId] === true;
          });
          if (!hasOnlineReplica) {
            offlineChunks.push(`Chunk ${index + 1} (on ${chunk.nodeIds.join(', ')})`);
          }
        }
      });

      if (offlineChunks.length > 0) {
        const verb = offlineChunks.length > 1 ? 'are' : 'is';
        showToast(`Cannot download file: ${offlineChunks.join(', ')} ${verb} offline.`, 'error');
        return;
      }
    }

    showToast('Initiating file download...', 'info');
    downloadBtn.disabled = true;
    
    try {
      const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/download/${fileId}`);
      if (!res.ok) {
        let errorMessage = `Server error (${res.status})`;
        try {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = res.headers.get('content-disposition');
      let filename = (file && file.filename) ? file.filename : 'downloaded_file';
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Download completed successfully!', 'success');
    } catch (err) {
      showToast(`Download failed: ${err.message}`, 'error');
    } finally {
      downloadBtn.disabled = false;
    }
    return;
  }

  // 5. Delete File
  const deleteBtn = e.target.closest('.delete');
  if (deleteBtn) {
    const fileId = deleteBtn.dataset.id;
    if (!confirm('Are you sure you want to delete this file from the CloudVault cluster?')) return;
    
    deleteBtn.disabled = true;
    try {
      const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast('File and all its chunk replicas deleted successfully', 'success');
        await updateFiles();
        await updateNodes();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      deleteBtn.disabled = false;
    }
    return;
  }

  // 6. Share Item
  const shareBtn = e.target.closest('.share-item');
  if (shareBtn) {
    const type = shareBtn.dataset.type;
    const id = shareBtn.dataset.id;
    const name = shareBtn.dataset.name;
    openShareModal(type, id, name);
  }
});

// Close JSON Modal Handlers
const jsonModal = document.getElementById('json-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalOverlay = document.getElementById('modal-overlay');

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    jsonModal.style.display = 'none';
  });
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', () => {
    jsonModal.style.display = 'none';
  });
}

// Copy JSON Button
const copyJsonBtn = document.getElementById('btn-copy-json');
if (copyJsonBtn) {
  copyJsonBtn.addEventListener('click', () => {
    const codeContent = document.getElementById('json-renderer').textContent;
    navigator.clipboard.writeText(codeContent)
      .then(() => {
        const originalText = copyJsonBtn.textContent;
        copyJsonBtn.textContent = 'Copied!';
        showToast('JSON copied to clipboard!', 'success');
        setTimeout(() => {
          copyJsonBtn.textContent = originalText;
        }, 2000);
      })
      .catch(() => {
        showToast('Failed to copy to clipboard', 'error');
      });
  });
}

// Drag & drop file upload
function setupUpload() {
  if (!dropZone || !fileInput) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
  });

  dropZone.addEventListener('drop', handleDrop, false);
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFiles);

  const sidebarUploadBtn = document.getElementById('btn-sidebar-upload');
  if (sidebarUploadBtn) {
    sidebarUploadBtn.addEventListener('click', () => fileInput.click());
  }
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

function handleFiles(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadFile(file);
}

function uploadFile(file) {
  uploadFilename.textContent = file.name;
  uploadProgressFill.style.width = '0%';
  uploadPercentage.textContent = '0%';
  uploadProgressFill.style.backgroundColor = 'var(--color-primary)';
  uploadProgressWrapper.style.display = 'block';
  
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append('file', file);
  if (currentFolderId && currentFolderId !== 'root') {
    formData.append('folderId', currentFolderId);
  }
  
  xhr.open('POST', `${API_BASE}/api/upload`, true);
  const token = CloudVaultAuth.getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }
  
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      const percentComplete = Math.round((e.loaded / e.total) * 100);
      uploadProgressFill.style.width = percentComplete + '%';
      uploadPercentage.textContent = percentComplete + '%';
    }
  };
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const metadata = JSON.parse(xhr.responseText);
        const reusedCount = metadata.reusedChunksCount || 0;
        const totalChunks = metadata.chunks ? metadata.chunks.length : 0;
        
        if (totalChunks > 0 && reusedCount === totalChunks) {
          showToast(`Duplicate content! All ${totalChunks} chunks deduplicated (100% space saved).`, 'success');
        } else if (reusedCount > 0) {
          showToast(`File uploaded! Reused ${reusedCount} of ${totalChunks} chunks via deduplication.`, 'success');
        } else {
          showToast('File uploaded, chunked, and replicated across nodes!', 'success');
        }
      } catch (e) {
        showToast('File uploaded successfully!', 'success');
      }
      setTimeout(() => {
        uploadProgressWrapper.style.display = 'none';
      }, 2500);
      
      updateFiles();
      updateNodes();
    } else {
      let errorMsg = 'Upload failed';
      try {
        const responseObj = JSON.parse(xhr.responseText);
        errorMsg = responseObj.error || errorMsg;
      } catch (err) {}
      
      showToast(`Upload Failed: ${errorMsg}`, 'error');
      uploadProgressFill.style.backgroundColor = 'var(--color-danger)';
    }
  };
  
  xhr.onerror = function() {
    showToast('Network error during upload', 'error');
    uploadProgressFill.style.backgroundColor = 'var(--color-danger)';
  };
  
  xhr.send(formData);
}

// Handle Folder Operations & Breadcrumbs
function renderBreadcrumbs() {
  const container = document.getElementById('breadcrumb-container');
  if (!container) return;
  container.innerHTML = '';

  folderStack.forEach((item, index) => {
    const span = document.createElement('span');
    const isLast = index === folderStack.length - 1;
    span.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
    span.dataset.folderId = item.id;
    span.dataset.index = index;
    span.textContent = item.name;

    span.addEventListener('click', () => {
      if (isLast) return;
      folderStack = folderStack.slice(0, index + 1);
      currentFolderId = item.id;
      renderBreadcrumbs();
      updateFiles();
    });

    container.appendChild(span);

    if (!isLast) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = '/';
      container.appendChild(sep);
    }
  });
}

// Share Modal Management State & Handlers
let activeShareItem = null; // { type: 'file'|'folder', id, name }

function setupShareModal() {
  const modal = document.getElementById('share-modal');
  const overlay = document.getElementById('share-modal-overlay');
  const closeBtn = document.getElementById('close-share-modal');
  const shareBtn = document.getElementById('btn-do-share');

  const closeModal = () => { if (modal) modal.style.display = 'none'; };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (!activeShareItem) return;
      const email = document.getElementById('share-email-input').value;
      const permission = document.getElementById('share-perm-select').value;
      if (!email || !email.trim()) return showToast('Please enter recipient email address', 'error');

      const endpoint = activeShareItem.type === 'file' 
        ? `${API_BASE}/api/files/${activeShareItem.id}/share`
        : `${API_BASE}/api/folders/${activeShareItem.id}/share`;

      try {
        const res = await CloudVaultAuth.authFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), permission })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to share');
        showToast(data.message || 'Shared successfully', 'success');
        document.getElementById('share-email-input').value = '';
        await refreshShareList();
      } catch (err) {
        showToast(`Share Error: ${err.message}`, 'error');
      }
    });
  }
}

async function openShareModal(type, id, name) {
  activeShareItem = { type, id, name };
  document.getElementById('share-modal-title').textContent = `Share: ${name}`;
  document.getElementById('share-email-input').value = '';
  document.getElementById('share-modal').style.display = 'flex';
  await refreshShareList();
}

async function refreshShareList() {
  if (!activeShareItem) return;
  const container = document.getElementById('shares-list-container');
  container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 0.5rem;">Loading shares...</div>';

  const endpoint = activeShareItem.type === 'file'
    ? `${API_BASE}/api/files/${activeShareItem.id}/shares`
    : `${API_BASE}/api/folders/${activeShareItem.id}/shares`;

  try {
    const res = await CloudVaultAuth.authFetch(endpoint);
    if (!res.ok) throw new Error('Failed to load shares');
    const shares = await res.json();

    if (shares.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 0.5rem;">Not shared with anyone yet.</div>';
      return;
    }

    container.innerHTML = '';
    shares.forEach(s => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;';
      item.innerHTML = `
        <div>
          <span style="color: var(--text-main); font-weight: 600;">${s.userName || s.userEmail}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.35rem;">(${s.userEmail})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="background: var(--color-purple-subtle); color: var(--color-purple-text); border: 1px solid var(--color-purple-border); font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600;">${s.permission}</span>
          <button class="revoke-share-btn" data-userid="${s.sharedWithUserId}" style="background: none; border: none; color: var(--color-danger); cursor: pointer; padding: 0.2rem; font-size: 1.1rem; line-height: 1;" title="Revoke Share">&times;</button>
        </div>
      `;

      item.querySelector('.revoke-share-btn').addEventListener('click', async () => {
        const uId = s.sharedWithUserId;
        const unshareEndpoint = activeShareItem.type === 'file'
          ? `${API_BASE}/api/files/${activeShareItem.id}/share/${uId}`
          : `${API_BASE}/api/folders/${activeShareItem.id}/share/${uId}`;
        try {
          const uRes = await CloudVaultAuth.authFetch(unshareEndpoint, { method: 'DELETE' });
          if (uRes.ok) {
            showToast('Share revoked', 'info');
            await refreshShareList();
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        }
      });

      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color: var(--color-danger); font-size: 0.78rem; padding: 0.5rem;">${err.message}</div>`;
  }
}

// New Folder Creation
function setupFolderButton() {
  const btn = document.getElementById('btn-new-folder');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;

    try {
      const res = await CloudVaultAuth.authFetch(`${API_BASE}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parentId: currentFolderId === 'root' ? null : currentFolderId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');
      showToast(`Folder "${data.name}" created`, 'success');
      await updateFiles();
    } catch (err) {
      showToast(`Folder error: ${err.message}`, 'error');
    }
  });
}

// Setup View Mode Tabs (My Storage vs Shared with Me) and Sidebar Links
function setupViewModeTabs() {
  const tabMyStorage = document.getElementById('tab-my-storage');
  const tabShared = document.getElementById('tab-shared-with-me');
  const navMyFiles = document.getElementById('nav-my-files');
  const navShared = document.getElementById('nav-shared-files');
  const navNodes = document.getElementById('nav-cluster-nodes');
  const btnNewFolder = document.getElementById('btn-new-folder');

  function switchToMyStorage() {
    if (currentViewMode === 'my-storage') return;
    currentViewMode = 'my-storage';

    if (tabMyStorage) tabMyStorage.classList.add('active');
    if (tabShared) tabShared.classList.remove('active');
    if (navMyFiles) navMyFiles.classList.add('active');
    if (navShared) navShared.classList.remove('active');
    if (navNodes) navNodes.classList.remove('active');

    if (btnNewFolder) btnNewFolder.style.display = 'inline-flex';
    currentFolderId = 'root';
    folderStack = [{ id: 'root', name: 'Root Storage' }];
    renderBreadcrumbs();
    updateFiles();
  }

  function switchToShared() {
    if (currentViewMode === 'shared-with-me') return;
    currentViewMode = 'shared-with-me';

    if (tabShared) tabShared.classList.add('active');
    if (tabMyStorage) tabMyStorage.classList.remove('active');
    if (navShared) navShared.classList.add('active');
    if (navMyFiles) navMyFiles.classList.remove('active');
    if (navNodes) navNodes.classList.remove('active');

    if (btnNewFolder) btnNewFolder.style.display = 'none';
    currentFolderId = 'root';
    folderStack = [{ id: 'root', name: 'Shared Storage' }];
    renderBreadcrumbs();
    updateFiles();
  }

  if (tabMyStorage) tabMyStorage.addEventListener('click', switchToMyStorage);
  if (navMyFiles) navMyFiles.addEventListener('click', switchToMyStorage);

  if (tabShared) tabShared.addEventListener('click', switchToShared);
  if (navShared) navShared.addEventListener('click', switchToShared);

  if (navNodes) {
    navNodes.addEventListener('click', () => {
      const section = document.getElementById('cluster-nodes-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// Live Search Filter Handler
function setupSearchFilter() {
  const searchInput = document.getElementById('file-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderFilesTable();
  });
}

// Mobile Menu Toggle
function setupMobileMenu() {
  const toggleBtn = document.getElementById('btn-mobile-menu');
  const sidebar = document.getElementById('app-sidebar');
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-open');
  });

  // Close sidebar on click outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('sidebar-open') && 
        !sidebar.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('sidebar-open');
    }
  });
}

// Initial Sync & start intervals
async function init() {
  if (!CloudVaultAuth.requireAuth()) return;

  // Setup user info chip
  const user = CloudVaultAuth.getUser();
  if (user) {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.name || user.email;
    if (avatarEl) avatarEl.textContent = (user.name || user.email).charAt(0).toUpperCase();
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => CloudVaultAuth.logout());
  }

  setupUpload();
  setupFolderButton();
  setupShareModal();
  setupViewModeTabs();
  setupSearchFilter();
  setupMobileMenu();
  renderBreadcrumbs();
  
  // Initial loading state sync
  await updateNodes();
  await updateFiles();
  
  // Polling for cluster state & files
  setInterval(async () => {
    await updateNodes();
    await updateFiles();
  }, 3000);
}

window.addEventListener('DOMContentLoaded', init);
