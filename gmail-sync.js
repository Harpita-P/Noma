// gmail-sync.js
// Handles Gmail data synchronization and storage

class GmailSync {
  static GMAIL_TAGS_KEY = "taggle-gmail-tags"; // map: tagId -> gmail config
  static GMAIL_CONTEXTS_KEY = "taggle-gmail-contexts"; // map: tagId -> array of emails
  static GMAIL_SETTINGS_KEY = "taggle-gmail-settings"; // API keys and settings
  static SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes (Gmail has higher rate limits than Calendar)
  
  static syncTimer = null;
  static isInitialized = false;

  // Initialize the Gmail sync system
  static async initialize() {
    if (this.isInitialized) return;

    try {
      // Load Gmail settings
      const settings = await this.getGmailSettings();
      if (settings.clientId) {
        // Initialize Gmail service if we have credentials
        const initialized = await GmailService.initialize(settings.clientId);
        if (initialized) {
          console.log('Taggle: Gmail sync initialized');
          this.startPeriodicSync();
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Taggle: Failed to initialize Gmail sync:', error);
    }
  }

  // Get Gmail settings (API keys, etc.)
  static async getGmailSettings() {
    try {
      const { [this.GMAIL_SETTINGS_KEY]: settings = {} } = 
        await chrome.storage.local.get(this.GMAIL_SETTINGS_KEY);
      return settings;
    } catch (error) {
      console.error('Taggle: Error getting Gmail settings:', error);
      return {};
    }
  }

  // Save Gmail settings
  static async saveGmailSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.GMAIL_SETTINGS_KEY]: settings });
      console.log('Taggle: Gmail settings saved');
    } catch (error) {
      console.error('Taggle: Error saving Gmail settings:', error);
      throw error;
    }
  }

  // Create a Gmail-connected tag
  static async createGmailTag(tagName, gmailConfig) {
    try {
      // First create the regular tag
      const { createTag } = await import('./storage.js');
      const tag = await createTag(tagName);
      
      if (!tag) {
        throw new Error('Tag with that name already exists');
      }

      // Store Gmail configuration for this tag
      const { [this.GMAIL_TAGS_KEY]: gmailTags = {} } = 
        await chrome.storage.local.get(this.GMAIL_TAGS_KEY);
      
      gmailTags[tag.id] = {
        tagId: tag.id,
        tagName: tag.name,
        type: 'recent', // Only recent emails supported
        maxResults: gmailConfig.maxResults || 5,
        autoSync: gmailConfig.autoSync !== false, // default true
        lastSynced: null,
        createdAt: new Date().toISOString(),
        ...gmailConfig
      };

      await chrome.storage.local.set({ [this.GMAIL_TAGS_KEY]: gmailTags });

      // Do initial sync
      await this.syncGmailTag(tag.id);

      console.log(`Taggle: Created Gmail tag @${tag.name}`);
      return tag;

    } catch (error) {
      console.error('Taggle: Error creating Gmail tag:', error);
      throw error;
    }
  }

  // Get all Gmail tags
  static async getGmailTags() {
    try {
      const { [this.GMAIL_TAGS_KEY]: gmailTags = {} } = 
        await chrome.storage.local.get(this.GMAIL_TAGS_KEY);
      return gmailTags;
    } catch (error) {
      console.error('Taggle: Error getting Gmail tags:', error);
      return {};
    }
  }

  // Check if a tag is a Gmail tag
  static async isGmailTag(tagId) {
    const gmailTags = await this.getGmailTags();
    return !!gmailTags[tagId];
  }

  // Sync a specific Gmail tag
  static async syncGmailTag(tagId) {
    try {
      const gmailTags = await this.getGmailTags();
      const gmailConfig = gmailTags[tagId];
      
      if (!gmailConfig) {
        console.warn(`Taggle: No Gmail config found for tag ${tagId}`);
        return;
      }

      if (!GmailService.isSignedIn()) {
        console.warn('Taggle: Not signed in to Gmail, skipping sync');
        console.log('Taggle: Gmail service initialized:', GmailService.isInitialized);
        console.log('Taggle: Gmail access token exists:', !!GmailService.accessToken);
        return;
      }

      console.log(`Taggle: Syncing Gmail tag @${gmailConfig.tagName}`);

      let emails = [];
      
      // Determine how many emails to fetch based on sync type
      const isInitialSync = !gmailConfig.lastSynced;
      const emailsToFetch = isInitialSync ? gmailConfig.maxResults : 5; // Initial: 50, Updates: 5
      
      console.log(`Taggle: ${isInitialSync ? 'Initial' : 'Update'} sync - fetching ${emailsToFetch} emails`);
      
      // Fetch emails
      emails = await GmailService.getRecentEmails(emailsToFetch);

      // Store Gmail contexts
      const { [this.GMAIL_CONTEXTS_KEY]: gmailContexts = {} } = 
        await chrome.storage.local.get(this.GMAIL_CONTEXTS_KEY);
      
      if (isInitialSync) {
        // Initial sync: replace all emails
        gmailContexts[tagId] = emails;
      } else {
        // Update sync: merge new emails with existing ones, keeping most recent 50
        const existingEmails = gmailContexts[tagId] || [];
        const mergedEmails = [...emails, ...existingEmails];
        
        // Remove duplicates by message ID and keep most recent 5
        const uniqueEmails = mergedEmails.filter((email, index, arr) => 
          arr.findIndex(e => e.id === email.id) === index
        ).slice(0, gmailConfig.maxResults);
        
        gmailContexts[tagId] = uniqueEmails;
      }
      
      await chrome.storage.local.set({ [this.GMAIL_CONTEXTS_KEY]: gmailContexts });

      // Update last synced time
      gmailTags[tagId].lastSynced = new Date().toISOString();
      await chrome.storage.local.set({ [this.GMAIL_TAGS_KEY]: gmailTags });

      console.log(`Taggle: Synced ${emails.length} emails for @${gmailConfig.tagName} (${isInitialSync ? 'initial' : 'update'})`);

    } catch (error) {
      console.error('Taggle: Failed to sync Gmail tag:', error);
      throw error;
    }
  }

  // Sync all Gmail tags
  static async syncAllGmailTags() {
    try {
      const gmailTags = await this.getGmailTags();
      const tagIds = Object.keys(gmailTags);
      
      if (tagIds.length === 0) {
        console.log('Taggle: No Gmail tags to sync');
        return;
      }

      console.log(`Taggle: Syncing ${tagIds.length} Gmail tags`);
      
      for (const tagId of tagIds) {
        const config = gmailTags[tagId];
        if (config.autoSync !== false) {
          try {
            await this.syncGmailTag(tagId);
            // Small delay between syncs to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Taggle: Failed to sync Gmail tag ${tagId}:`, error);
          }
        }
      }

      console.log('Taggle: Gmail sync completed');

    } catch (error) {
      console.error('Taggle: Failed to sync Gmail tags:', error);
    }
  }

  // Get Gmail contexts for a specific tag
  static async getGmailContexts(tagId) {
    try {
      const { [this.GMAIL_CONTEXTS_KEY]: gmailContexts = {} } = 
        await chrome.storage.local.get(this.GMAIL_CONTEXTS_KEY);
      return gmailContexts[tagId] || [];
    } catch (error) {
      console.error('Taggle: Error getting Gmail contexts:', error);
      return [];
    }
  }

  // Delete a Gmail tag
  static async deleteGmailTag(tagId) {
    try {
      // Remove from Gmail tags
      const { [this.GMAIL_TAGS_KEY]: gmailTags = {} } = 
        await chrome.storage.local.get(this.GMAIL_TAGS_KEY);
      delete gmailTags[tagId];
      await chrome.storage.local.set({ [this.GMAIL_TAGS_KEY]: gmailTags });

      // Remove from Gmail contexts
      const { [this.GMAIL_CONTEXTS_KEY]: gmailContexts = {} } = 
        await chrome.storage.local.get(this.GMAIL_CONTEXTS_KEY);
      delete gmailContexts[tagId];
      await chrome.storage.local.set({ [this.GMAIL_CONTEXTS_KEY]: gmailContexts });

      console.log(`Taggle: Deleted Gmail tag ${tagId}`);

    } catch (error) {
      console.error('Taggle: Error deleting Gmail tag:', error);
      throw error;
    }
  }

  // Start periodic sync
  static startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      try {
        console.log('Taggle: Starting periodic Gmail sync');
        await this.syncAllGmailTags();
      } catch (error) {
        console.error('Taggle: Periodic Gmail sync failed:', error);
      }
    }, this.SYNC_INTERVAL);

    console.log(`Taggle: Gmail periodic sync started (${this.SYNC_INTERVAL / 1000 / 60} minutes)`);
  }

  // Stop periodic sync
  static stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Taggle: Gmail periodic sync stopped');
    }
  }

  // Manual sync trigger
  static async manualSync() {
    try {
      console.log('Taggle: Manual Gmail sync triggered');
      await this.syncAllGmailTags();
      return true;
    } catch (error) {
      console.error('Taggle: Manual Gmail sync failed:', error);
      throw error;
    }
  }

  // Get sync status for all Gmail tags
  static async getSyncStatus() {
    try {
      const gmailTags = await this.getGmailTags();
      const status = {
        totalTags: Object.keys(gmailTags).length,
        lastSyncTimes: {},
        isSignedIn: GmailService.isSignedIn()
      };

      for (const [tagId, config] of Object.entries(gmailTags)) {
        status.lastSyncTimes[tagId] = {
          tagName: config.tagName,
          lastSynced: config.lastSynced,
          autoSync: config.autoSync
        };
      }

      return status;

    } catch (error) {
      console.error('Taggle: Error getting Gmail sync status:', error);
      return {
        totalTags: 0,
        lastSyncTimes: {},
        isSignedIn: false
      };
    }
  }

  // Format email for AI consumption
  static formatEmailForAI(email) {
    const parts = [];
    
    // Always include subject, even if it's "No Subject"
    parts.push(`Subject: ${email.subject || 'No Subject'}`);
    
    
    if (email.senderName && email.senderEmail) {
      parts.push(`From: ${email.senderName} <${email.senderEmail}>`);
    } else if (email.senderEmail) {
      parts.push(`From: ${email.senderEmail}`);
    }
    
    if (email.dateFormatted) {
      parts.push(`Date: ${email.dateFormatted}`);
    }
    
    if (email.bodyText) {
      parts.push(`Content: ${email.bodyText}`);
    } else if (email.snippet) {
      parts.push(`Preview: ${email.snippet}`);
    }
    
    if (email.isUnread) {
      parts.push(`Status: Unread`);
    }
    
    if (email.isImportant) {
      parts.push(`Priority: Important`);
    }
    
    return parts.join('\n');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GmailSync;
} else if (typeof window !== 'undefined') {
  window.GmailSync = GmailSync;
}
