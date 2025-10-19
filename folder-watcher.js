// folder-watcher.js
// Handles folder monitoring and automatic PDF extraction

class FolderWatcher {
  static watchedFolders = new Map(); // folderId -> { directoryHandle, tagId, lastScan }
  static isInitialized = false;
  static scanInterval = null;
  
  static async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        console.warn("Taggle: File System Access API not available");
        return false;
      }
      
      // Load existing folder watches from storage
      await this.loadWatchedFolders();
      
      // Start periodic scanning
      this.startPeriodicScan();
      
      this.isInitialized = true;
      console.log("Taggle: Folder watcher initialized");
      return true;
      
    } catch (error) {
      console.error("Taggle: Failed to initialize folder watcher:", error);
      return false;
    }
  }
  
  static async loadWatchedFolders() {
    try {
      // Check if we're in an extension context
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Use chrome storage directly
        const { 'taggle-folders': folders = {} } = await chrome.storage.local.get('taggle-folders');
        console.log(`Taggle: Found ${Object.keys(folders).length} folder configurations`);
      } else {
        // Try import for regular web context
        const { getAllFolders } = await import('./storage.js');
        const folders = await getAllFolders();
        console.log(`Taggle: Found ${Object.keys(folders).length} folder configurations`);
      }
      
    } catch (error) {
      console.error("Taggle: Error loading watched folders:", error);
    }
  }
  
  static async addFolderWatch(directoryHandle, tagId, folderName) {
    try {
      // Use chrome storage directly for better compatibility
      const id12 = () => Math.random().toString(36).slice(2, 14);
      const nowISO = () => new Date().toISOString();
      
      // Verify we have permission to read the directory
      const permission = await directoryHandle.queryPermission({ mode: 'read' });
      if (permission !== 'granted') {
        const newPermission = await directoryHandle.requestPermission({ mode: 'read' });
        if (newPermission !== 'granted') {
          throw new Error('Permission denied to access folder');
        }
      }
      
      // Store in database using chrome storage directly
      const { 'taggle-folders': folders = {} } = await chrome.storage.local.get('taggle-folders');
      const folderId = id12();
      const folderConfig = {
        id: folderId,
        path: directoryHandle.name,
        tagId: tagId,
        name: folderName || directoryHandle.name,
        createdAt: nowISO()
      };
      folders[folderId] = folderConfig;
      await chrome.storage.local.set({ 'taggle-folders': folders });
      
      // Add to active watchers with lastScan set to 0 initially
      this.watchedFolders.set(folderConfig.id, {
        directoryHandle,
        tagId,
        lastScan: 0, // Start with 0 so initial scan processes all files
        config: folderConfig
      });
      
      console.log(`Taggle: Added folder watch for ${directoryHandle.name} -> tag ${tagId}`);
      
      // Do immediate initial scan (process all existing files)
      await this.scanFolder(folderConfig.id, true); // true = initial scan
      
      // Update lastScan after initial scan is complete
      this.watchedFolders.get(folderConfig.id).lastScan = Date.now();
      
      // Start more frequent scanning for this folder initially (every 2 seconds for first minute)
      // Add small delay to avoid interference with initial scan
      setTimeout(() => {
        this.startIntensiveScanning(folderConfig.id);
      }, 1000);
      
      return folderConfig;
      
    } catch (error) {
      console.error("Taggle: Error adding folder watch:", error);
      throw error;
    }
  }
  
  static async removeFolderWatch(folderId) {
    try {
      // Clean up intensive scanning if active
      const watcher = this.watchedFolders.get(folderId);
      if (watcher && watcher.intensiveInterval) {
        clearInterval(watcher.intensiveInterval);
        console.log(`Taggle: Cleared intensive scanning for folder ${folderId}`);
      }
      
      // Remove from storage using chrome storage directly
      const { 'taggle-folders': folders = {} } = await chrome.storage.local.get('taggle-folders');
      delete folders[folderId];
      await chrome.storage.local.set({ 'taggle-folders': folders });
      
      // Remove from active watchers
      this.watchedFolders.delete(folderId);
      
      console.log(`Taggle: Removed folder watch ${folderId}`);
      
    } catch (error) {
      console.error("Taggle: Error removing folder watch:", error);
      throw error;
    }
  }
  
  static async scanFolder(folderId, isInitialScan = false) {
    const watcher = this.watchedFolders.get(folderId);
    if (!watcher) return;
    
    try {
      const scanType = isInitialScan ? 'initial scan of' : 'scanning';
      console.log(`Taggle: ${scanType} folder ${watcher.config.name} for PDFs`);
      
      const filesToProcess = [];
      
      // Scan directory for PDF files
      for await (const [name, handle] of watcher.directoryHandle.entries()) {
        if (handle.kind === 'file' && name.toLowerCase().endsWith('.pdf')) {
          try {
            const file = await handle.getFile();
            
            // For initial scan, process all files. For regular scans, only new files
            if (isInitialScan || file.lastModified > watcher.lastScan) {
              filesToProcess.push({ file, name });
            }
          } catch (fileError) {
            console.warn(`Taggle: Could not access file ${name}:`, fileError);
          }
        }
      }
      
      // Process PDF files
      if (filesToProcess.length > 0) {
        const fileType = isInitialScan ? 'existing' : 'new';
        console.log(`Taggle: Found ${filesToProcess.length} ${fileType} PDF(s) in ${watcher.config.name}`);
        
        for (const { file, name } of filesToProcess) {
          await this.processPDFFile(file, watcher.tagId, watcher.config.name);
        }
      }
      
      // Update last scan time
      watcher.lastScan = Date.now();
      
    } catch (error) {
      console.error(`Taggle: Error scanning folder ${folderId}:`, error);
    }
  }
  
  static async processPDFFile(file, tagId, folderName) {
    try {
      console.log(`Taggle: Processing PDF ${file.name} for tag ${tagId}`);
      
      // Load PDF extractor if not already loaded
      if (!window.PDFExtractor) {
        // Dynamically load PDF extractor
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('pdf-extractor.js');
        document.head.appendChild(script);
        
        // Wait for it to load
        let attempts = 0;
        while (!window.PDFExtractor && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.PDFExtractor) {
          throw new Error('PDF extractor failed to load');
        }
      }
      
      // Extract text from PDF
      const extractedText = await window.PDFExtractor.extractText(file);
      
      if (!extractedText.trim()) {
        console.warn(`Taggle: No text found in PDF ${file.name}`);
        return;
      }
      
      // Save to tag using chrome storage directly
      const id12 = () => Math.random().toString(36).slice(2, 14);
      const nowISO = () => new Date().toISOString();
      
      console.log(`Taggle: About to save context for tag ${tagId}:`, {
        type: 'text',
        textLength: extractedText.length,
        title: `PDF: ${file.name} (from ${folderName})`,
        url: `file://${file.name}`,
        source: 'folder-watch'
      });
      
      // Get existing contexts
      const { 'taggle-contexts': ctxMap = {} } = await chrome.storage.local.get('taggle-contexts');
      
      // Create new context item
      const contextItem = {
        id: id12(),
        type: 'text',
        text: extractedText,
        title: `PDF: ${file.name} (from ${folderName})`,
        url: `file://${file.name}`,
        source: 'folder-watch',
        createdAt: nowISO()
      };
      
      // Add to contexts
      ctxMap[tagId] = ctxMap[tagId] || [];
      ctxMap[tagId].unshift(contextItem); // newest first
      
      // Save back to storage
      await chrome.storage.local.set({ 'taggle-contexts': ctxMap });
      
      console.log(`Taggle: Successfully processed and saved PDF ${file.name}:`, contextItem);
      
      // Show notification if possible
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Taggle: PDF Processed', {
          body: `Extracted text from ${file.name} and added to tag`,
          icon: chrome.runtime.getURL('icon.png')
        });
      }
      
    } catch (error) {
      console.error(`Taggle: Error processing PDF ${file.name}:`, error);
    }
  }
  
  static startPeriodicScan() {
    // Scan every 5 seconds for more responsive detection
    this.scanInterval = setInterval(async () => {
      for (const folderId of this.watchedFolders.keys()) {
        await this.scanFolder(folderId);
      }
    }, 5000);
    
    console.log("Taggle: Started periodic folder scanning (5s interval)");
  }
  
  static stopPeriodicScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log("Taggle: Stopped periodic folder scanning");
    }
  }
  
  static startIntensiveScanning(folderId) {
    console.log(`Taggle: Starting intensive scanning for folder ${folderId}`);
    
    // Scan every 2 seconds for the first minute after connecting
    let scanCount = 0;
    const maxScans = 30; // 30 scans * 2 seconds = 1 minute
    
    const intensiveInterval = setInterval(async () => {
      await this.scanFolder(folderId);
      scanCount++;
      
      if (scanCount >= maxScans) {
        clearInterval(intensiveInterval);
        console.log(`Taggle: Intensive scanning completed for folder ${folderId}`);
      }
    }, 2000);
    
    // Store interval reference in case we need to clear it
    const watcher = this.watchedFolders.get(folderId);
    if (watcher) {
      watcher.intensiveInterval = intensiveInterval;
    }
  }
  
  static async requestFolderAccess() {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported in this browser');
      }
      
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      return directoryHandle;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Taggle: Folder selection cancelled by user");
        return null;
      }
      console.error("Taggle: Error requesting folder access:", error);
      throw error;
    }
  }
  
  static getWatchedFolders() {
    return Array.from(this.watchedFolders.entries()).map(([id, watcher]) => ({
      id,
      name: watcher.config.name,
      tagId: watcher.tagId,
      path: watcher.config.path,
      lastScan: watcher.lastScan
    }));
  }
  
  static async scanAllFoldersNow() {
    console.log("Taggle: Manual scan triggered for all folders");
    const promises = [];
    
    for (const folderId of this.watchedFolders.keys()) {
      promises.push(this.scanFolder(folderId, true)); // true = treat as initial scan to process all files
    }
    
    await Promise.all(promises);
    console.log("Taggle: Manual scan completed for all folders");
  }
  
  static async scanFolderNow(folderId) {
    console.log(`Taggle: Manual scan triggered for folder ${folderId}`);
    await this.scanFolder(folderId);
    console.log(`Taggle: Manual scan completed for folder ${folderId}`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FolderWatcher;
} else {
  window.FolderWatcher = FolderWatcher;
}
