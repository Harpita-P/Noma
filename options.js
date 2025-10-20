// options.js
import { getAllTags, createTag, deleteTag, getContexts, addContext, getAllFolders, addFolderWatch, removeFolderWatch, getAllTagsWithContextCounts } from "./storage.js";

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
  // OpenAI elements
  openaiApiKey: document.getElementById("openai-api-key"),
  saveOpenaiKey: document.getElementById("save-openai-key"),
  openaiStatus: document.getElementById("openai-status"),
  // Calendar elements
  googleClientId: document.getElementById("google-client-id"),
  googleApiKey: document.getElementById("google-api-key"),
  saveCalendarSettings: document.getElementById("save-calendar-settings"),
  calendarSetupStatus: document.getElementById("calendar-setup-status"),
  calendarSignin: document.getElementById("calendar-signin"),
  calendarSignout: document.getElementById("calendar-signout"),
  calendarUserInfo: document.getElementById("calendar-user-info"),
  calendarTagName: document.getElementById("calendar-tag-name"),
  calendarTagType: document.getElementById("calendar-tag-type"),
  createCalendarTag: document.getElementById("create-calendar-tag"),
  calendarTagStatus: document.getElementById("calendar-tag-status"),
  syncCalendarTags: document.getElementById("sync-calendar-tags"),
  calendarTagsList: document.getElementById("calendar-tags-list"),
};

els.create.onclick = onCreate;
els.refresh.onclick = render;
els.pdfFile.onchange = onPdfFileChange;
els.pdfTagSelect.onchange = onPdfTagChange;
els.uploadPdf.onclick = onUploadPdf;
els.folderTagSelect.onchange = onFolderTagChange;
els.addFolderWatch.onclick = onAddFolderWatch;
els.scanNow.onclick = onScanNow;

// OpenAI event handlers
els.saveOpenaiKey.onclick = onSaveOpenaiKey;

// Calendar event handlers
els.saveCalendarSettings.onclick = onSaveCalendarSettings;
els.calendarSignin.onclick = onCalendarSignin;
els.calendarSignout.onclick = onCalendarSignout;
els.createCalendarTag.onclick = onCreateCalendarTag;
els.syncCalendarTags.onclick = onSyncCalendarTags;

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
  const tagsWithCounts = await getAllTagsWithContextCounts();
  
  // Update PDF tag selector
  updatePdfTagSelector(tagsWithCounts);
  updateFolderTagSelector(tagsWithCounts);
  
  // Render watched folders
  await renderWatchedFolders();
  
  // Render calendar components
  await renderCalendarComponents();
  
  if (!tagsWithCounts.length) {
    els.list.innerHTML = `<p class="muted">No tags yet. Create one above.</p>`;
    return;
  }

  const parts = [];
  for (const t of tagsWithCounts) {
    const ctx = await getContexts(t.id);
    const counts = t.contextCounts || { text: 0, pdf: 0, image: 0, calendar: 0, email: 0, total: 0 };
    
    // Create context type indicators
    const indicators = [];
    if (counts.text > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Text: ${counts.text}</span>
      </span>`);
    }
    if (counts.pdf > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">PDF: ${counts.pdf}</span>
      </span>`);
    }
    if (counts.image > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #eab308; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Images: ${counts.image}</span>
      </span>`);
    }
    if (counts.calendar > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #10b981; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Calendar: ${counts.calendar}</span>
      </span>`);
    }
    if (counts.email > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Email: ${counts.email}</span>
      </span>`);
    }
    
    parts.push(`
      <div class="tag">
        <div>
          <b>@${t.name}</b> 
          <span class="muted">(${counts.total} contexts)</span>
          ${indicators.length > 0 ? `<br><div style="margin-top: 4px; display: flex; flex-wrap: wrap;">${indicators.join('')}</div>` : ''}
        </div>
        <div>
          <button data-del="${t.id}">Delete</button>
        </div>
      </div>
      <div class="contexts">
        ${ctx.map(c => `
          <div class="ctx">
            <div class="muted">${c.title ? c.title + " · " : ""}${c.url ? `<a href="${c.url}" target="_blank">${c.url}</a>` : ""}</div>
            ${c.type === 'image' ? 
              `<div><strong>Image:</strong> ${c.imageUrl || 'Uploaded image'}</div>` :
              escapeHtml(c.text || c.selection)
            }
          </div>
        `).join("")}
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
  const options = ['<option value="">Select a tag...</option>'];
  tags.forEach(tag => {
    const counts = tag.contextCounts || { text: 0, pdf: 0, image: 0, total: 0 };
    const totalText = counts.total > 0 ? ` (${counts.total})` : '';
    options.push(`<option value="${tag.id}">@${tag.name}${totalText}</option>`);
  });
  els.pdfTagSelect.innerHTML = options.join('');
}

// Handle PDF file selection
function onPdfFileChange() {
  const file = els.pdfFile.files[0];
  updateUploadButton();
  
  if (file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    els.uploadStatus.textContent = `Selected: ${file.name} (${sizeInMB} MB)`;
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
    els.uploadStatus.textContent = 'Please select both a PDF file and a tag.';
    return;
  }
  
  try {
    els.uploadPdf.disabled = true;
    els.uploadStatus.textContent = 'Extracting text from PDF...';
    
    // Wait for PDF extractor to be available
    let attempts = 0;
    while (!window.PDFExtractor && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.PDFExtractor) {
      throw new Error('PDF extractor not loaded. Please refresh the page and try again.');
    }
    
    // Extract text from PDF
    const extractedText = await window.PDFExtractor.extractText(file);
    
    if (!extractedText.trim()) {
      throw new Error('No text found in PDF. This might be a scanned document.');
    }
    
    els.uploadStatus.textContent = 'Saving extracted text to tag...';
    
    // Save to tag as text context
    await addContext(tagId, {
      type: 'text',
      text: extractedText,
      title: `PDF: ${file.name}`,
      url: `file://${file.name}`,
      source: 'pdf-upload'
    });
    
    els.uploadStatus.textContent = `✓ Successfully extracted and saved ${extractedText.length} characters from ${file.name}`;
    
    // Clear form
    els.pdfFile.value = '';
    els.pdfTagSelect.value = '';
    updateUploadButton();
    
    // Refresh the display
    render();
    
    // Clear status after delay
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 3000);
    
  } catch (error) {
    console.error('PDF upload failed:', error);
    els.uploadStatus.textContent = `❌ Error: ${error.message}`;
    
    // Clear error after delay
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 5000);
  } finally {
    els.uploadPdf.disabled = false;
    updateUploadButton();
  }
}

// Update folder tag selector dropdown
function updateFolderTagSelector(tags) {
  const options = ['<option value="">Select a tag...</option>'];
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
    els.folderStatus.textContent = 'Please select a tag first.';
    return;
  }
  
  try {
    els.addFolderWatch.disabled = true;
    els.folderStatus.textContent = 'Opening folder picker...';
    
    // Wait for folder watcher to be available
    let attempts = 0;
    while (!window.FolderWatcher && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.FolderWatcher) {
      throw new Error('Folder watcher not loaded. Please refresh the page and try again.');
    }
    
    // Initialize folder watcher
    const initialized = await window.FolderWatcher.initialize();
    if (!initialized) {
      throw new Error('Folder watching is not supported in this browser. Please use Chrome or Edge.');
    }
    
    // Request folder access
    const directoryHandle = await window.FolderWatcher.requestFolderAccess();
    
    if (!directoryHandle) {
      els.folderStatus.textContent = 'Folder selection cancelled.';
      return;
    }
    
    els.folderStatus.textContent = 'Setting up folder watch...';
    
    // Add folder watch
    const folderConfig = await window.FolderWatcher.addFolderWatch(
      directoryHandle, 
      tagId, 
      directoryHandle.name
    );
    
    els.folderStatus.textContent = `✓ Now watching "${folderConfig.name}" for PDFs`;
    
    // Clear form
    els.folderTagSelect.value = '';
    updateFolderWatchButton();
    
    // Refresh the display
    await renderWatchedFolders();
    
    // Clear status after delay
    setTimeout(() => {
      els.folderStatus.textContent = '';
    }, 3000);
    
  } catch (error) {
    console.error('Folder watch setup failed:', error);
    els.folderStatus.textContent = `❌ Error: ${error.message}`;
    
    // Clear error after delay
    setTimeout(() => {
      els.folderStatus.textContent = '';
    }, 5000);
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
      els.foldersList.innerHTML = '<p class="muted">No folders being watched yet.</p>';
      return;
    }
    
    const parts = [];
    for (const [folderId, folder] of Object.entries(folders)) {
      const tagName = tagMap.get(folder.tagId) || 'Unknown Tag';
      parts.push(`
        <div class="tag">
          <div>
            <strong>${folder.name}</strong> → <span class="pill">@${tagName}</span>
            <div class="muted" style="font-size: 12px; margin-top: 4px;">
              Added: ${new Date(folder.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <button data-remove-folder="${folderId}">Remove</button>
          </div>
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
    els.foldersList.innerHTML = '<p class="muted">Error loading watched folders.</p>';
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
      throw new Error('Folder watcher not loaded. Please refresh the page and try again.');
    }
    
    // Trigger immediate scan of all folders
    await window.FolderWatcher.scanAllFoldersNow();
    
    els.scanNow.textContent = '✓ Scanned';
    
    // Refresh the display to show any new contexts
    render();
    
    // Reset button after delay
    setTimeout(() => {
      els.scanNow.textContent = 'Scan All Now';
    }, 2000);
    
  } catch (error) {
    console.error('Manual scan failed:', error);
    els.scanNow.textContent = '❌ Error';
    
    // Reset button after delay
    setTimeout(() => {
      els.scanNow.textContent = 'Scan All Now';
    }, 3000);
  } finally {
    els.scanNow.disabled = false;
  }
}

// ---------- Calendar Functions ----------

async function onSaveCalendarSettings() {
  try {
    const clientId = els.googleClientId.value.trim();
    const apiKey = els.googleApiKey.value.trim();
    
    if (!clientId) {
      els.calendarSetupStatus.textContent = "Please enter at least the Client ID";
      els.calendarSetupStatus.style.color = "#ef4444";
      return;
    }
    
    els.saveCalendarSettings.textContent = "Saving...";
    els.saveCalendarSettings.disabled = true;
    
    // Save settings using CalendarSync
    await CalendarSync.saveCalendarSettings({ clientId, apiKey });
    
    // Initialize calendar service (V3 only needs Client ID)
    const initialized = await CalendarService.initialize(clientId);
    if (initialized) {
      els.calendarSetupStatus.textContent = "Settings saved successfully!";
      els.calendarSetupStatus.style.color = "#10b981";
      
      // Enable sign-in button
      els.calendarSignin.disabled = false;
      
      // Initialize CalendarSync
      await CalendarSync.initialize();
    } else {
      els.calendarSetupStatus.textContent = "Failed to initialize calendar service";
      els.calendarSetupStatus.style.color = "#ef4444";
    }
    
  } catch (error) {
    console.error("Error saving calendar settings:", error);
    els.calendarSetupStatus.textContent = "Error saving settings";
    els.calendarSetupStatus.style.color = "#ef4444";
  } finally {
    els.saveCalendarSettings.textContent = "Save Settings";
    els.saveCalendarSettings.disabled = false;
  }
}

async function onCalendarSignin() {
  try {
    els.calendarSignin.textContent = "Signing in...";
    els.calendarSignin.disabled = true;
    
    await CalendarService.signIn();
    
    // Update UI
    await updateCalendarAuthUI();
    
    els.calendarSetupStatus.textContent = "Signed in successfully!";
    els.calendarSetupStatus.style.color = "#10b981";
    
  } catch (error) {
    console.error("Calendar sign-in error:", error);
    els.calendarSetupStatus.textContent = "Sign-in failed: " + error.message;
    els.calendarSetupStatus.style.color = "#ef4444";
  } finally {
    els.calendarSignin.textContent = "Sign In to Google Calendar";
    els.calendarSignin.disabled = false;
  }
}

async function onCalendarSignout() {
  try {
    els.calendarSignout.textContent = "Signing out...";
    els.calendarSignout.disabled = true;
    
    await CalendarService.signOut();
    
    // Update UI
    await updateCalendarAuthUI();
    
    els.calendarSetupStatus.textContent = "Signed out successfully";
    els.calendarSetupStatus.style.color = "#666";
    
  } catch (error) {
    console.error("Calendar sign-out error:", error);
    els.calendarSetupStatus.textContent = "Sign-out failed: " + error.message;
    els.calendarSetupStatus.style.color = "#ef4444";
  } finally {
    els.calendarSignout.textContent = "Sign Out";
    els.calendarSignout.disabled = false;
  }
}

async function onCreateCalendarTag() {
  try {
    const tagName = els.calendarTagName.value.trim();
    const tagType = els.calendarTagType.value;
    
    if (!tagName) {
      els.calendarTagStatus.textContent = "Please enter a tag name";
      els.calendarTagStatus.style.color = "#ef4444";
      return;
    }
    
    els.createCalendarTag.textContent = "Creating...";
    els.createCalendarTag.disabled = true;
    
    // Create calendar tag
    const tag = await CalendarSync.createCalendarTag(tagName, { type: tagType });
    
    els.calendarTagName.value = "";
    els.calendarTagStatus.textContent = `Created @${tag.name} successfully!`;
    els.calendarTagStatus.style.color = "#10b981";
    
    // Refresh the UI
    await renderCalendarComponents();
    await render();
    
  } catch (error) {
    console.error("Error creating calendar tag:", error);
    els.calendarTagStatus.textContent = "Error: " + error.message;
    els.calendarTagStatus.style.color = "#ef4444";
  } finally {
    els.createCalendarTag.textContent = "Create Calendar Tag";
    els.createCalendarTag.disabled = false;
  }
}

async function onSyncCalendarTags() {
  try {
    els.syncCalendarTags.textContent = "Syncing...";
    els.syncCalendarTags.disabled = true;
    
    await CalendarSync.manualSync();
    
    els.calendarSetupStatus.textContent = "Calendar tags synced successfully!";
    els.calendarSetupStatus.style.color = "#10b981";
    
    // Refresh the UI
    await renderCalendarComponents();
    await render();
    
  } catch (error) {
    console.error("Error syncing calendar tags:", error);
    els.calendarSetupStatus.textContent = "Sync failed: " + error.message;
    els.calendarSetupStatus.style.color = "#ef4444";
  } finally {
    els.syncCalendarTags.textContent = "Sync All";
    els.syncCalendarTags.disabled = false;
  }
}

async function updateCalendarAuthUI() {
  try {
    if (CalendarService.isSignedIn()) {
      const userInfo = await CalendarService.getUserInfo();
      els.calendarUserInfo.textContent = `Signed in as: ${userInfo.email}`;
      els.calendarSignin.style.display = "none";
      els.calendarSignout.style.display = "inline-block";
      els.createCalendarTag.disabled = false;
      els.syncCalendarTags.disabled = false;
    } else {
      els.calendarUserInfo.textContent = "";
      els.calendarSignin.style.display = "inline-block";
      els.calendarSignout.style.display = "none";
      els.createCalendarTag.disabled = true;
      els.syncCalendarTags.disabled = true;
    }
  } catch (error) {
    console.error("Error updating calendar auth UI:", error);
  }
}

async function renderCalendarComponents() {
  try {
    // Load saved settings
    const settings = await CalendarSync.getCalendarSettings();
    if (settings.clientId) els.googleClientId.value = settings.clientId;
    if (settings.apiKey) els.googleApiKey.value = settings.apiKey;
    
    // Update auth UI
    await updateCalendarAuthUI();
    
    // Render calendar tags list
    const calendarTags = await CalendarSync.getCalendarTags();
    const calendarTagsArray = Object.values(calendarTags);
    
    if (calendarTagsArray.length === 0) {
      els.calendarTagsList.innerHTML = '<p class="muted">No calendar tags yet.</p>';
    } else {
      const tagItems = calendarTagsArray.map(tag => {
        const lastSynced = tag.lastSynced ? 
          new Date(tag.lastSynced).toLocaleString() : 'Never';
        
        return `
          <div class="tag" style="margin: 6px 0;">
            <div>
              <b>@${tag.tagName}</b>
              <span class="muted">(${tag.type})</span>
              <br>
              <small class="muted">Last synced: ${lastSynced}</small>
            </div>
            <div>
              <button data-sync-tag="${tag.tagId}" class="sync-calendar-tag-btn" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">Sync</button>
              <button data-delete-tag="${tag.tagId}" class="delete-calendar-tag-btn" style="font-size: 12px; padding: 4px 8px;">Delete</button>
            </div>
          </div>
        `;
      }).join('');
      
      els.calendarTagsList.innerHTML = tagItems;
      
      // Add event listeners for sync and delete buttons
      els.calendarTagsList.querySelectorAll('.sync-calendar-tag-btn').forEach(btn => {
        btn.onclick = async () => {
          const tagId = btn.dataset.syncTag;
          try {
            await CalendarSync.syncCalendarTag(tagId);
            await renderCalendarComponents();
            await render();
          } catch (error) {
            console.error("Error syncing calendar tag:", error);
            alert("Failed to sync calendar tag: " + error.message);
          }
        };
      });
      
      els.calendarTagsList.querySelectorAll('.delete-calendar-tag-btn').forEach(btn => {
        btn.onclick = async () => {
          const tagId = btn.dataset.deleteTag;
          if (!confirm("Delete this calendar tag? This will also delete the regular tag and all its contexts.")) {
            return;
          }
          
          try {
            await CalendarSync.deleteCalendarTag(tagId);
            await deleteTag(tagId);
            await renderCalendarComponents();
            await render();
          } catch (error) {
            console.error("Error deleting calendar tag:", error);
            alert("Failed to delete calendar tag: " + error.message);
          }
        };
      });
    }
    
  } catch (error) {
    console.error("Error rendering calendar components:", error);
    els.calendarTagsList.innerHTML = '<p class="muted">Error loading calendar tags.</p>';
  }
}

// Global functions for calendar tag management
window.syncSingleCalendarTag = async function(tagId) {
  try {
    await CalendarSync.syncCalendarTag(tagId);
    await renderCalendarComponents();
    await render();
  } catch (error) {
    console.error("Error syncing calendar tag:", error);
    alert("Failed to sync calendar tag: " + error.message);
  }
};

window.deleteCalendarTag = async function(tagId) {
  if (!confirm("Delete this calendar tag? This will also delete the regular tag and all its contexts.")) {
    return;
  }
  
  try {
    // Delete the calendar tag configuration
    await CalendarSync.deleteCalendarTag(tagId);
    
    // Delete the regular tag
    await deleteTag(tagId);
    
    await renderCalendarComponents();
    await render();
  } catch (error) {
    console.error("Error deleting calendar tag:", error);
    alert("Failed to delete calendar tag: " + error.message);
  }
};

// OpenAI API Key Management
async function onSaveOpenaiKey() {
  const apiKey = els.openaiApiKey.value.trim();
  
  if (!apiKey) {
    els.openaiStatus.textContent = "Please enter an API key";
    els.openaiStatus.style.color = "#dc2626";
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    els.openaiStatus.textContent = "Invalid API key format. Should start with 'sk-'";
    els.openaiStatus.style.color = "#dc2626";
    return;
  }
  
  try {
    // Save to chrome storage
    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    
    // Test the API key
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      els.openaiStatus.textContent = "API key saved and validated successfully!";
      els.openaiStatus.style.color = "#059669";
      els.openaiApiKey.value = ""; // Clear the input for security
    } else {
      els.openaiStatus.textContent = "API key saved but validation failed. Please check your key.";
      els.openaiStatus.style.color = "#d97706";
    }
  } catch (error) {
    console.error("Error saving OpenAI API key:", error);
    els.openaiStatus.textContent = "Failed to save API key: " + error.message;
    els.openaiStatus.style.color = "#dc2626";
  }
}

// Load saved OpenAI API key on page load
async function loadOpenaiSettings() {
  try {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    if (result.openaiApiKey) {
      els.openaiStatus.textContent = "API key is configured (hidden for security)";
      els.openaiStatus.style.color = "#059669";
    } else {
      els.openaiStatus.textContent = "Required for processing contexts larger than 30,000 characters using RAG (Retrieval-Augmented Generation)";
      els.openaiStatus.style.color = "#6b7280";
    }
  } catch (error) {
    console.error("Error loading OpenAI settings:", error);
  }
}

// Call on page load
loadOpenaiSettings();

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, ch =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[ch])
  );
}
