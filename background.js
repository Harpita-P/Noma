// background.js
console.log("Noma: Background script loaded");

// Import calendar and gmail services for background sync
importScripts('calendar-service-v3.js', 'calendar-sync.js', 'gmail-service.js', 'gmail-sync.js');

// Initialize calendar auto-sync when extension starts
chrome.runtime.onStartup.addListener(async () => {
  console.log("Noma: Extension startup - initializing services");
  await initializeAutoSync();
  // Note: Folder handles cannot be restored after browser restart
  // Users will need to reconnect folders after restart due to security restrictions
});

// Also initialize when extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Noma: Extension installed - initializing services");
  
  // Create context menus
  try {
    chrome.contextMenus.create({
      id: "noma-save-selection",
      title: "Save text to tag…",
      contexts: ["selection"]
    });
    
    chrome.contextMenus.create({
      id: "noma-save-image",
      title: "Save image to tag…",
      contexts: ["image"]
    });
    
    console.log("Noma: Context menus created successfully");
  } catch (error) {
    console.error("Noma: Error creating context menus:", error);
  }
  
  // Initialize auto-sync for both calendar and gmail
  await initializeAutoSync();
});

// Initialize auto-sync for both calendar and gmail
async function initializeAutoSync() {
  try {
    // Load settings
    const { 'noma-calendar-settings': settings = {} } = 
      await chrome.storage.local.get('noma-calendar-settings');
    
    if (settings.clientId) {
      console.log("Noma: Initializing services in background");
      await CalendarService.initialize(settings.clientId);
      await GmailService.initialize(settings.clientId);
      
      // Check if we have tags to sync
      const { 'noma-calendar-tags': calendarTags = {}, 'noma-gmail-tags': gmailTags = {} } = 
        await chrome.storage.local.get(['noma-calendar-tags', 'noma-gmail-tags']);
      
      if (Object.keys(calendarTags).length > 0 || Object.keys(gmailTags).length > 0) {
        console.log("Noma: Starting background auto-sync");
        startBackgroundAutoSync();
      }
    }
  } catch (error) {
    console.warn("Noma: Could not initialize auto-sync:", error);
  }
}

// Background auto-sync timer
let backgroundSyncTimer = null;

function startBackgroundAutoSync() {
  // Clear any existing timer
  if (backgroundSyncTimer) {
    clearInterval(backgroundSyncTimer);
  }
  
  // Start new timer
  backgroundSyncTimer = setInterval(async () => {
    try {
      console.log("Noma: Background auto-sync running...");
      
      // Check if we have valid settings and tags
      const { 'noma-calendar-settings': settings = {}, 'noma-calendar-tags': calendarTags = {}, 'noma-gmail-tags': gmailTags = {} } = 
        await chrome.storage.local.get(['noma-calendar-settings', 'noma-calendar-tags', 'noma-gmail-tags']);
      
      if (settings.clientId && (Object.keys(calendarTags).length > 0 || Object.keys(gmailTags).length > 0)) {
        // Initialize services if needed
        if (!CalendarService.isInitialized) {
          await CalendarService.initialize(settings.clientId);
        }
        if (!GmailService.isInitialized) {
          await GmailService.initialize(settings.clientId);
        }
        
        // Try to get a token (non-interactive)
        if (!CalendarService.isSignedIn() || !GmailService.isSignedIn()) {
          try {
            const token = await chrome.identity.getAuthToken({ interactive: false });
            if (token) {
              const accessToken = typeof token === 'object' && token.token ? token.token : token;
              if (!CalendarService.isSignedIn()) {
                CalendarService.accessToken = accessToken;
              }
              if (!GmailService.isSignedIn()) {
                GmailService.accessToken = accessToken;
              }
              console.log("Noma: Background auth successful");
            }
          } catch (authError) {
            console.log("Noma: Background auth failed (user needs to sign in manually)");
            return;
          }
        }
        
        // Sync calendar tags
        if (Object.keys(calendarTags).length > 0 && CalendarService.isSignedIn()) {
          await CalendarSync.syncAllCalendarTags();
        }
        
        // Sync gmail tags
        if (Object.keys(gmailTags).length > 0 && GmailService.isSignedIn()) {
          await GmailSync.syncAllGmailTags();
        }
      }
    } catch (error) {
      console.warn("Noma: Background sync error:", error);
    }
  }, 15 * 60 * 1000); // 15 minutes (reduced API calls)
  
  console.log("Noma: Background auto-sync timer started (15 min interval)");
}

// Handle extension icon click
chrome.action.onClicked.addListener(async () => {
  await openNomaWindow();
});

// Handle keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "_execute_action") {
    await openNomaWindow();
  }
});

// Function to open the fullscreen Noma window
async function openNomaWindow() {
  try {
    // Check if window already exists
    const existingWindows = await chrome.windows.getAll();
    const taggleWindow = existingWindows.find(w => w.type === 'popup' && w.state === 'maximized');
    
    if (taggleWindow) {
      // Focus existing window
      await chrome.windows.update(taggleWindow.id, { focused: true });
      return;
    }
    
    // Get current screen info to determine available space
    const currentWindow = await chrome.windows.getCurrent();
    
    // Create new fullscreen window
    const newWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      state: 'maximized',
      focused: true
    });
    
    console.log("Noma: Opened fullscreen window:", newWindow.id);
    
  } catch (error) {
    console.error("Noma: Error opening window:", error);
  }
}


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab || !tab.id) return;

    let contextData = {};
    
    if (info.menuItemId === "noma-save-selection") {
      const selectedText = info.selectionText || "";
      if (!selectedText.trim()) return;
      
      console.log("Noma: Text context menu clicked, selected text:", selectedText.substring(0, 50) + "...");
      contextData = { 
        type: "text",
        selection: selectedText, 
        url: tab.url || "", 
        title: tab.title || "" 
      };
      
    } else if (info.menuItemId === "noma-save-image") {
      const imageUrl = info.srcUrl || "";
      if (!imageUrl) return;
      
      console.log("Noma: Image context menu clicked, image URL:", imageUrl);
      
      // Fetch and convert image to base64
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        contextData = {
          type: "image",
          imageUrl: imageUrl,
          imageData: base64,
          mimeType: blob.type,
          url: tab.url || "",
          title: tab.title || ""
        };
      } catch (fetchError) {
        console.error("Noma: Error fetching image:", fetchError);
        // Fallback to just URL if fetch fails
        contextData = {
          type: "image",
          imageUrl: imageUrl,
          url: tab.url || "",
          title: tab.title || ""
        };
      }
    } else {
      return;
    }

    // Open the tag picker as a small popup window
    const channel = `noma-picker-${Date.now()}`;
    await chrome.storage.local.set({ [channel]: contextData });

    console.log("Noma: Data stored with channel:", channel);

    const window = await chrome.windows.create({
      url: chrome.runtime.getURL(`picker.html?ch=${encodeURIComponent(channel)}`),
      type: "popup",
      width: 420,
      height: 520
    });

    console.log("Noma: Picker window created:", window.id);
  } catch (error) {
    console.error("Noma: Error in context menu handler:", error);
  }
});

// Helper function to convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Listen for messages from content script (e.g., floating logo click)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    openNomaWindow();
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});
