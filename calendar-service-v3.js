// calendar-service-v3.js
// Google Calendar integration service using Chrome Identity API (Manifest V3 compatible)

class CalendarService {
  static CLIENT_ID = null;
  static SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/userinfo.email'];
  static isInitialized = false;
  static accessToken = null;

  // Initialize the service
  static async initialize(clientId) {
    try {
      this.CLIENT_ID = clientId;
      this.isInitialized = true;
      
      console.log('Taggle: Calendar service initialized');
      return true;

    } catch (error) {
      console.error('Taggle: Failed to initialize calendar service:', error);
      return false;
    }
  }

  // Check if user is signed in
  static isSignedIn() {
    return !!this.accessToken;
  }

  // Sign in using Chrome Identity API
  static async signIn() {
    if (!this.isInitialized) {
      throw new Error('Calendar service not initialized');
    }

    try {
      // First, clear any existing cached tokens to get a fresh one
      if (this.accessToken) {
        try {
          await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
        } catch (clearError) {
          console.warn('Taggle: Could not clear cached token:', clearError);
        }
      }

      // Use Chrome's getAuthToken for simpler OAuth flow
      const token = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: this.SCOPES
      });

      if (!token) {
        throw new Error('No access token received');
      }

      // Extract the actual token string from the token object
      this.accessToken = typeof token === 'object' && token.token ? token.token : token;
      console.log('Taggle: Google Calendar sign-in successful, token type:', typeof token);
      console.log('Taggle: Token preview:', typeof this.accessToken === 'string' ? this.accessToken.substring(0, 20) + '...' : this.accessToken);
      console.log('Taggle: Granted scopes:', token.grantedScopes);
      
      // Test the token immediately
      try {
        await this.apiRequest('calendars/primary');
        console.log('Taggle: Token validation successful');
      } catch (testError) {
        console.error('Taggle: Token validation failed:', testError);
        throw new Error('Token validation failed: ' + testError.message);
      }
      
      return true;

    } catch (error) {
      console.error('Taggle: Google Calendar sign-in failed:', error);
      
      // If getAuthToken fails, try the manual OAuth flow as fallback
      try {
        console.log('Taggle: Trying manual OAuth flow...');
        
        const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
          `client_id=${this.CLIENT_ID}&` +
          `response_type=token&` +
          `scope=${encodeURIComponent(this.SCOPES)}&` +
          `redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}`;

        console.log('Taggle: Auth URL:', authUrl);
        console.log('Taggle: Redirect URL:', chrome.identity.getRedirectURL());

        const responseUrl = await chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        });

        console.log('Taggle: Response URL:', responseUrl);

        // Extract access token from response URL
        if (responseUrl && responseUrl.includes('#')) {
          const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
          this.accessToken = urlParams.get('access_token');
          
          if (this.accessToken) {
            console.log('Taggle: Manual OAuth successful');
            return true;
          }
        }
        
        throw new Error('No access token in response');
        
      } catch (fallbackError) {
        console.error('Taggle: Manual OAuth also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Sign out
  static async signOut() {
    try {
      if (this.accessToken) {
        // Use Chrome's removeCachedAuthToken to properly clear the token
        await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
        
        // Also revoke the token
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
            method: 'POST'
          });
        } catch (revokeError) {
          console.warn('Taggle: Could not revoke token:', revokeError);
        }
      }
      
      this.accessToken = null;
      console.log('Taggle: Google Calendar sign-out successful');
    } catch (error) {
      console.error('Taggle: Google Calendar sign-out failed:', error);
    }
  }

  // Make authenticated API request
  static async apiRequest(endpoint, params = {}) {
    if (!this.accessToken) {
      throw new Error('Not signed in to Google Calendar');
    }

    const url = new URL(`https://www.googleapis.com/calendar/v3/${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear it
        this.accessToken = null;
        throw new Error('Authentication expired. Please sign in again.');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get calendar events for the next 30 days
  static async getUpcomingEvents(maxResults = 100) {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const response = await this.apiRequest('calendars/primary/events', {
        timeMin: now.toISOString(),
        timeMax: thirtyDaysFromNow.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: maxResults,
        orderBy: 'startTime'
      });

      const events = response.items || [];
      
      // Filter to include meetings (made less strict for debugging)
      const meetings = events.filter(event => {
        const hasAttendees = event.attendees && event.attendees.length > 0; // Changed from > 1 to > 0
        const hasMeetingLink = event.hangoutLink || 
          (event.description && /(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)/i.test(event.description));
        const isBusy = !event.transparency || event.transparency !== 'transparent';
        const hasLocation = event.location && event.location.trim().length > 0;
        const hasTitle = event.summary && event.summary.trim().length > 0;
        
        // Include if it has any of these characteristics (more inclusive)
        return hasAttendees || hasMeetingLink || hasLocation || (isBusy && hasTitle);
      });
      
      console.log(`Taggle: Filtered ${events.length} total events to ${meetings.length} meetings`);
      if (events.length > 0 && meetings.length === 0) {
        console.log('Taggle: Sample event for debugging:', events[0]);
      }

      console.log(`Taggle: Retrieved ${meetings.length} meetings from ${events.length} total events`);
      return meetings;

    } catch (error) {
      console.error('Taggle: Failed to fetch calendar events:', error);
      throw error;
    }
  }

  // Get events for today specifically
  static async getTodayEvents() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const response = await this.apiRequest('calendars/primary/events', {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 50,
        orderBy: 'startTime'
      });

      const events = response.items || [];
      
      // Apply same improved meeting filter
      const meetings = events.filter(event => {
        const hasAttendees = event.attendees && event.attendees.length > 0; // Changed from > 1 to > 0
        const hasMeetingLink = event.hangoutLink || 
          (event.description && /(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)/i.test(event.description));
        const isBusy = !event.transparency || event.transparency !== 'transparent';
        const hasLocation = event.location && event.location.trim().length > 0;
        const hasTitle = event.summary && event.summary.trim().length > 0;
        
        // Include if it has any of these characteristics (more inclusive)
        return hasAttendees || hasMeetingLink || hasLocation || (isBusy && hasTitle);
      });
      
      console.log(`Taggle: Today - Filtered ${events.length} total events to ${meetings.length} meetings`);
      if (events.length > 0 && meetings.length === 0) {
        console.log('Taggle: Sample today event for debugging:', events[0]);
      }

      console.log(`Taggle: Retrieved ${meetings.length} meetings for today`);
      return meetings;

    } catch (error) {
      console.error('Taggle: Failed to fetch today\'s events:', error);
      throw error;
    }
  }

  // Format event data for storage as context
  static formatEventForContext(event) {
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;
    
    const startDate = startTime ? new Date(startTime) : null;
    const endDate = endTime ? new Date(endTime) : null;
    
    const attendees = event.attendees ? 
      event.attendees
        .filter(attendee => !attendee.self)
        .map(attendee => attendee.email)
        .join(', ') : '';

    const meetingLinks = [];
    if (event.hangoutLink) {
      meetingLinks.push(event.hangoutLink);
    }
    if (event.description) {
      const linkMatches = event.description.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g);
      if (linkMatches) {
        meetingLinks.push(...linkMatches.filter(link => 
          /(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)/i.test(link)
        ));
      }
    }

    return {
      id: event.id,
      type: 'calendar',
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      startTime: startDate ? startDate.toISOString() : null,
      endTime: endDate ? endDate.toISOString() : null,
      startTimeFormatted: startDate ? startDate.toLocaleString() : '',
      endTimeFormatted: endDate ? endDate.toLocaleString() : '',
      location: event.location || '',
      attendees: attendees,
      meetingLinks: meetingLinks,
      organizer: event.organizer?.email || '',
      status: event.status || 'confirmed',
      source: 'google-calendar',
      createdAt: new Date().toISOString(),
      lastSynced: new Date().toISOString()
    };
  }

  // Get user's calendar info
  static async getUserInfo() {
    if (!this.accessToken) {
      throw new Error('Not signed in to Google Calendar');
    }

    try {
      // Try to get user info from Google's userinfo endpoint
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        return {
          email: userInfo.email,
          name: userInfo.name,
          imageUrl: userInfo.picture
        };
      } else {
        // Fallback: return basic info if userinfo fails
        console.warn('Taggle: Could not get detailed user info, using fallback');
        return {
          email: 'Signed in user',
          name: 'Calendar User',
          imageUrl: null
        };
      }
    } catch (error) {
      console.warn('Taggle: Failed to get user info, using fallback:', error);
      // Return fallback info so the UI still works
      return {
        email: 'Signed in user',
        name: 'Calendar User', 
        imageUrl: null
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarService;
} else if (typeof window !== 'undefined') {
  window.CalendarService = CalendarService;
}
