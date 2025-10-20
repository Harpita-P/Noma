// popup.js - Compact version of options.js for popup interface
import { getAllTags, createTag, deleteTag, getContexts, addContext, updateContext, getAllFolders, addFolderWatch, removeFolderWatch } from "./storage.js";

const els = {
  openaiKey: document.getElementById("openai-key"),
  saveOpenaiKey: document.getElementById("save-openai-key"),
  openaiKeyStatus: document.getElementById("openai-key-status"),
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
  // Calendar elements
  calendarClientId: document.getElementById("calendar-client-id"),
  calendarApiKey: document.getElementById("calendar-api-key"),
  calendarSaveSettings: document.getElementById("calendar-save-settings"),
  calendarSignin: document.getElementById("calendar-signin"),
  calendarSignout: document.getElementById("calendar-signout"),
  calendarAuthStatus: document.getElementById("calendar-auth-status"),
  calendarTagCreation: document.getElementById("calendar-tag-creation"),
  calendarTagName: document.getElementById("calendar-tag-name"),
  calendarTagType: document.getElementById("calendar-tag-type"),
  createCalendarTag: document.getElementById("create-calendar-tag"),
  calendarTagsSection: document.getElementById("calendar-tags-section"),
  calendarTagsList: document.getElementById("calendar-tags-list"),
  calendarSyncAll: document.getElementById("calendar-sync-all"),
};

els.saveOpenaiKey.onclick = onSaveOpenAIKey;
els.create.onclick = onCreate;
els.refresh.onclick = render;
els.pdfFile.onchange = onPdfFileChange;
els.pdfTagSelect.onchange = onPdfTagChange;
els.uploadPdf.onclick = onUploadPdf;
els.folderTagSelect.onchange = onFolderTagChange;
els.addFolderWatch.onclick = onAddFolderWatch;
els.scanNow.onclick = onScanNow;
// Calendar event handlers
els.calendarSaveSettings.onclick = onCalendarSaveSettings;
els.calendarSignin.onclick = onCalendarSignin;
els.calendarSignout.onclick = onCalendarSignout;
els.createCalendarTag.onclick = onCreateCalendarTag;
els.calendarSyncAll.onclick = onCalendarSyncAll;

// Load PDF extractor
const pdfScript = document.createElement('script');
pdfScript.src = 'pdf-extractor.js';
document.head.appendChild(pdfScript);

// Load folder watcher
const folderScript = document.createElement('script');
folderScript.src = 'folder-watcher.js';
document.head.appendChild(folderScript);

// Load calendar services (Manifest V3 compatible)
const calendarServiceScript = document.createElement('script');
calendarServiceScript.src = 'calendar-service-v3.js';
document.head.appendChild(calendarServiceScript);

const calendarSyncScript = document.createElement('script');
calendarSyncScript.src = 'calendar-sync.js';
document.head.appendChild(calendarSyncScript);

// Load RAG system
const ragScript = document.createElement('script');
ragScript.src = 'rag-system.js';
document.head.appendChild(ragScript);

// Global RAG system instance
let ragSystem = null;

// Initialize RAG system
async function initializeRAG() {
  try {
    // Wait for RAG system to load
    let attempts = 0;
    while (!window.RAGSystem && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.RAGSystem) {
      console.warn('Taggle RAG: RAG system not loaded');
      return null;
    }
    
    ragSystem = new window.RAGSystem();
    await ragSystem.initialize();
    console.log('Taggle RAG: System initialized successfully');
    return ragSystem;
  } catch (error) {
    console.error('Taggle RAG: Initialization failed:', error);
    return null;
  }
}

render();

// Check and display API key status on load
async function checkApiKeyStatus() {
  try {
    const result = await chrome.storage.local.get(['taggle-openai-key']);
    const hasKey = !!result['taggle-openai-key'];
    
    if (hasKey) {
      els.openaiKeyStatus.textContent = '✓ API key configured (RAG enabled for large contexts)';
      els.openaiKeyStatus.style.color = '#28a745';
    } else {
      els.openaiKeyStatus.textContent = 'Required for semantic search on large contexts (25k+ chars)';
      els.openaiKeyStatus.style.color = '#6c757d';
    }
  } catch (error) {
    console.error('Failed to check API key status:', error);
  }
}

// Check API key status on popup load
checkApiKeyStatus();

async function onSaveOpenAIKey() {
  const apiKey = els.openaiKey.value.trim();
  
  if (!apiKey) {
    els.openaiKeyStatus.textContent = 'Please enter an API key';
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    els.openaiKeyStatus.textContent = 'API key should start with "sk-"';
    return;
  }
  
  try {
    els.saveOpenaiKey.disabled = true;
    els.openaiKeyStatus.textContent = 'Saving...';
    
    // Save to storage
    await chrome.storage.local.set({ 'taggle-openai-key': apiKey });
    
    // Update RAG system if initialized
    if (ragSystem) {
      await ragSystem.setOpenAIKey(apiKey);
    }
    
    els.openaiKeyStatus.textContent = '✓ API key saved successfully';
    els.openaiKey.value = ''; // Clear the input for security
    
    // Update status to show configured state
    setTimeout(() => {
      checkApiKeyStatus();
    }, 2000);
    
  } catch (error) {
    console.error('Failed to save OpenAI API key:', error);
    els.openaiKeyStatus.textContent = '❌ Failed to save API key';
    
    setTimeout(() => {
      els.openaiKeyStatus.textContent = 'Required for semantic search on large contexts (25k+ chars)';
    }, 3000);
  } finally {
    els.saveOpenaiKey.disabled = false;
  }
}

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
  
  // Render calendar components
  try {
    await renderCalendarComponents();
  } catch (error) {
    console.warn('Could not render calendar components:', error);
  }
  
  if (!tags.length) {
    els.list.innerHTML = `<p class="muted">No tags yet. Create one above.</p>`;
    return;
  }

  const parts = [];
  for (const t of tags) {
    const ctx = await getContexts(t.id);
    
    // Check if any context is large enough for RAG processing
    const largeContexts = ctx.filter(c => {
      const textLength = (c.text || c.selection || '').length;
      return textLength > 25000;
    });
    
    // Auto-process large contexts through RAG if not already processed
    if (largeContexts.length > 0) {
      await processLargeContextsForTag(t.id, t.name, largeContexts);
    }
    
    // Calculate total text length for display
    const totalTextLength = ctx.reduce((sum, c) => {
      return sum + (c.text || c.selection || '').length;
    }, 0);
    
    const ragIndicator = largeContexts.length > 0 ? 
      `<span style="color: #10b981; font-size: 10px; margin-left: 4px;" title="RAG-enabled for large content">🧠</span>` : '';
    
    parts.push(`
      <div class="tag-item">
        <div class="tag-header">
          <div>
            <span class="tag-name">@${t.name}</span>
            <span class="tag-count">${ctx.length} context${ctx.length !== 1 ? 's' : ''}</span>
            ${ragIndicator}
            ${totalTextLength > 25000 ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${Math.round(totalTextLength/1000)}k chars</div>` : ''}
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

// Process large contexts through RAG pipeline
async function processLargeContextsForTag(tagId, tagName, largeContexts) {
  try {
    // Initialize RAG system if not already done
    if (!ragSystem) {
      ragSystem = await initializeRAG();
      if (!ragSystem) {
        console.warn('Taggle RAG: Cannot process large contexts - RAG system not available');
        return;
      }
    }
    
    for (const context of largeContexts) {
      // Check if this context is already processed (has RAG metadata)
      if (context.ragProcessed) {
        continue;
      }
      
      const textContent = context.text || context.selection || '';
      if (textContent.length <= 25000) {
        continue;
      }
      
      console.log(`Taggle RAG: Processing large context for @${tagName} (${textContent.length} chars)`);
      
      try {
        // Generate full text embedding
        const fullTextEmbedding = await ragSystem.generateFullTextEmbedding(textContent);
        
        // Create chunks
        const contextId = `tag_${tagId}_context_${context.id || Date.now()}`;
        const chunks = await ragSystem.chunkText(textContent, contextId);
        
        // Store chunks with shared embedding
        const embeddings = new Array(chunks.length).fill(fullTextEmbedding);
        await ragSystem.storeChunksWithEmbeddings(chunks, embeddings, tagId);
        
        // Mark context as RAG processed and update in storage
        const updates = {
          ragProcessed: true,
          ragChunks: chunks.length,
          ragEmbeddingDimensions: fullTextEmbedding.length
        };
        
        await updateContext(tagId, context.id, updates);
        
        console.log(`Taggle RAG: Successfully processed context - ${chunks.length} chunks created`);
        
      } catch (error) {
        console.error(`Taggle RAG: Failed to process context for @${tagName}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Taggle RAG: Error in processLargeContextsForTag:', error);
  }
}

// Search RAG system for relevant chunks
async function searchRAGForTag(tagId, query, topK = 3) {
  try {
    if (!ragSystem) {
      ragSystem = await initializeRAG();
      if (!ragSystem) {
        return [];
      }
    }
    
    const results = await ragSystem.searchChunks(query, tagId, topK);
    return results.map(result => ({
      text: result.chunk.text,
      similarity: result.score,
      chunkIndex: result.chunk.chunkIndex,
      contextId: result.chunk.contextId
    }));
    
  } catch (error) {
    console.error('Taggle RAG: Search failed:', error);
    return [];
  }
}

// ===== CALENDAR FUNCTIONS =====

// Calendar settings management
async function onCalendarSaveSettings() {
  try {
    const clientId = els.calendarClientId.value.trim();
    const apiKey = els.calendarApiKey.value.trim();
    
    if (!clientId) {
      alert('Please enter a Google Client ID');
      return;
    }
    
    const settings = { clientId };
    if (apiKey) settings.apiKey = apiKey;
    
    await chrome.storage.local.set({ 'taggle-calendar-settings': settings });
    
    // Initialize calendar service
    await waitForCalendarService();
    await CalendarService.initialize(clientId, apiKey);
    
    els.calendarSignin.disabled = false;
    els.calendarAuthStatus.textContent = 'Settings saved. You can now sign in.';
    
    console.log('Taggle: Calendar settings saved');
    
  } catch (error) {
    console.error('Error saving calendar settings:', error);
    els.calendarAuthStatus.textContent = 'Error saving settings: ' + error.message;
  }
}

async function onCalendarSignin() {
  try {
    await waitForCalendarService();
    
    const success = await CalendarService.signIn();
    if (success) {
      els.calendarAuthStatus.textContent = 'Successfully signed in to Google Calendar!';
      els.calendarSignin.style.display = 'none';
      els.calendarSignout.style.display = 'inline-flex';
      els.calendarTagCreation.style.display = 'block';
      els.calendarSyncAll.style.display = 'inline-flex';
      
      await renderCalendarComponents();
    }
  } catch (error) {
    console.error('Calendar sign-in failed:', error);
    els.calendarAuthStatus.textContent = 'Sign-in failed: ' + error.message;
  }
}

async function onCalendarSignout() {
  try {
    await waitForCalendarService();
    await CalendarService.signOut();
    
    els.calendarAuthStatus.textContent = 'Signed out from Google Calendar.';
    els.calendarSignin.style.display = 'inline-flex';
    els.calendarSignout.style.display = 'none';
    els.calendarTagCreation.style.display = 'none';
    els.calendarSyncAll.style.display = 'none';
    
    await renderCalendarComponents();
  } catch (error) {
    console.error('Calendar sign-out failed:', error);
    els.calendarAuthStatus.textContent = 'Sign-out failed: ' + error.message;
  }
}

async function onCreateCalendarTag() {
  try {
    const tagName = els.calendarTagName.value.trim();
    const tagType = els.calendarTagType.value;
    
    if (!tagName) {
      alert('Please enter a tag name');
      return;
    }
    
    await waitForCalendarSync();
    await CalendarSync.createCalendarTag(tagName, tagType);
    
    els.calendarTagName.value = '';
    els.calendarAuthStatus.textContent = `Calendar tag @${tagName} created successfully!`;
    
    await renderCalendarComponents();
    await render(); // Refresh main tags list
    
  } catch (error) {
    console.error('Error creating calendar tag:', error);
    els.calendarAuthStatus.textContent = 'Error creating calendar tag: ' + error.message;
  }
}

async function onCalendarSyncAll() {
  try {
    els.calendarSyncAll.textContent = 'Syncing...';
    els.calendarSyncAll.disabled = true;
    
    await waitForCalendarSync();
    await CalendarSync.syncAllCalendarTags();
    
    els.calendarAuthStatus.textContent = 'All calendar tags synced successfully!';
    await renderCalendarComponents();
    await render(); // Refresh main tags list
    
  } catch (error) {
    console.error('Error syncing calendar tags:', error);
    els.calendarAuthStatus.textContent = 'Sync failed: ' + error.message;
  } finally {
    els.calendarSyncAll.textContent = 'Sync All';
    els.calendarSyncAll.disabled = false;
  }
}

// Render calendar components
async function renderCalendarComponents() {
  try {
    // Load calendar settings
    const { 'taggle-calendar-settings': settings = {} } = 
      await chrome.storage.local.get('taggle-calendar-settings');
    
    els.calendarClientId.value = settings.clientId || '';
    els.calendarApiKey.value = settings.apiKey || '';
    
    // Check if signed in
    await waitForCalendarService();
    const isSignedIn = CalendarService.isSignedIn();
    
    if (isSignedIn) {
      els.calendarAuthStatus.textContent = 'Signed in to Google Calendar';
      els.calendarSignin.style.display = 'none';
      els.calendarSignout.style.display = 'inline-flex';
      els.calendarTagCreation.style.display = 'block';
      els.calendarSyncAll.style.display = 'inline-flex';
    } else {
      els.calendarAuthStatus.textContent = settings.clientId ? 'Ready to sign in' : 'Enter credentials to get started';
      els.calendarSignin.style.display = 'inline-flex';
      els.calendarSignin.disabled = !settings.clientId;
      els.calendarSignout.style.display = 'none';
      els.calendarTagCreation.style.display = 'none';
      els.calendarSyncAll.style.display = 'none';
    }
    
    // Render calendar tags
    await waitForCalendarSync();
    const calendarTags = await CalendarSync.getCalendarTags();
    
    if (Object.keys(calendarTags).length > 0) {
      els.calendarTagsSection.style.display = 'block';
      
      const tagItems = Object.entries(calendarTags).map(([tagId, tag]) => {
        const lastSynced = tag.lastSynced ? new Date(tag.lastSynced).toLocaleString() : 'Never';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px;">
            <div>
              <strong>@${tag.tagName}</strong>
              <div style="font-size: 11px; color: #64748b;">
                ${tag.type === 'today' ? "Today's Meetings" : 'Next 30 Days'} • Last synced: ${lastSynced}
              </div>
            </div>
            <div>
              <button data-sync-calendar="${tagId}" class="sync-calendar-btn" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">Sync</button>
              <button data-delete-calendar="${tagId}" class="delete-calendar-btn" style="font-size: 12px; padding: 4px 8px;">Delete</button>
            </div>
          </div>
        `;
      }).join('');
      
      els.calendarTagsList.innerHTML = tagItems;
      
      // Add event listeners for calendar tag buttons
      els.calendarTagsList.querySelectorAll('.sync-calendar-btn').forEach(btn => {
        btn.onclick = async () => {
          const tagId = btn.dataset.syncCalendar;
          try {
            await waitForCalendarSync();
            await CalendarSync.syncCalendarTag(tagId);
            await renderCalendarComponents();
            await render();
            els.calendarAuthStatus.textContent = 'Calendar tag synced successfully!';
          } catch (error) {
            console.error("Error syncing calendar tag:", error);
            els.calendarAuthStatus.textContent = 'Sync failed: ' + error.message;
          }
        };
      });
      
      els.calendarTagsList.querySelectorAll('.delete-calendar-btn').forEach(btn => {
        btn.onclick = async () => {
          const tagId = btn.dataset.deleteCalendar;
          if (!confirm("Delete this calendar tag? This will also delete the regular tag and all its contexts.")) {
            return;
          }
          
          try {
            await waitForCalendarSync();
            await CalendarSync.deleteCalendarTag(tagId);
            await deleteTag(tagId);
            await renderCalendarComponents();
            await render();
            els.calendarAuthStatus.textContent = 'Calendar tag deleted successfully!';
          } catch (error) {
            console.error("Error deleting calendar tag:", error);
            els.calendarAuthStatus.textContent = 'Delete failed: ' + error.message;
          }
        };
      });
    } else {
      els.calendarTagsSection.style.display = 'none';
    }
    
  } catch (error) {
    console.error("Error rendering calendar components:", error);
    els.calendarTagsList.innerHTML = '<p style="color: #ef4444;">Error loading calendar tags.</p>';
  }
}

// Helper functions
async function waitForCalendarService() {
  let attempts = 0;
  while (!window.CalendarService && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  if (!window.CalendarService) {
    throw new Error('Calendar service not loaded. Please refresh and try again.');
  }
}

async function waitForCalendarSync() {
  let attempts = 0;
  while (!window.CalendarSync && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  if (!window.CalendarSync) {
    throw new Error('Calendar sync not loaded. Please refresh and try again.');
  }
}

