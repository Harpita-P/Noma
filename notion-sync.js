// Notion Sync Service
/* global chrome */

class NotionSync {
  constructor() {
    this.NOTION_TAGS_KEY = 'noma-notion-tags';
    this.NOTION_CONTEXTS_KEY = 'noma-notion-contexts';
    this.NOTION_SETTINGS_KEY = 'noma-notion-settings';
    this.SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
    this.syncIntervalId = null;
    this.notionService = null;
  }

  /**
   * Initialize Notion service with stored token
   */
  async initialize() {
    try {
      const settings = await this.getSettings();
      if (settings.token) {
        // Dynamically import NotionService
        if (typeof NotionService !== 'undefined') {
          this.notionService = new NotionService();
          await this.notionService.initialize(settings.token);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize Notion sync:', error);
      return false;
    }
  }

  /**
   * Get Notion settings
   */
  async getSettings() {
    const { [this.NOTION_SETTINGS_KEY]: settings = {} } = 
      await chrome.storage.local.get(this.NOTION_SETTINGS_KEY);
    return settings;
  }

  /**
   * Save Notion settings
   */
  async saveSettings(settings) {
    await chrome.storage.local.set({ [this.NOTION_SETTINGS_KEY]: settings });
  }

  /**
   * Test Notion connection
   */
  async testConnection(token) {
    try {
      const tempService = new NotionService();
      const result = await tempService.initialize(token);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a Notion tag
   * @param {string} tagId - The tag ID to associate with
   * @param {string} pageId - Notion page ID or URL
   * @param {string} tagName - Name for the tag
   */
  async createNotionTag(tagId, pageId, tagName) {
    try {
      const notionTags = await this.getAllNotionTags();
      
      // Extract clean page ID
      const cleanPageId = this.notionService.extractPageId(pageId);
      
      notionTags[tagId] = {
        tagId: tagId,
        pageId: cleanPageId,
        tagName: tagName,
        createdAt: new Date().toISOString(),
        lastSynced: null
      };

      await chrome.storage.local.set({ [this.NOTION_TAGS_KEY]: notionTags });
      
      // Immediately sync this tag
      await this.syncNotionTag(tagId);
      
      return { success: true, notionTag: notionTags[tagId] };
    } catch (error) {
      console.error('Error creating Notion tag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all Notion tags
   */
  async getAllNotionTags() {
    const { [this.NOTION_TAGS_KEY]: notionTags = {} } = 
      await chrome.storage.local.get(this.NOTION_TAGS_KEY);
    return notionTags;
  }

  /**
   * Check if a tag is a Notion tag
   */
  async isNotionTag(tagId) {
    const notionTags = await this.getAllNotionTags();
    return !!notionTags[tagId];
  }

  /**
   * Delete a Notion tag
   */
  async deleteNotionTag(tagId) {
    const notionTags = await this.getAllNotionTags();
    delete notionTags[tagId];
    await chrome.storage.local.set({ [this.NOTION_TAGS_KEY]: notionTags });

    // Also delete associated contexts
    const contexts = await this.getAllNotionContexts();
    delete contexts[tagId];
    await chrome.storage.local.set({ [this.NOTION_CONTEXTS_KEY]: contexts });
  }

  /**
   * Get all Notion contexts
   */
  async getAllNotionContexts() {
    const { [this.NOTION_CONTEXTS_KEY]: contexts = {} } = 
      await chrome.storage.local.get(this.NOTION_CONTEXTS_KEY);
    return contexts;
  }

  /**
   * Get Notion contexts for a specific tag
   */
  async getNotionContexts(tagId) {
    const allContexts = await this.getAllNotionContexts();
    return allContexts[tagId] || [];
  }

  /**
   * Sync a specific Notion tag
   */
  async syncNotionTag(tagId) {
    try {
      if (!this.notionService) {
        await this.initialize();
      }

      if (!this.notionService) {
        throw new Error('Notion service not initialized');
      }

      const notionTags = await this.getAllNotionTags();
      const notionTag = notionTags[tagId];

      if (!notionTag) {
        return { success: false, error: 'Notion tag not found' };
      }

      // Extract page content
      const result = await this.notionService.extractPageContent(notionTag.pageId);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Store the context
      const allContexts = await this.getAllNotionContexts();
      allContexts[tagId] = [{
        id: result.pageId,
        title: result.title,
        content: result.content,
        pageId: result.pageId,
        blockCount: result.blockCount,
        lastUpdated: result.lastUpdated,
        createdAt: new Date().toISOString()
      }];

      await chrome.storage.local.set({ [this.NOTION_CONTEXTS_KEY]: allContexts });

      // Update last synced time
      notionTag.lastSynced = new Date().toISOString();
      notionTags[tagId] = notionTag;
      await chrome.storage.local.set({ [this.NOTION_TAGS_KEY]: notionTags });

      return { success: true, context: allContexts[tagId][0] };
    } catch (error) {
      console.error('Error syncing Notion tag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all Notion tags
   */
  async syncAllNotionTags() {
    try {
      const notionTags = await this.getAllNotionTags();
      const results = [];

      for (const tagId of Object.keys(notionTags)) {
        const result = await this.syncNotionTag(tagId);
        results.push({ tagId, ...result });
      }

      return { success: true, results };
    } catch (error) {
      console.error('Error syncing all Notion tags:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format Notion content for AI consumption
   */
  formatNotionContentForAI(contexts) {
    if (!contexts || contexts.length === 0) {
      return '';
    }

    const context = contexts[0]; // We only store one context per Notion tag
    return `
=== Notion Page: ${context.title} ===
Last Updated: ${new Date(context.lastUpdated).toLocaleString()}
Blocks: ${context.blockCount}

Content:
${context.content}

===========================
`.trim();
  }

  /**
   * Start automatic sync
   */
  startAutoSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = setInterval(async () => {
      console.log('Noma: Running automatic Notion sync...');
      await this.syncAllNotionTags();
    }, this.SYNC_INTERVAL);

    console.log('Noma: Notion auto-sync started (15 min interval)');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Noma: Notion auto-sync stopped');
    }
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.NotionSync = new NotionSync();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotionSync;
}
