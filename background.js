// background.js
console.log("Taggle: Background script loaded");

// Initialize folder watching when extension starts
chrome.runtime.onStartup.addListener(async () => {
  console.log("Taggle: Extension startup - initializing folder watcher");
  // Note: Folder handles cannot be restored after browser restart
  // Users will need to reconnect folders after restart due to security restrictions
});

chrome.runtime.onInstalled.addListener(() => {
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
});

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
