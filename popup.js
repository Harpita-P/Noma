// popup.js - Compact version of options.js for popup interface
import { getAllTags, createTag, deleteTag, getContexts, addContext } from "./storage.js";

const els = {
  name: document.getElementById("tag-name"),
  create: document.getElementById("create"),
  list: document.getElementById("list"),
  refresh: document.getElementById("refresh"),
  pdfFile: document.getElementById("pdf-file"),
  pdfTagSelect: document.getElementById("pdf-tag-select"),
  uploadPdf: document.getElementById("upload-pdf"),
  uploadStatus: document.getElementById("upload-status"),
  // Calendar elements
  calendarClientId: document.getElementById("calendar-client-id"),
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
  // Gmail elements
  gmailSignin: document.getElementById("gmail-signin"),
  gmailSignout: document.getElementById("gmail-signout"),
  gmailAuthStatus: document.getElementById("gmail-auth-status"),
  gmailTagCreation: document.getElementById("gmail-tag-creation"),
  gmailTagName: document.getElementById("gmail-tag-name"),
  createGmailTag: document.getElementById("create-gmail-tag"),
  gmailTagsSection: document.getElementById("gmail-tags-section"),
  gmailTagsList: document.getElementById("gmail-tags-list"),
  gmailSyncAll: document.getElementById("gmail-sync-all"),
  // New compact integration elements
  calendarConnect: document.getElementById("calendar-connect"),
  calendarDisconnect: document.getElementById("calendar-disconnect"),
  calendarStatus: document.getElementById("calendar-status"),
  gmailConnect: document.getElementById("gmail-connect"),
  gmailDisconnect: document.getElementById("gmail-disconnect"),
  gmailStatus: document.getElementById("gmail-status"),
};

els.create.onclick = onCreate;
els.refresh.onclick = render;
els.pdfFile.onchange = onPdfFileChange;
els.pdfTagSelect.onchange = onPdfTagChange;
els.uploadPdf.onclick = onUploadPdf;
// Calendar event handlers
els.calendarSaveSettings.onclick = onCalendarSaveSettings;
els.calendarSignin.onclick = onCalendarSignin;
els.calendarSignout.onclick = onCalendarSignout;
els.createCalendarTag.onclick = onCreateCalendarTag;
els.calendarSyncAll.onclick = onCalendarSyncAll;

// Gmail event handlers
els.gmailSignin.onclick = onGmailSignin;
els.gmailSignout.onclick = onGmailSignout;
els.createGmailTag.onclick = onCreateGmailTag;
els.gmailSyncAll.onclick = onGmailSyncAll;

// New compact integration handlers
els.calendarConnect.onclick = onCalendarConnect;
els.calendarDisconnect.onclick = onCalendarDisconnect;
els.gmailConnect.onclick = onGmailConnect;
els.gmailDisconnect.onclick = onGmailDisconnect;

// Load PDF extractor
const pdfScript = document.createElement('script');
pdfScript.src = 'pdf-extractor.js';
document.head.appendChild(pdfScript);


// Load calendar services (Manifest V3 compatible)
const calendarServiceScript = document.createElement('script');
calendarServiceScript.src = 'calendar-service-v3.js';
document.head.appendChild(calendarServiceScript);

const calendarSyncScript = document.createElement('script');
calendarSyncScript.src = 'calendar-sync.js';
document.head.appendChild(calendarSyncScript);

// Load Gmail services
const gmailServiceScript = document.createElement('script');
gmailServiceScript.src = 'gmail-service.js';
document.head.appendChild(gmailServiceScript);

const gmailSyncScript = document.createElement('script');
gmailSyncScript.src = 'gmail-sync.js';
document.head.appendChild(gmailSyncScript);

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
  
  // Render calendar components
  try {
    await renderCalendarComponents();
  } catch (error) {
    console.warn('Could not render calendar components:', error);
  }
  
  // Render Gmail components
  try {
    await renderGmailComponents();
  } catch (error) {
    console.warn('Could not render Gmail components:', error);
  }
  
  // Update integration statuses
  updateIntegrationStatuses();
  
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

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, ch =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[ch])
  );
}

// ===== CALENDAR FUNCTIONS =====

// Calendar settings management
async function onCalendarSaveSettings() {
  try {
    const clientId = els.calendarClientId.value.trim();
    
    if (!clientId) {
      alert('Please enter a Google Client ID');
      return;
    }
    
    const settings = { clientId };
    
    await chrome.storage.local.set({ 'taggle-calendar-settings': settings });
    
    // Initialize calendar service
    await waitForCalendarService();
    await CalendarService.initialize(clientId);
    
    els.calendarSignin.disabled = false;
    els.calendarAuthStatus.textContent = 'Settings saved. You can now sign in.';
    
    // Update status indicator
    updateIntegrationStatuses();
    
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
    
    els.calendarAuthStatus.textContent = 'Signed out from Google Account.';
    els.calendarSignin.style.display = 'inline-flex';
    els.calendarSignout.style.display = 'none';
    els.calendarTagCreation.style.display = 'none';
    els.calendarSyncAll.style.display = 'none';
    
    updateIntegrationStatuses();
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
    
    // Check if signed in
    await waitForCalendarService();
    const isSignedIn = CalendarService.isSignedIn();
    
    if (isSignedIn) {
      els.calendarAuthStatus.textContent = 'Signed in Google Account';
      els.calendarSignin.style.display = 'none';
      els.calendarSignout.style.display = 'inline-flex';
      els.calendarTagCreation.style.display = 'block';
      updateIntegrationStatuses();
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

// Gmail functions
async function onGmailSignin() {
  try {
    await waitForGmailService();
    await waitForGmailSync();
    
    // Use the same client ID as calendar
    const calendarSettings = await CalendarSync.getCalendarSettings();
    if (!calendarSettings.clientId) {
      els.gmailAuthStatus.textContent = "Please set up Google Client ID in Calendar integration first.";
      els.gmailAuthStatus.style.color = "#ef4444";
      return;
    }

    await GmailService.initialize(calendarSettings.clientId);
    await GmailService.signIn();
    
    els.gmailAuthStatus.textContent = "Gmail sign-in successful!";
    els.gmailAuthStatus.style.color = "#10b981";
    await renderGmailComponents();
  } catch (error) {
    console.error("Gmail sign-in error:", error);
    els.gmailAuthStatus.textContent = "Gmail sign-in failed: " + error.message;
    els.gmailAuthStatus.style.color = "#ef4444";
  }
}

async function onGmailSignout() {
  try {
    await waitForGmailService();
    await GmailService.signOut();
    els.gmailAuthStatus.textContent = "Signed out of Gmail.";
    els.gmailAuthStatus.style.color = "#6b7280";
    updateIntegrationStatuses();
    await renderGmailComponents();
  } catch (error) {
    console.error("Gmail sign-out error:", error);
    els.gmailAuthStatus.textContent = "Sign-out failed: " + error.message;
    els.gmailAuthStatus.style.color = "#ef4444";
  }
}

async function onCreateGmailTag() {
  try {
    await waitForGmailSync();
    
    const tagName = els.gmailTagName.value.trim();

    if (!tagName) {
      els.gmailAuthStatus.textContent = "Please enter a tag name.";
      els.gmailAuthStatus.style.color = "#ef4444";
      return;
    }

    const gmailConfig = {
      type: 'recent', // Only recent emails now
      maxResults: 5 // Always use top 5 emails
    };

    await GmailSync.createGmailTag(tagName, gmailConfig);
    
    els.gmailTagName.value = '';
    els.gmailAuthStatus.textContent = `Gmail tag @${tagName} created successfully!`;
    els.gmailAuthStatus.style.color = "#10b981";
    
    await renderGmailComponents();
    await render();
  } catch (error) {
    console.error("Error creating Gmail tag:", error);
    els.gmailAuthStatus.textContent = "Failed to create Gmail tag: " + error.message;
    els.gmailAuthStatus.style.color = "#ef4444";
  }
}

async function onGmailSyncAll() {
  try {
    await waitForGmailSync();
    
    els.gmailSyncAll.disabled = true;
    els.gmailSyncAll.textContent = "Syncing...";
    
    await GmailSync.syncAllGmailTags();
    
    els.gmailAuthStatus.textContent = "All Gmail tags synced successfully!";
    els.gmailAuthStatus.style.color = "#10b981";
    await renderGmailComponents();
    await render();
  } catch (error) {
    console.error("Error syncing Gmail tags:", error);
    els.gmailAuthStatus.textContent = "Sync failed: " + error.message;
    els.gmailAuthStatus.style.color = "#ef4444";
  } finally {
    els.gmailSyncAll.disabled = false;
    els.gmailSyncAll.textContent = "Sync All";
  }
}

async function renderGmailComponents() {
  try {
    // Check if Gmail services are available
    if (typeof GmailService === 'undefined' || typeof GmailSync === 'undefined') {
      els.gmailTagsList.innerHTML = '<p style="color: #6b7280;">Gmail services loading...</p>';
      return;
    }

    const isSignedIn = GmailService.isSignedIn();
    
    // Update sign-in/out buttons
    els.gmailSignin.style.display = isSignedIn ? 'none' : 'inline-block';
    els.gmailSignout.style.display = isSignedIn ? 'inline-block' : 'none';
    els.gmailSignin.disabled = false; // Enable after calendar setup
    
    // Show/hide tag creation and sync sections
    els.gmailTagCreation.style.display = isSignedIn ? 'block' : 'none';
    els.gmailTagsSection.style.display = isSignedIn ? 'block' : 'none';
    els.gmailSyncAll.style.display = isSignedIn ? 'inline-block' : 'none';

    // Update user info
    if (isSignedIn) {
      try {
        const userInfo = await GmailService.getUserInfo();
        els.gmailAuthStatus.textContent = `Signed in as: ${userInfo.email}`;
        els.gmailAuthStatus.style.color = "#10b981";
        updateIntegrationStatuses();
      } catch (error) {
        els.gmailAuthStatus.textContent = "Signed in to Gmail";
        els.gmailAuthStatus.style.color = "#10b981";
        updateIntegrationStatuses();
      }
    }

    // Render Gmail tags list
    const gmailTags = await GmailSync.getGmailTags();
    const gmailTagIds = Object.keys(gmailTags);
    
    if (gmailTagIds.length === 0) {
      els.gmailTagsList.innerHTML = '<p style="color: #6b7280;">No Gmail tags created yet.</p>';
      return;
    }

    let html = '';
    for (const tagId of gmailTagIds) {
      const config = gmailTags[tagId];
      const lastSynced = config.lastSynced ? new Date(config.lastSynced).toLocaleString() : 'Never';
      
      const typeDescription = 'Recent Emails (5)';

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 500; color: #1f2937;">@${config.tagName}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${typeDescription}</div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Last synced: ${lastSynced}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-small gmail-sync-btn" data-tag-id="${tagId}">Sync</button>
            <button class="btn btn-small gmail-delete-btn" data-tag-id="${tagId}" style="background: #ef4444; color: white; border-color: #ef4444;">Delete</button>
          </div>
        </div>
      `;
    }
    
    els.gmailTagsList.innerHTML = html;

    // Add event listeners for sync and delete buttons
    els.gmailTagsList.querySelectorAll('.gmail-sync-btn').forEach(btn => {
      btn.onclick = async () => {
        const tagId = btn.dataset.tagId;
        try {
          btn.disabled = true;
          btn.textContent = 'Syncing...';
          await GmailSync.syncGmailTag(tagId);
          await renderGmailComponents();
          await render();
          els.gmailAuthStatus.textContent = 'Gmail tag synced successfully!';
          els.gmailAuthStatus.style.color = "#10b981";
        } catch (error) {
          console.error("Error syncing Gmail tag:", error);
          els.gmailAuthStatus.textContent = 'Sync failed: ' + error.message;
          els.gmailAuthStatus.style.color = "#ef4444";
        } finally {
          btn.disabled = false;
          btn.textContent = 'Sync';
        }
      };
    });

    els.gmailTagsList.querySelectorAll('.gmail-delete-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Delete this Gmail tag? This will also delete the regular tag and all its contexts.")) {
          return;
        }
        
        const tagId = btn.dataset.tagId;
        try {
          await GmailSync.deleteGmailTag(tagId);
          await deleteTag(tagId);
          await renderGmailComponents();
          await render();
          els.gmailAuthStatus.textContent = 'Gmail tag deleted successfully!';
          els.gmailAuthStatus.style.color = "#10b981";
        } catch (error) {
          console.error("Error deleting Gmail tag:", error);
          els.gmailAuthStatus.textContent = 'Delete failed: ' + error.message;
          els.gmailAuthStatus.style.color = "#ef4444";
        }
      };
    });
    
  } catch (error) {
    console.error("Error rendering Gmail components:", error);
    els.gmailTagsList.innerHTML = '<p style="color: #ef4444;">Error loading Gmail tags.</p>';
  }
}

async function waitForGmailService() {
  let attempts = 0;
  while (!window.GmailService && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  if (!window.GmailService) {
    throw new Error('Gmail service not loaded. Please refresh and try again.');
  }
}

async function waitForGmailSync() {
  let attempts = 0;
  while (!window.GmailSync && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  if (!window.GmailSync) {
    throw new Error('Gmail sync not loaded. Please refresh and try again.');
  }
}

// Update integration status indicators
function updateIntegrationStatuses() {
  updateCalendarStatus();
  updateGmailStatus();
}

function updateCalendarStatus() {
  const statusEl = els.calendarStatus;
  if (!statusEl) return;
  
  // Check if Google Client ID is configured
  const clientId = els.calendarClientId.value.trim();
  
  if (!clientId) {
    statusEl.textContent = 'Setup required';
    statusEl.className = 'integration-status';
    els.calendarConnect.style.display = 'none';
    els.calendarDisconnect.style.display = 'none';
    return;
  }
  
  // Check calendar sign-in status
  let isSignedIn = false;
  if (window.CalendarService && window.CalendarService.isSignedIn && window.CalendarService.isSignedIn()) {
    isSignedIn = true;
  }
  
  if (isSignedIn) {
    statusEl.textContent = 'Connected';
    statusEl.className = 'integration-status connected';
    els.calendarConnect.style.display = 'none';
    els.calendarDisconnect.style.display = 'inline-flex';
  } else {
    statusEl.textContent = 'Ready';
    statusEl.className = 'integration-status';
    els.calendarConnect.style.display = 'inline-flex';
    els.calendarDisconnect.style.display = 'none';
  }
}

function updateGmailStatus() {
  const statusEl = els.gmailStatus;
  if (!statusEl) return;
  
  // Check if Google Client ID is configured
  const clientId = els.calendarClientId.value.trim();
  
  if (!clientId) {
    statusEl.textContent = 'Setup required';
    statusEl.className = 'integration-status';
    els.gmailConnect.style.display = 'inline-flex'; // Always show Connect button
    els.gmailDisconnect.style.display = 'none';
    return;
  }
  
  // Check Gmail sign-in status
  let isSignedIn = false;
  if (window.GmailService && window.GmailService.isSignedIn && window.GmailService.isSignedIn()) {
    isSignedIn = true;
  }
  
  if (isSignedIn) {
    statusEl.textContent = 'Connected';
    statusEl.className = 'integration-status connected';
    els.gmailConnect.style.display = 'none';
    els.gmailDisconnect.style.display = 'inline-flex';
  } else {
    statusEl.textContent = 'Ready';
    statusEl.className = 'integration-status';
    els.gmailConnect.style.display = 'inline-flex';
    els.gmailDisconnect.style.display = 'none';
  }
}

// Compact integration handlers
async function onCalendarConnect() {
  try {
    // Save settings first if needed
    await onCalendarSaveSettings();
    
    // Sign in to calendar
    await onCalendarSignin();
    
    // Create default calendar tag
    await createDefaultCalendarTag();
    
    updateIntegrationStatuses();
  } catch (error) {
    console.error('Calendar connect failed:', error);
    els.calendarAuthStatus.textContent = 'Connection failed: ' + error.message;
  }
}

async function onCalendarDisconnect() {
  try {
    await onCalendarSignout();
    updateIntegrationStatuses();
  } catch (error) {
    console.error('Calendar disconnect failed:', error);
  }
}

async function onGmailConnect() {
  console.log('Gmail Connect button clicked!');
  try {
    // Make sure Google Client ID is configured first
    const clientId = els.calendarClientId.value.trim();
    if (!clientId) {
      alert('Please enter a Google Client ID and click Save first');
      return;
    }
    
    console.log('Gmail: Client ID found, initializing service...');
    
    // Initialize Gmail service if needed
    await waitForGmailService();
    if (!window.GmailService.isInitialized) {
      await window.GmailService.initialize(clientId);
    }
    
    console.log('Gmail: Service initialized, signing in...');
    
    // Sign in to Gmail
    await onGmailSignin();
    
    console.log('Gmail: Signed in, creating default tag...');
    
    // Create default Gmail tag
    await createDefaultGmailTag();
    
    console.log('Gmail: Default tag created, updating status...');
    
    updateIntegrationStatuses();
    console.log('Gmail: Connect process completed successfully!');
  } catch (error) {
    console.error('Gmail connect failed:', error);
    els.gmailAuthStatus.textContent = 'Connection failed: ' + error.message;
    alert('Gmail connection failed: ' + error.message);
  }
}

async function onGmailDisconnect() {
  try {
    await onGmailSignout();
    updateIntegrationStatuses();
  } catch (error) {
    console.error('Gmail disconnect failed:', error);
  }
}

// Create default tags
async function createDefaultCalendarTag() {
  try {
    await waitForCalendarSync();
    
    const calendarConfig = {
      type: 'upcoming' // Default to next 30 days
    };
    
    await CalendarSync.createCalendarTag('myCalendar', calendarConfig);
    console.log('Created default calendar tag: @myCalendar');
  } catch (error) {
    console.error('Failed to create default calendar tag:', error);
  }
}

async function createDefaultGmailTag() {
  try {
    await waitForGmailSync();
    
    const gmailConfig = {
      type: 'recent',
      maxResults: 5
    };
    
    await GmailSync.createGmailTag('myEmails', gmailConfig);
    console.log('Created default Gmail tag: @myEmails');
  } catch (error) {
    console.error('Failed to create default Gmail tag:', error);
  }
}

