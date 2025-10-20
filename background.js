// background.js
console.log("Taggle: Background script loaded");

// Import calendar services for background sync
importScripts('calendar-service-v3.js', 'calendar-sync.js');

// Initialize calendar auto-sync when extension starts
chrome.runtime.onStartup.addListener(async () => {
  console.log("Taggle: Extension startup - initializing services");
  await initializeCalendarAutoSync();
  // Note: Folder handles cannot be restored after browser restart
  // Users will need to reconnect folders after restart due to security restrictions
});

// Also initialize when extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Taggle: Extension installed - initializing services");
  
  // Create context menus
  try {
    chrome.contextMenus.create({
      id: "taggle-save-selection",
      title: "Save text to tag…",
      contexts: ["selection"]
    });
    
    chrome.contextMenus.create({
      id: "taggle-save-image",
      title: "Save image to tag…",
      contexts: ["image"]
    });
    
    console.log("Taggle: Context menus created successfully");
  } catch (error) {
    console.error("Taggle: Error creating context menus:", error);
  }
  
  // Initialize calendar auto-sync
  await initializeCalendarAutoSync();
});

// Initialize calendar auto-sync
async function initializeCalendarAutoSync() {
  try {
    // Load calendar settings
    const { 'taggle-calendar-settings': settings = {} } = 
      await chrome.storage.local.get('taggle-calendar-settings');
    
    if (settings.clientId) {
      console.log("Taggle: Initializing calendar service in background");
      await CalendarService.initialize(settings.clientId);
      
      // Check if we have calendar tags to sync
      const { 'taggle-calendar-tags': calendarTags = {} } = 
        await chrome.storage.local.get('taggle-calendar-tags');
      
      if (Object.keys(calendarTags).length > 0) {
        console.log("Taggle: Starting background auto-sync");
        startBackgroundAutoSync();
      }
    }
  } catch (error) {
    console.warn("Taggle: Could not initialize calendar auto-sync:", error);
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
      console.log("Taggle: Background auto-sync running...");
      
      // Check if we have valid calendar settings and tags
      const { 'taggle-calendar-settings': settings = {}, 'taggle-calendar-tags': calendarTags = {} } = 
        await chrome.storage.local.get(['taggle-calendar-settings', 'taggle-calendar-tags']);
      
      if (settings.clientId && Object.keys(calendarTags).length > 0) {
        // Initialize service if needed
        if (!CalendarService.isInitialized) {
          await CalendarService.initialize(settings.clientId);
        }
        
        // Try to get a token (non-interactive)
        if (!CalendarService.isSignedIn()) {
          try {
            const token = await chrome.identity.getAuthToken({ interactive: false });
            if (token) {
              CalendarService.accessToken = typeof token === 'object' && token.token ? token.token : token;
              console.log("Taggle: Background auth successful");
            }
          } catch (authError) {
            console.log("Taggle: Background auth failed (user needs to sign in manually)");
            return;
          }
        }
        
        // Sync calendar tags
        await CalendarSync.syncAllCalendarTags();
      }
    } catch (error) {
      console.warn("Taggle: Background sync error:", error);
    }
  }, 15 * 60 * 1000); // 15 minutes (reduced API calls)
  
  console.log("Taggle: Background auto-sync timer started (15 min interval)");
}

// Handle extension icon click
chrome.action.onClicked.addListener(async () => {
  await openTaggleWindow();
});

// Handle keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "_execute_action") {
    await openTaggleWindow();
  }
});

// Function to open the fullscreen Taggle window
async function openTaggleWindow() {
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
    
    console.log("Taggle: Opened fullscreen window:", newWindow.id);
    
  } catch (error) {
    console.error("Taggle: Error opening window:", error);
  }
}


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab || !tab.id) return;

    let contextData = {};
    
    if (info.menuItemId === "taggle-save-selection") {
      const selectedText = info.selectionText || "";
      if (!selectedText.trim()) return;
      
      console.log("Taggle: Text context menu clicked, selected text:", selectedText.substring(0, 50) + "...");
      contextData = { 
        type: "text",
        selection: selectedText, 
        url: tab.url || "", 
        title: tab.title || "" 
      };
      
    } else if (info.menuItemId === "taggle-save-image") {
      const imageUrl = info.srcUrl || "";
      if (!imageUrl) return;
      
      console.log("Taggle: Image context menu clicked, image URL:", imageUrl);
      
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
        console.error("Taggle: Error fetching image:", fetchError);
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
    const channel = `taggle-picker-${Date.now()}`;
    await chrome.storage.local.set({ [channel]: contextData });

    console.log("Taggle: Data stored with channel:", channel);

    const window = await chrome.windows.create({
      url: chrome.runtime.getURL(`picker.html?ch=${encodeURIComponent(channel)}`),
      type: "popup",
      width: 420,
      height: 520
    });

    console.log("Taggle: Picker window created:", window.id);
  } catch (error) {
    console.error("Taggle: Error in context menu handler:", error);
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
