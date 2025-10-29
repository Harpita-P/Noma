class PinterestSync {
      constructor() {
            this.PINTEREST_TAGS_KEY = 'noma-pinterest-tags';
            this.PINTEREST_CONTEXTS_KEY = 'noma-pinterest-contexts';
            this.pinterestService = null;
  }
      async initialize() {
            try {
                  if (typeof PinterestService !== 'undefined') {
                        this.pinterestService = new PinterestService();
      }
                  return true;
    }
        catch (error) {
                  console.error('Failed to initialize Pinterest sync:', error);
                  return false;
    }
  }
      async createPinterestTag(tagId,
  boardUrl,
  tagName) {
            try {
                  if (!this.pinterestService) {
                        await this.initialize();
      }
                  const pinterestTags = await this.getAllPinterestTags();
                  let fullUrl = boardUrl;
                  if (boardUrl.includes('pin.it/')) {
                        fullUrl = await this.pinterestService.resolveShortUrl(boardUrl);
      }
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
                  await chrome.storage.local.set({
                [this.PINTEREST_TAGS_KEY]: pinterestTags
      });
                  await this.syncPinterestTag(tagId);
                  return {
                success: true,
        pinterestTag: pinterestTags[tagId]
      };
    }
        catch (error) {
                  console.error('Error creating Pinterest tag:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async getAllPinterestTags() {
            const {
            [this.PINTEREST_TAGS_KEY]: pinterestTags = {}
    }
        =      await chrome.storage.local.get(this.PINTEREST_TAGS_KEY);
            return pinterestTags;
  }
      async isPinterestTag(tagId) {
            const pinterestTags = await this.getAllPinterestTags();
            return !!pinterestTags[tagId];
  }
      async deletePinterestTag(tagId) {
            const pinterestTags = await this.getAllPinterestTags();
            delete pinterestTags[tagId];
            await chrome.storage.local.set({
            [this.PINTEREST_TAGS_KEY]: pinterestTags
    });
            const contexts = await this.getAllPinterestContexts();
            delete contexts[tagId];
            await chrome.storage.local.set({
            [this.PINTEREST_CONTEXTS_KEY]: contexts
    });
  }
      async getAllPinterestContexts() {
            const {
            [this.PINTEREST_CONTEXTS_KEY]: contexts = {}
    }
        =      await chrome.storage.local.get(this.PINTEREST_CONTEXTS_KEY);
            return contexts;
  }
      async getPinterestContexts(tagId) {
            const allContexts = await this.getAllPinterestContexts();
            return allContexts[tagId] || [];
  }
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
                        return {
                    success: false,
          error: 'Pinterest tag not found'
        };
      }
                  const result = await this.pinterestService.fetchBoardPins(pinterestTag.boardUrl);
                  if (!result.success) {
                        return {
                    success: false,
          error: result.error
        };
      }
                  const uniquePins = this.pinterestService.deduplicatePins(result.pins);
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
                  await chrome.storage.local.set({
                [this.PINTEREST_CONTEXTS_KEY]: allContexts
      });
                  pinterestTag.lastSynced = new Date().toISOString();
                  pinterestTag.pinCount = uniquePins.length;
                  pinterestTags[tagId] = pinterestTag;
                  await chrome.storage.local.set({
                [this.PINTEREST_TAGS_KEY]: pinterestTags
      });
                  return {
                          success: true,
                  pinCount: uniquePins.length,
                  contexts: allContexts[tagId]
      };
    }
        catch (error) {
                  console.error('Error syncing Pinterest tag:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async syncAllPinterestTags() {
            try {
                  const pinterestTags = await this.getAllPinterestTags();
                  const results = [];
                  for (const tagId of Object.keys(pinterestTags)) {
                        const result = await this.syncPinterestTag(tagId);
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
                  console.error('Error syncing all Pinterest tags:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      formatPinterestContentForAI(contexts,
  includeImages = true) {
            if (!contexts || contexts.length === 0) {
                  return {
                text: '',
        images: []
      };
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
      async getStorageStats() {
            try {
                  const contexts = await this.getAllPinterestContexts();
                  let totalSize = 0;
                  let totalPins = 0;
                  for (const tagId in contexts) {
                        const pins = contexts[tagId];
                        totalPins += pins.length;
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
    }
        catch (error) {
                  console.error('Error getting storage stats:', error);
                  return {
                totalPins: 0,
        totalSizeBytes: 0,
        totalSizeMB: '0.00'
      };
    }
  }
}
if (typeof window !== 'undefined') {
      window.PinterestSync = new PinterestSync();
}
if (typeof module !== 'undefined' && module.exports) {
      module.exports = PinterestSync;
}