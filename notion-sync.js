class NotionSync {
      constructor() {
            this.NOTION_TAGS_KEY = 'noma-notion-tags';
            this.NOTION_CONTEXTS_KEY = 'noma-notion-contexts';
            this.NOTION_SETTINGS_KEY = 'noma-notion-settings';
            this.SYNC_INTERVAL = 15 * 60 * 1000;
              this.syncIntervalId = null;
            this.notionService = null;
  }
      async initialize() {
            try {
                  const settings = await this.getSettings();
                  if (settings.token) {
                        if (typeof NotionService !== 'undefined') {
                              this.notionService = new NotionService();
                              await this.notionService.initialize(settings.token);
        }
      }
                  return true;
    }
        catch (error) {
                  console.error('Failed to initialize Notion sync:', error);
                  return false;
    }
  }
      async getSettings() {
            const {
            [this.NOTION_SETTINGS_KEY]: settings = {}
    }
        =      await chrome.storage.local.get(this.NOTION_SETTINGS_KEY);
            return settings;
  }
      async saveSettings(settings) {
            await chrome.storage.local.set({
            [this.NOTION_SETTINGS_KEY]: settings
    });
  }
      async testConnection(token) {
            try {
                  const tempService = new NotionService();
                  const result = await tempService.initialize(token);
                  return result;
    }
        catch (error) {
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async createNotionTag(tagId,
  pageId,
  tagName) {
            try {
                  const notionTags = await this.getAllNotionTags();
                  const cleanPageId = this.notionService.extractPageId(pageId);
                  notionTags[tagId] = {
                        tagId: tagId,
                  pageId: cleanPageId,
                  tagName: tagName,
                  createdAt: new Date().toISOString(),
                  lastSynced: null
      };
                  await chrome.storage.local.set({
                [this.NOTION_TAGS_KEY]: notionTags
      });
                  await this.syncNotionTag(tagId);
                  return {
                success: true,
        notionTag: notionTags[tagId]
      };
    }
        catch (error) {
                  console.error('Error creating Notion tag:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async getAllNotionTags() {
            const {
            [this.NOTION_TAGS_KEY]: notionTags = {}
    }
        =      await chrome.storage.local.get(this.NOTION_TAGS_KEY);
            return notionTags;
  }
      async isNotionTag(tagId) {
            const notionTags = await this.getAllNotionTags();
            return !!notionTags[tagId];
  }
      async deleteNotionTag(tagId) {
            const notionTags = await this.getAllNotionTags();
            delete notionTags[tagId];
            await chrome.storage.local.set({
            [this.NOTION_TAGS_KEY]: notionTags
    });
            const contexts = await this.getAllNotionContexts();
            delete contexts[tagId];
            await chrome.storage.local.set({
            [this.NOTION_CONTEXTS_KEY]: contexts
    });
  }
      async getAllNotionContexts() {
            const {
            [this.NOTION_CONTEXTS_KEY]: contexts = {}
    }
        =      await chrome.storage.local.get(this.NOTION_CONTEXTS_KEY);
            return contexts;
  }
      async getNotionContexts(tagId) {
            const allContexts = await this.getAllNotionContexts();
            return allContexts[tagId] || [];
  }
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
                        return {
                    success: false,
          error: 'Notion tag not found'
        };
      }
                  const result = await this.notionService.extractPageContent(notionTag.pageId);
                  if (!result.success) {
                        return {
                    success: false,
          error: result.error
        };
      }
                  const allContexts = await this.getAllNotionContexts();
                  allContexts[tagId] = [{
                        id: result.pageId,
                  title: result.title,
                  content: result.content,
                  pageId: result.pageId,
                  blockCount: result.blockCount,
                  lastUpdated: result.lastUpdated,
                  createdAt: new Date().toISOString()
      }
            ];
                  await chrome.storage.local.set({
                [this.NOTION_CONTEXTS_KEY]: allContexts
      });
                  notionTag.lastSynced = new Date().toISOString();
                  notionTags[tagId] = notionTag;
                  await chrome.storage.local.set({
                [this.NOTION_TAGS_KEY]: notionTags
      });
                  return {
                success: true,
        context: allContexts[tagId][0]
      };
    }
        catch (error) {
                  console.error('Error syncing Notion tag:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async syncAllNotionTags() {
            try {
                  const notionTags = await this.getAllNotionTags();
                  const results = [];
                  for (const tagId of Object.keys(notionTags)) {
                        const result = await this.syncNotionTag(tagId);
                        results.push({
                    tagId,
          ...result
        });
      }
                  return {
                success: true,
        results
      };
    }
        catch (error) {
                  console.error('Error syncing all Notion tags:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      formatNotionContentForAI(contexts) {
            if (!contexts || contexts.length === 0) {
                  return '';
    }
            const context = contexts[0];
              return `=== Notion Page: ${context.title} ===Last Updated: ${new Date(context.lastUpdated).toLocaleString()}Blocks: ${context.blockCount}Content:${context.content}===========================`.trim();
  }
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
      stopAutoSync() {
            if (this.syncIntervalId) {
                  clearInterval(this.syncIntervalId);
                  this.syncIntervalId = null;
                  console.log('Noma: Notion auto-sync stopped');
    }
  }
}
if (typeof window !== 'undefined') {
      window.NotionSync = new NotionSync();
}
if (typeof module !== 'undefined' && module.exports) {
      module.exports = NotionSync;
}