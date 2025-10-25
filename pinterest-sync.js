// Pinterest Sync Service
/* global chrome */

class PinterestSync {
  constructor() {
    this.PINTEREST_TAGS_KEY = 'taggle-pinterest-tags';
    this.PINTEREST_CONTEXTS_KEY = 'taggle-pinterest-contexts';
    this.pinterestService = null;
  }

  /**
   * Initialize Pinterest service
   */
  async initialize() {
    try {
      if (typeof PinterestService !== 'undefined') {
        this.pinterestService = new PinterestService();
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize Pinterest sync:', error);
      return false;
    }
  }

  /**
   * Create a Pinterest tag
   * @param {string} tagId - The tag ID to associate with
   * @param {string} boardUrl - Pinterest board URL (full or pin.it)
   * @param {string} tagName - Name for the tag
   */
  async createPinterestTag(tagId, boardUrl, tagName) {
    try {
      if (!this.pinterestService) {
        await this.initialize();
      }

      const pinterestTags = await this.getAllPinterestTags();
      
      // Resolve short URL if needed
      let fullUrl = boardUrl;
      if (boardUrl.includes('pin.it/')) {
        fullUrl = await this.pinterestService.resolveShortUrl(boardUrl);
      }

      // Extract board info
      const boardInfo = this.pinterestService.extractBoardInfo(fullUrl);
      
      pinterestTags[tagId] = {
        tagId: tagId,
        boardUrl: fullUrl,
        username: boardInfo.username,
        boardName: boardInfo.boardName,
        tagName: tagName,
        createdAt: new Date().toISOString(),
        lastSynced: null
      };

      await chrome.storage.local.set({ [this.PINTEREST_TAGS_KEY]: pinterestTags });
      
      // Immediately sync this tag
      await this.syncPinterestTag(tagId);
      
      return { success: true, pinterestTag: pinterestTags[tagId] };
    } catch (error) {
      console.error('Error creating Pinterest tag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all Pinterest tags
   */
  async getAllPinterestTags() {
    const { [this.PINTEREST_TAGS_KEY]: pinterestTags = {} } = 
      await chrome.storage.local.get(this.PINTEREST_TAGS_KEY);
    return pinterestTags;
  }

  /**
   * Check if a tag is a Pinterest tag
   */
  async isPinterestTag(tagId) {
    const pinterestTags = await this.getAllPinterestTags();
    return !!pinterestTags[tagId];
  }

  /**
   * Delete a Pinterest tag
   */
  async deletePinterestTag(tagId) {
    const pinterestTags = await this.getAllPinterestTags();
    delete pinterestTags[tagId];
    await chrome.storage.local.set({ [this.PINTEREST_TAGS_KEY]: pinterestTags });

    // Also delete associated contexts
    const contexts = await this.getAllPinterestContexts();
    delete contexts[tagId];
    await chrome.storage.local.set({ [this.PINTEREST_CONTEXTS_KEY]: contexts });
  }

  /**
   * Get all Pinterest contexts
   */
  async getAllPinterestContexts() {
    const { [this.PINTEREST_CONTEXTS_KEY]: contexts = {} } = 
      await chrome.storage.local.get(this.PINTEREST_CONTEXTS_KEY);
    return contexts;
  }

  /**
   * Get Pinterest contexts for a specific tag
   */
  async getPinterestContexts(tagId) {
    const allContexts = await this.getAllPinterestContexts();
    return allContexts[tagId] || [];
  }

  /**
   * Sync a specific Pinterest tag
   */
  async syncPinterestTag(tagId) {
    try {
      if (!this.pinterestService) {
        await this.initialize();
      }

      if (!this.pinterestService) {
        throw new Error('Pinterest service not initialized');
      }

      const pinterestTags = await this.getAllPinterestTags();
      const pinterestTag = pinterestTags[tagId];

      if (!pinterestTag) {
        return { success: false, error: 'Pinterest tag not found' };
      }

      // Fetch board pins with images
      const result = await this.pinterestService.fetchBoardPins(pinterestTag.boardUrl);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // De-duplicate pins
      const uniquePins = this.pinterestService.deduplicatePins(result.pins);

      // Store the contexts
      const allContexts = await this.getAllPinterestContexts();
      allContexts[tagId] = uniquePins.map(pin => ({
        id: pin.link,
        title: pin.title,
        link: pin.link,
        imageUrl: pin.imageUrl,
        imageBase64: pin.imageBase64,
        description: pin.description,
        createdAt: new Date().toISOString()
      }));

      await chrome.storage.local.set({ [this.PINTEREST_CONTEXTS_KEY]: allContexts });

      // Update last synced time
      pinterestTag.lastSynced = new Date().toISOString();
      pinterestTag.pinCount = uniquePins.length;
      pinterestTags[tagId] = pinterestTag;
      await chrome.storage.local.set({ [this.PINTEREST_TAGS_KEY]: pinterestTags });

      return { 
        success: true, 
        pinCount: uniquePins.length,
        contexts: allContexts[tagId]
      };
    } catch (error) {
      console.error('Error syncing Pinterest tag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all Pinterest tags
   */
  async syncAllPinterestTags() {
    try {
      const pinterestTags = await this.getAllPinterestTags();
      const results = [];

      for (const tagId of Object.keys(pinterestTags)) {
        const result = await this.syncPinterestTag(tagId);
        results.push({ tagId, ...result });
      }

      return { success: true, results };
    } catch (error) {
      console.error('Error syncing all Pinterest tags:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format Pinterest content for AI consumption
   * @param {Array} contexts - Array of pin contexts
   * @param {boolean} includeImages - Whether to include base64 images
   * @returns {Object} - Formatted content with text and images
   */
  formatPinterestContentForAI(contexts, includeImages = true) {
    if (!contexts || contexts.length === 0) {
      return { text: '', images: [] };
    }

    const textParts = [`=== Pinterest Board (${contexts.length} pins) ===\n`];
    const images = [];

    contexts.forEach((pin, index) => {
      textParts.push(`Pin ${index + 1}: ${pin.title}`);
      if (pin.description) {
        textParts.push(`Description: ${pin.description}`);
      }
      textParts.push(`Link: ${pin.link}`);
      textParts.push('---');

      if (includeImages && pin.imageBase64) {
        images.push({
          title: pin.title,
          base64: pin.imageBase64,
          link: pin.link
        });
      }
    });

    textParts.push('===========================');

    return {
      text: textParts.join('\n'),
      images: images
    };
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const contexts = await this.getAllPinterestContexts();
      let totalSize = 0;
      let totalPins = 0;

      for (const tagId in contexts) {
        const pins = contexts[tagId];
        totalPins += pins.length;
        
        // Estimate size (base64 is roughly 1.33x original size)
        pins.forEach(pin => {
          if (pin.imageBase64) {
            totalSize += pin.imageBase64.length;
          }
        });
      }

      return {
        totalPins: totalPins,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalPins: 0, totalSizeBytes: 0, totalSizeMB: '0.00' };
    }
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.PinterestSync = new PinterestSync();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinterestSync;
}
