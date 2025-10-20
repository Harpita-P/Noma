// gmail-service.js
// Gmail integration service using Chrome Identity API (Manifest V3 compatible)

class GmailService {
  static CLIENT_ID = null;
  static SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email'];
  static isInitialized = false;
  static accessToken = null;

  // Initialize the service
  static async initialize(clientId) {
    try {
      this.CLIENT_ID = clientId;
      this.isInitialized = true;
      
      console.log('Taggle: Gmail service initialized');
      return true;

    } catch (error) {
      console.error('Taggle: Failed to initialize Gmail service:', error);
      return false;
    }
  }

  // Check if user is signed in
  static isSignedIn() {
    return !!this.accessToken && this.isInitialized;
  }

  // Sign in using Chrome Identity API
  static async signIn() {
    if (!this.isInitialized) {
      throw new Error('Gmail service not initialized');
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

      // Use Chrome Identity API only (same as Calendar service)
      console.log('Taggle: Attempting Chrome Identity API sign-in for Gmail...');
      
      // Force a fresh token by clearing cache first
      try {
        await chrome.identity.clearAllCachedAuthTokens();
      } catch (clearError) {
        console.warn('Taggle: Could not clear all cached tokens:', clearError);
      }
      
      const token = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: this.SCOPES
      });

      if (token) {
        this.accessToken = typeof token === 'object' && token.token ? token.token : token;
        console.log('Taggle: Chrome Identity API Gmail sign-in successful');
        
        // Test the token with a simpler endpoint
        try {
          await this.apiRequest('users/me/profile');
          console.log('Taggle: Gmail token validation successful');
          return true;
        } catch (validationError) {
          console.warn('Taggle: Token validation failed, but continuing anyway:', validationError.message);
          // Don't throw error here - the token might still work for other operations
          return true;
        }
      }

      throw new Error('Failed to get access token from Chrome Identity API');

    } catch (error) {
      console.error('Taggle: Gmail sign-in failed:', error);
      
      // Provide helpful error messages
      if (error.message && error.message.includes('redirect_uri_mismatch')) {
        throw new Error(`Gmail OAuth redirect URI mismatch. Please add "${chrome.identity.getRedirectURL()}" to your Google Cloud Console OAuth client's authorized redirect URIs.`);
      } else if (error.message && error.message.includes('OAuth2 not granted or revoked')) {
        throw new Error('Gmail access was denied or revoked. Please try signing in again and grant the necessary permissions.');
      } else if (error.message && error.message.includes('The user did not approve access')) {
        throw new Error('Sign-in was cancelled. Please try again and approve access to Gmail.');
      } else if (error.message && error.message.includes('invalid_client')) {
        throw new Error('Invalid Google Client ID. Please check the OAuth configuration in the extension options.');
      } else {
        throw new Error(`Gmail sign-in failed: ${error.message}`);
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
          console.warn('Taggle: Could not revoke Gmail token:', revokeError);
        }
      }
      
      this.accessToken = null;
      console.log('Taggle: Gmail sign-out successful');
    } catch (error) {
      console.error('Taggle: Gmail sign-out failed:', error);
    }
  }

  // Make authenticated API request
  static async apiRequest(endpoint, params = {}) {
    if (!this.accessToken) {
      throw new Error('Not signed in to Gmail');
    }

    const url = new URL(`https://www.googleapis.com/gmail/v1/${endpoint}`);
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
      throw new Error(`Gmail API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get recent emails
  static async getRecentEmails(maxResults = 5) {
    try {
      console.log(`Taggle: Fetching ${maxResults} recent emails`);
      
      // Get list of message IDs
      const response = await this.apiRequest('users/me/messages', {
        maxResults: maxResults,
        q: 'in:inbox' // Only inbox emails
      });

      const messages = response.messages || [];
      console.log(`Taggle: Found ${messages.length} recent emails`);

      if (messages.length === 0) {
        return [];
      }

      // Get full message details for each email
      const emails = [];
      for (const message of messages.slice(0, maxResults)) {
        try {
          const emailData = await this.apiRequest(`users/me/messages/${message.id}`, {
            format: 'full'
          });
          
          const formattedEmail = this.formatEmailForContext(emailData);
          if (formattedEmail) {
            emails.push(formattedEmail);
          }
        } catch (emailError) {
          console.warn('Taggle: Failed to fetch email details:', emailError);
        }
      }

      console.log(`Taggle: Successfully formatted ${emails.length} emails`);
      return emails;

    } catch (error) {
      console.error('Taggle: Failed to fetch recent emails:', error);
      throw error;
    }
  }


  // Format email data for storage as context
  static formatEmailForContext(emailData) {
    try {
      const headers = emailData.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('From');
      const to = getHeader('To');
      const subject = getHeader('Subject');
      const date = getHeader('Date');

      // Parse sender email and name
      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/) || [null, from, from];
      const senderName = fromMatch[1]?.trim().replace(/"/g, '') || '';
      const senderEmail = fromMatch[2]?.trim() || from;

      // Extract email body content for better context
      let bodyText = '';
      try {
        if (emailData.payload?.parts) {
          // Multi-part email
          for (const part of emailData.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              break;
            }
          }
        } else if (emailData.payload?.body?.data) {
          // Single part email
          bodyText = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        
        // Clean up body text - take first 500 characters
        if (bodyText) {
          bodyText = bodyText.replace(/\r?\n/g, ' ').trim().substring(0, 500);
        }
      } catch (bodyError) {
        console.warn('Taggle: Could not extract email body:', bodyError);
      }

      return {
        id: emailData.id,
        type: 'email',
        subject: subject || 'No Subject',
        senderName: senderName,
        senderEmail: senderEmail,
        recipient: to,
        date: date,
        dateFormatted: date ? new Date(date).toLocaleString() : '',
        snippet: emailData.snippet || '',
        bodyText: bodyText || emailData.snippet || '', // Use body text or fallback to snippet
        threadId: emailData.threadId,
        isUnread: emailData.labelIds?.includes('UNREAD') || false,
        isImportant: emailData.labelIds?.includes('IMPORTANT') || false,
        labels: emailData.labelIds || [],
        source: 'gmail',
        createdAt: new Date().toISOString(),
        lastSynced: new Date().toISOString()
      };
    } catch (error) {
      console.error('Taggle: Failed to format email:', error);
      return null;
    }
  }

  // Get user's Gmail profile info
  static async getUserInfo() {
    if (!this.accessToken) {
      throw new Error('Not signed in to Gmail');
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
          name: 'Gmail User',
          imageUrl: null
        };
      }
    } catch (error) {
      console.warn('Taggle: Failed to get user info, using fallback:', error);
      // Return fallback info so the UI still works
      return {
        email: 'Signed in user',
        name: 'Gmail User', 
        imageUrl: null
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GmailService;
} else if (typeof window !== 'undefined') {
  window.GmailService = GmailService;
}
