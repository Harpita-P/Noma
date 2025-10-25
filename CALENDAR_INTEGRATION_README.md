# Google Calendar Integration for Noma

This feature allows you to create dynamic tags that automatically sync with your Google Calendar events, providing calendar context when using @tag prompts.

## Setup Instructions

### 1. Get Google API Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins" (for testing, you can use `chrome-extension://your-extension-id`)
   - Copy the Client ID
   - **Optional**: Create an API Key if you want additional quota (Click "Create Credentials" > "API Key")

### 2. Configure Noma

1. Open Noma options page (right-click extension icon > Options)
2. Scroll to "Google Calendar Integration" section
3. Enter your Google Client ID (API Key is optional)
4. Click "Save Settings"
5. Click "Sign In to Google Calendar" and complete OAuth flow

### 3. Create Calendar Tags

1. In the calendar section, enter a tag name (e.g., "todayMeetings")
2. Choose tag type:
   - **Today's Meetings**: Only meetings for the current day
   - **Next 30 Days**: All meetings in the next 30 days
3. Click "Create Calendar Tag"

## Usage

### Using Calendar Tags in Prompts

Once you've created a calendar tag, you can use it in any text field:

```
@todayMeetings draft a summary email for my team about today's meetings
```

```
@upcomingMeetings what conflicts do I have this week?
```

```
@todayMeetings prepare talking points for my 2pm meeting
```

### What Data is Included

For each meeting, Noma provides:
- **Event Title**
- **Description** (if available)
- **Start/End Time** (with timezone)
- **Participants** (attendee emails)
- **Meeting Links** (Google Meet, Zoom, Teams, etc.)
- **Location** (if specified)

### Meeting Filtering

The system automatically filters calendar events to include only actual meetings:
- Events with multiple attendees
- Events with meeting links (Google Meet, Zoom, Teams)
- Events marked as "busy" with locations
- Excludes all-day events and personal reminders

## Sync Behavior

### Automatic Sync
- Calendar tags sync automatically every 15 minutes
- Sync occurs when you sign in to Google Calendar
- Rolling 30-day window is maintained automatically

### Manual Sync
- Use "Sync All" button in options to force immediate sync
- Individual calendar tags can be synced using their "Sync" button
- Sync status and last sync time are displayed for each tag

### Data Updates
- New meetings are automatically added
- Cancelled meetings are removed
- Updated meeting details are refreshed
- Time zone changes are handled automatically

## Privacy & Security

- Calendar data is stored locally in your browser
- No calendar data is sent to external servers (except Google's APIs)
- OAuth tokens are managed securely by Chrome
- You can revoke access anytime through Google Account settings

## Troubleshooting

### Common Issues

**"Sign-in failed" error:**
- Check that your Client ID and API Key are correct
- Ensure Google Calendar API is enabled in your project
- Verify OAuth consent screen is configured

**"No events found" for calendar tags:**
- Check that you have meetings (not just calendar events) in the selected time range
- Verify calendar permissions in Google Account settings
- Try manual sync to refresh data

**Calendar contexts not appearing in @tag prompts:**
- Ensure you're signed in to Google Calendar
- Check that the tag was created as a calendar tag (not regular tag)
- Verify recent sync in options page

### Debug Information

Check browser console for detailed error messages:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages starting with "Noma:"

## API Limits

Google Calendar API has usage limits:
- 1,000,000 requests per day
- 100 requests per 100 seconds per user

Normal usage should stay well within these limits, but if you experience rate limiting:
- Reduce sync frequency
- Limit number of calendar tags
- Contact Google Cloud Support for quota increases

## Examples

### Meeting Preparation
```
@todayMeetings create an agenda for my next meeting with action items from previous discussions
```

### Schedule Analysis
```
@upcomingMeetings analyze my meeting load this week and suggest time blocks for focused work
```

### Follow-up Tasks
```
@todayMeetings generate follow-up emails for each meeting I had today with key takeaways
```

### Conflict Resolution
```
@upcomingMeetings identify any scheduling conflicts and suggest solutions
```

## Advanced Configuration

### Custom Time Ranges
Currently supports "Today" and "Next 30 Days". Future versions may include:
- Custom date ranges
- Specific calendar selection
- Meeting type filtering

### Multiple Calendars
The integration currently uses your primary Google Calendar. Support for multiple calendars may be added in future updates.

## Support

For issues or feature requests:
1. Check the browser console for error messages
2. Verify your Google API setup
3. Test with a simple calendar tag first
4. Report issues with specific error messages and steps to reproduce
