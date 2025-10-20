// popup.js - Compact version of options.js for popup interface
import { getAllTags, createTag, deleteTag, getContexts, addContext, getAllFolders, addFolderWatch, removeFolderWatch } from "./storage.js";

const els = {
  name: document.getElementById("tag-name"),
  create: document.getElementById("create"),
  list: document.getElementById("list"),
  refresh: document.getElementById("refresh"),
  pdfFile: document.getElementById("pdf-file"),
  pdfTagSelect: document.getElementById("pdf-tag-select"),
  uploadPdf: document.getElementById("upload-pdf"),
  uploadStatus: document.getElementById("upload-status"),
  folderTagSelect: document.getElementById("folder-tag-select"),
  addFolderWatch: document.getElementById("add-folder-watch"),
  folderStatus: document.getElementById("folder-status"),
  foldersList: document.getElementById("folders-list"),
  scanNow: document.getElementById("scan-now"),
};

els.create.onclick = onCreate;
els.refresh.onclick = render;
els.pdfFile.onchange = onPdfFileChange;
els.pdfTagSelect.onchange = onPdfTagChange;
els.uploadPdf.onclick = onUploadPdf;
els.folderTagSelect.onchange = onFolderTagChange;
els.addFolderWatch.onclick = onAddFolderWatch;
els.scanNow.onclick = onScanNow;

// Load PDF extractor
const pdfScript = document.createElement('script');
pdfScript.src = 'pdf-extractor.js';
document.head.appendChild(pdfScript);

// Load folder watcher
const folderScript = document.createElement('script');
folderScript.src = 'folder-watcher.js';
document.head.appendChild(folderScript);

render();

async function onCreate() {
  const raw = (els.name.value || "").trim();
  if (!raw) return;
  const made = await createTag(raw.replace(/^@+/, ""));
  if (!made) {
    alert("A tag with that name already exists.");
  } else {
    els.name.value = "";
  }
  render();
}

async function render() {
  const tags = await getAllTags();
  
  // Update tag selectors
  updatePdfTagSelector(tags);
  updateFolderTagSelector(tags);
  
  // Render watched folders
  await renderWatchedFolders();
  
  if (!tags.length) {
    els.list.innerHTML = `<p class="muted">No tags yet. Create one above.</p>`;
    return;
  }

  const parts = [];
  for (const t of tags) {
    const ctx = await getContexts(t.id);
    parts.push(`
      <div class="tag-item">
        <div class="tag-header">
          <div>
            <span class="tag-name">@${t.name}</span>
            <span class="tag-count">${ctx.length} context${ctx.length !== 1 ? 's' : ''}</span>
          </div>
          <button data-del="${t.id}" class="btn btn-small">Delete</button>
        </div>
        ${ctx.slice(0, 2).map(c => `
          <div class="context-item">
            ${c.title ? `<div class="context-title">${c.title.substring(0, 40) + (c.title.length > 40 ? '...' : '')}</div>` : ''}
            <div>
              ${c.type === 'image' ? 
                `<strong>Image:</strong> ${(c.imageUrl || 'Uploaded image').substring(0, 30)}...` :
                escapeHtml((c.text || c.selection || '').substring(0, 120) + (c.text && c.text.length > 120 ? '...' : ''))
              }
            </div>
          </div>
        `).join("")}
        ${ctx.length > 2 ? `<div class="status-text" style="text-align: center; margin-top: auto; padding-top: 8px;">+${ctx.length - 2} more</div>` : ''}
      </div>
    `);
  }

  els.list.innerHTML = parts.join("");

  // Hook up deletes
  els.list.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this tag and all its contexts?")) {
        await deleteTag(btn.dataset.del);
        render();
      }
    };
  });
}

// Update PDF tag selector dropdown
function updatePdfTagSelector(tags) {
  const options = ['<option value="">Select tag...</option>'];
  tags.forEach(tag => {
    options.push(`<option value="${tag.id}">@${tag.name}</option>`);
  });
  els.pdfTagSelect.innerHTML = options.join('');
}

// Handle PDF file selection
function onPdfFileChange() {
  updateUploadButton();
  
  const file = els.pdfFile.files[0];
  if (file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    els.uploadStatus.textContent = `${file.name} (${sizeInMB}MB)`;
  } else {
    els.uploadStatus.textContent = '';
  }
}

// Handle tag selection change
function onPdfTagChange() {
  updateUploadButton();
}

// Update upload button state
function updateUploadButton() {
  const hasFile = els.pdfFile.files.length > 0;
  const hasTag = els.pdfTagSelect.value !== '';
  els.uploadPdf.disabled = !(hasFile && hasTag);
}

// Handle PDF upload and extraction
async function onUploadPdf() {
  const file = els.pdfFile.files[0];
  const tagId = els.pdfTagSelect.value;
  
  if (!file || !tagId) {
    els.uploadStatus.textContent = 'Select PDF and tag.';
    return;
  }
  
  try {
    els.uploadPdf.disabled = true;
    els.uploadStatus.textContent = 'Extracting...';
    
    // Wait for PDF extractor to be available
    let attempts = 0;
    while (!window.PDFExtractor && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.PDFExtractor) {
      throw new Error('PDF extractor not loaded. Please refresh and try again.');
    }
    
    // Extract text from PDF
    const extractedText = await window.PDFExtractor.extractText(file);
    
    if (!extractedText.trim()) {
      throw new Error('No text found in PDF.');
    }
    
    els.uploadStatus.textContent = 'Saving...';
    
    // Save to tag as text context
    await addContext(tagId, {
      type: 'text',
      text: extractedText,
      title: `PDF: ${file.name}`,
      url: `file://${file.name}`,
      source: 'pdf-upload'
    });
    
    els.uploadStatus.textContent = `✓ Saved ${(extractedText.length/1000).toFixed(1)}k chars`;
    
    // Clear form
    els.pdfFile.value = '';
    els.pdfTagSelect.value = '';
    updateUploadButton();
    
    // Refresh the display
    render();
    
    // Clear status after delay
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 2000);
    
  } catch (error) {
    console.error('PDF upload failed:', error);
    els.uploadStatus.textContent = `❌ ${error.message}`;
    
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 3000);
  } finally {
    els.uploadPdf.disabled = false;
    updateUploadButton();
  }
}

// Update folder tag selector dropdown
function updateFolderTagSelector(tags) {
  const options = ['<option value="">Select tag...</option>'];
  tags.forEach(tag => {
    options.push(`<option value="${tag.id}">@${tag.name}</option>`);
  });
  els.folderTagSelect.innerHTML = options.join('');
  updateFolderWatchButton();
}

// Handle folder tag selection change
function onFolderTagChange() {
  updateFolderWatchButton();
}

// Update folder watch button state
function updateFolderWatchButton() {
  const hasTag = els.folderTagSelect.value !== '';
  els.addFolderWatch.disabled = !hasTag;
}

// Handle adding a folder watch
async function onAddFolderWatch() {
  const tagId = els.folderTagSelect.value;
  
  if (!tagId) {
    els.folderStatus.textContent = 'Select a tag first.';
    return;
  }
  
  try {
    els.addFolderWatch.disabled = true;
    els.folderStatus.textContent = 'Opening picker...';
    
    // Wait for folder watcher to be available
    let attempts = 0;
    while (!window.FolderWatcher && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.FolderWatcher) {
      throw new Error('Folder watcher not loaded. Please refresh and try again.');
    }
    
    // Initialize folder watcher
    const initialized = await window.FolderWatcher.initialize();
    if (!initialized) {
      throw new Error('Folder watching not supported. Use Chrome or Edge.');
    }
    
    // Request folder access
    const directoryHandle = await window.FolderWatcher.requestFolderAccess();
    
    if (!directoryHandle) {
      els.folderStatus.textContent = 'Cancelled.';
      return;
    }
    
    els.folderStatus.textContent = 'Setting up...';
    
    // Add folder watch
    const folderConfig = await window.FolderWatcher.addFolderWatch(
      directoryHandle, 
      tagId, 
      directoryHandle.name
    );
    
    els.folderStatus.textContent = `✓ Watching "${folderConfig.name}"`;
    
    // Clear form
    els.folderTagSelect.value = '';
    updateFolderWatchButton();
    
    // Refresh the display
    await renderWatchedFolders();
    
    // Clear status after delay
    setTimeout(() => {
      els.folderStatus.textContent = '';
    }, 2000);
    
  } catch (error) {
    console.error('Folder watch setup failed:', error);
    els.folderStatus.textContent = `❌ ${error.message}`;
    
    setTimeout(() => {
      els.folderStatus.textContent = '';
    }, 3000);
  } finally {
    els.addFolderWatch.disabled = false;
    updateFolderWatchButton();
  }
}

// Render watched folders list
async function renderWatchedFolders() {
  try {
    const folders = await getAllFolders();
    const tags = await getAllTags();
    const tagMap = new Map(tags.map(t => [t.id, t.name]));
    
    if (Object.keys(folders).length === 0) {
      els.foldersList.innerHTML = '<p class="muted">No folders watched.</p>';
      return;
    }
    
    const parts = [];
    for (const [folderId, folder] of Object.entries(folders)) {
      const tagName = tagMap.get(folder.tagId) || 'Unknown';
      parts.push(`
        <div class="folder-item">
          <div class="folder-info">
            <span class="folder-name">${folder.name}</span>
            <span class="folder-tag">@${tagName}</span>
          </div>
          <button data-remove-folder="${folderId}" class="btn btn-small">Remove</button>
        </div>
      `);
    }
    
    els.foldersList.innerHTML = parts.join('');
    
    // Hook up remove buttons
    els.foldersList.querySelectorAll('button[data-remove-folder]').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Stop watching this folder?')) {
          const folderId = btn.dataset.removeFolder;
          
          try {
            // Remove from folder watcher if available
            if (window.FolderWatcher) {
              await window.FolderWatcher.removeFolderWatch(folderId);
            } else {
              // Fallback to storage-only removal
              await removeFolderWatch(folderId);
            }
            
            await renderWatchedFolders();
          } catch (error) {
            console.error('Error removing folder watch:', error);
            alert('Error removing folder watch: ' + error.message);
          }
        }
      };
    });
    
  } catch (error) {
    console.error('Error rendering watched folders:', error);
    els.foldersList.innerHTML = '<p class="muted">Error loading folders.</p>';
  }
}

// Handle manual scan now button
async function onScanNow() {
  try {
    els.scanNow.disabled = true;
    els.scanNow.textContent = 'Scanning...';
    
    // Wait for folder watcher to be available
    let attempts = 0;
    while (!window.FolderWatcher && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.FolderWatcher) {
      throw new Error('Folder watcher not loaded. Please refresh and try again.');
    }
    
    // Trigger immediate scan of all folders
    await window.FolderWatcher.scanAllFoldersNow();
    
    els.scanNow.textContent = '✓ Done';
    
    // Refresh the display to show any new contexts
    render();
    
    // Reset button after delay
    setTimeout(() => {
      els.scanNow.textContent = 'Scan Now';
    }, 1500);
    
  } catch (error) {
    console.error('Manual scan failed:', error);
    els.scanNow.textContent = '❌ Error';
    
    setTimeout(() => {
      els.scanNow.textContent = 'Scan Now';
    }, 2000);
  } finally {
    els.scanNow.disabled = false;
  }
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, ch =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[ch])
  );
}
