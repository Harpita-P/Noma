// calendar-sync.js
// Handles calendar data synchronization and storage

class CalendarSync {
  static CALENDAR_TAGS_KEY = "taggle-calendar-tags"; // map: tagId -> calendar config
  static CALENDAR_CONTEXTS_KEY = "taggle-calendar-contexts"; // map: tagId -> array of calendar events
  static CALENDAR_SETTINGS_KEY = "taggle-calendar-settings"; // API keys and settings
  static SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes (reduced API calls)
  
  static syncTimer = null;
  static isInitialized = false;

  // Initialize the calendar sync system
  static async initialize() {
    if (this.isInitialized) return;

    try {
      // Load calendar settings
      const settings = await this.getCalendarSettings();
      if (settings.clientId && settings.apiKey) {
        // Initialize calendar service if we have credentials
        const initialized = await CalendarService.initialize(settings.clientId, settings.apiKey);
        if (initialized) {
          console.log('Taggle: Calendar sync initialized');
          this.startPeriodicSync();
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Taggle: Failed to initialize calendar sync:', error);
    }
  }

  // Get calendar settings (API keys, etc.)
  static async getCalendarSettings() {
    try {
      const { [this.CALENDAR_SETTINGS_KEY]: settings = {} } = 
        await chrome.storage.local.get(this.CALENDAR_SETTINGS_KEY);
      return settings;
    } catch (error) {
      console.error('Taggle: Error getting calendar settings:', error);
      return {};
    }
  }

  // Save calendar settings
  static async saveCalendarSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.CALENDAR_SETTINGS_KEY]: settings });
      console.log('Taggle: Calendar settings saved');
    } catch (error) {
      console.error('Taggle: Error saving calendar settings:', error);
      throw error;
    }
  }

  // Create a calendar-connected tag
  static async createCalendarTag(tagName, calendarConfig) {
    try {
      // First create the regular tag
      const { createTag } = await import('./storage.js');
      const tag = await createTag(tagName);
      
      if (!tag) {
        throw new Error('Tag with that name already exists');
      }

      // Store calendar configuration for this tag
      const { [this.CALENDAR_TAGS_KEY]: calendarTags = {} } = 
        await chrome.storage.local.get(this.CALENDAR_TAGS_KEY);
      
      calendarTags[tag.id] = {
        tagId: tag.id,
        tagName: tag.name,
        type: calendarConfig.type || 'upcoming', // 'upcoming', 'today', 'custom'
        autoSync: calendarConfig.autoSync !== false, // default true
        lastSynced: null,
        createdAt: new Date().toISOString(),
        ...calendarConfig
      };

      await chrome.storage.local.set({ [this.CALENDAR_TAGS_KEY]: calendarTags });

      // Do initial sync
      await this.syncCalendarTag(tag.id);

      console.log(`Taggle: Created calendar tag @${tag.name}`);
      return tag;

    } catch (error) {
      console.error('Taggle: Error creating calendar tag:', error);
      throw error;
    }
  }

  // Get all calendar tags
  static async getCalendarTags() {
    try {
      const { [this.CALENDAR_TAGS_KEY]: calendarTags = {} } = 
        await chrome.storage.local.get(this.CALENDAR_TAGS_KEY);
      return calendarTags;
    } catch (error) {
      console.error('Taggle: Error getting calendar tags:', error);
      return {};
    }
  }

  // Check if a tag is a calendar tag
  static async isCalendarTag(tagId) {
    const calendarTags = await this.getCalendarTags();
    return !!calendarTags[tagId];
  }

  // Sync a specific calendar tag
  static async syncCalendarTag(tagId) {
    try {
      const calendarTags = await this.getCalendarTags();
      const calendarConfig = calendarTags[tagId];
      
      if (!calendarConfig) {
        console.warn(`Taggle: No calendar config found for tag ${tagId}`);
        return;
      }

      if (!CalendarService.isSignedIn()) {
        console.warn('Taggle: Not signed in to Google Calendar, skipping sync');
        return;
      }

      console.log(`Taggle: Syncing calendar tag @${calendarConfig.tagName}`);

      let events = [];
      
      // Fetch events based on tag type
      switch (calendarConfig.type) {
        case 'today':
          events = await CalendarService.getTodayEvents();
          break;
        case 'upcoming':
        default:
          events = await CalendarService.getUpcomingEvents();
          break;
      }

      // Format events for storage
      const formattedEvents = events.map(event => CalendarService.formatEventForContext(event));

      // Store calendar contexts
      const { [this.CALENDAR_CONTEXTS_KEY]: calendarContexts = {} } = 
        await chrome.storage.local.get(this.CALENDAR_CONTEXTS_KEY);
      
      calendarContexts[tagId] = formattedEvents;
      await chrome.storage.local.set({ [this.CALENDAR_CONTEXTS_KEY]: calendarContexts });

      // Update last synced time
      calendarTags[tagId].lastSynced = new Date().toISOString();
      await chrome.storage.local.set({ [this.CALENDAR_TAGS_KEY]: calendarTags });

      console.log(`Taggle: Synced ${formattedEvents.length} events for @${calendarConfig.tagName}`);

    } catch (error) {
      console.error(`Taggle: Error syncing calendar tag ${tagId}:`, error);
    }
  }

  // Get calendar contexts for a tag
  static async getCalendarContexts(tagId) {
    try {
      const { [this.CALENDAR_CONTEXTS_KEY]: calendarContexts = {} } = 
        await chrome.storage.local.get(this.CALENDAR_CONTEXTS_KEY);
      return calendarContexts[tagId] || [];
    } catch (error) {
      console.error('Taggle: Error getting calendar contexts:', error);
      return [];
    }
  }

  // Sync all calendar tags
  static async syncAllCalendarTags() {
    try {
      const calendarTags = await this.getCalendarTags();
      const tagIds = Object.keys(calendarTags).filter(tagId => 
        calendarTags[tagId].autoSync !== false
      );

      console.log(`Taggle: Syncing ${tagIds.length} calendar tags`);

      for (const tagId of tagIds) {
        await this.syncCalendarTag(tagId);
        // Small delay between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('Taggle: Error syncing all calendar tags:', error);
    }
  }

  // Start periodic sync
  static startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (CalendarService.isSignedIn()) {
        await this.syncAllCalendarTags();
      }
    }, this.SYNC_INTERVAL);

    console.log('Taggle: Started periodic calendar sync');
  }

  // Stop periodic sync
  static stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Taggle: Stopped periodic calendar sync');
    }
  }

  // Delete a calendar tag
  static async deleteCalendarTag(tagId) {
    try {
      // Remove from calendar tags
      const { [this.CALENDAR_TAGS_KEY]: calendarTags = {} } = 
        await chrome.storage.local.get(this.CALENDAR_TAGS_KEY);
      delete calendarTags[tagId];
      await chrome.storage.local.set({ [this.CALENDAR_TAGS_KEY]: calendarTags });

      // Remove calendar contexts
      const { [this.CALENDAR_CONTEXTS_KEY]: calendarContexts = {} } = 
        await chrome.storage.local.get(this.CALENDAR_CONTEXTS_KEY);
      delete calendarContexts[tagId];
      await chrome.storage.local.set({ [this.CALENDAR_CONTEXTS_KEY]: calendarContexts });

      console.log(`Taggle: Deleted calendar tag ${tagId}`);

    } catch (error) {
      console.error('Taggle: Error deleting calendar tag:', error);
      throw error;
    }
  }

  // Get formatted context text for AI usage
  static formatCalendarContextsForAI(events) {
    if (!events || events.length === 0) {
      return "No calendar events found.";
    }

    const eventTexts = events.map(event => {
      const parts = [];
      
      // Title and time
      parts.push(`**${event.title}**`);
      if (event.startTimeFormatted && event.endTimeFormatted) {
        parts.push(`Time: ${event.startTimeFormatted} - ${event.endTimeFormatted}`);
      }
      
      // Description
      if (event.description) {
        parts.push(`Description: ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}`);
      }
      
      // Location
      if (event.location) {
        parts.push(`Location: ${event.location}`);
      }
      
      // Attendees
      if (event.attendees) {
        parts.push(`Attendees: ${event.attendees}`);
      }
      
      // Meeting links
      if (event.meetingLinks && event.meetingLinks.length > 0) {
        parts.push(`Meeting Link: ${event.meetingLinks[0]}`);
      }
      
      return parts.join('\n');
    });

    return eventTexts.join('\n\n---\n\n');
  }

  // Manual sync trigger
  static async manualSync() {
    try {
      if (!CalendarService.isSignedIn()) {
        throw new Error('Not signed in to Google Calendar');
      }

      await this.syncAllCalendarTags();
      return true;
    } catch (error) {
      console.error('Taggle: Manual sync failed:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarSync;
} else if (typeof window !== 'undefined') {
  window.CalendarSync = CalendarSync;
}
