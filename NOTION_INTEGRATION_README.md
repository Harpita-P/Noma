# Notion Integration for Noma

## Overview
Complete Notion integration that allows users to sync Notion page content and use it as context via @tags, following the same pattern as Calendar and Gmail integrations.

## Features
- ✅ **Token-based authentication** (simple integration token, no OAuth)
- ✅ **Page content extraction** - Extracts ALL text from any Notion page
- ✅ **Auto-sync** - Syncs every 15 minutes to keep content fresh
- ✅ **@tag integration** - Use `@myNotion` in any text field to include page content
- ✅ **Popup UI** - All settings accessible via popup (no separate options page)
- ✅ **Multiple pages** - Connect multiple Notion pages with different tags

## Files Created/Modified

### New Files
1. **notion-service.js** - Notion API client
   - Token-based authentication
   - Page ID extraction from URLs
   - Block content extraction (all block types)
   - Recursive nested block handling
   - Text formatting preservation

2. **notion-sync.js** - Synchronization service
   - Tag management (create, delete, list)
   - Auto-sync every 15 minutes
   - Context storage and retrieval
   - AI-formatted output

### Modified Files
1. **storage.js** - Added Notion context integration
   - Added "notion" type to context counts
   - Integrated Notion contexts in `getContexts()`
   - Track Notion tags in `getAllTagsWithContextCounts()`

2. **popup.html** - Added Notion UI
   - Notion integration item with status
   - Setup modal (token, page ID, tag name)
   - Notion tags list with sync/delete buttons

3. **popup.js** - Added Notion handlers
   - Setup/disconnect handlers
   - Tag creation and management
   - Sync functionality
   - Status updates

4. **content.js** - Added Notion service loading and context retrieval
   - Loads notion-service.js and notion-sync.js
   - Initializes NotionSync on page load
   - Added Notion context merging in `getContexts()` function
   - Added "notion" type to context counts
   - Formats Notion page content for AI prompts

5. **manifest.json** - Added Notion resources
   - Added notion-service.js and notion-sync.js to web_accessible_resources
   - Removed options_page (all settings now in popup)

## Setup Instructions

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Give it a name (e.g., "Noma")
4. Select the workspace
5. Copy the **Integration Token** (starts with `secret_`)

### 2. Share Page with Integration
1. Open the Notion page you want to sync
2. Click "Share" in the top right
3. Invite your integration by name
4. The integration now has access to that page

### 3. Connect in Noma
1. Open Noma popup (Alt+T)
2. Scroll to Integrations section
3. Click **Setup** on Notion integration
4. Enter:
   - **Integration Token**: Your secret token
   - **Page URL or ID**: Full Notion page URL or just the page ID
   - **Tag Name**: Name for your tag (e.g., "myNotion")
5. Click **Save & Connect**

### 4. Use Your Tag
Type `@myNotion` in any text field and press Ctrl/Cmd+Space to include the Notion page content in your AI prompt!

## Storage Schema

### noma-notion-settings
```javascript
{
  token: "secret_..." // Integration token
}
```

### noma-notion-tags
```javascript
{
  [tagId]: {
    tagId: "abc123",
    pageId: "32char-page-id",
    tagName: "myNotion",
    createdAt: "2025-01-21T00:00:00.000Z",
    lastSynced: "2025-01-21T00:15:00.000Z"
  }
}
```

### noma-notion-contexts
```javascript
{
  [tagId]: [{
    id: "page-id",
    title: "Page Title",
    content: "Full extracted text...",
    pageId: "page-id",
    blockCount: 42,
    lastUpdated: "2025-01-21T00:15:00.000Z",
    createdAt: "2025-01-21T00:00:00.000Z"
  }]
}
```

## Supported Block Types
- Paragraphs
- Headings (H1, H2, H3)
- Lists (bulleted, numbered)
- To-do items (with checked status)
- Toggles
- Quotes
- Code blocks
- Callouts
- Dividers
- Tables
- Nested blocks (recursive)

## API Details

### Notion API Version
- Using Notion API v2022-06-28
- Base URL: https://api.notion.com/v1

### Key Methods

#### NotionService
- `initialize(token)` - Initialize with integration token
- `extractPageContent(pageId)` - Get all text from a page
- `extractPageId(urlOrId)` - Parse page ID from URL
- `getPage(pageId)` - Get page metadata
- `getPageBlocks(pageId)` - Get all blocks from page

#### NotionSync
- `createNotionTag(tagId, pageId, tagName)` - Create new Notion tag
- `syncNotionTag(tagId)` - Sync specific tag
- `syncAllNotionTags()` - Sync all tags
- `deleteNotionTag(tagId)` - Delete tag and contexts
- `startAutoSync()` - Start 15-min auto-sync
- `stopAutoSync()` - Stop auto-sync

## Usage Flow

1. **User Setup**
   - User clicks "Setup" in popup
   - Enters token and page URL
   - System tests connection
   - Creates tag and syncs immediately

2. **Auto-Sync**
   - Every 15 minutes, syncs all Notion tags
   - Fetches latest page content
   - Updates stored contexts

3. **Context Retrieval**
   - User types `@myNotion` in text field
   - `storage.js` checks if it's a Notion tag
   - Fetches contexts from `NotionSync`
   - Formats for AI consumption
   - Includes in prompt

4. **Manual Sync**
   - User can click "Sync" button on any tag
   - Immediately fetches latest content
   - Updates display

## Error Handling
- Connection testing before saving credentials
- Graceful fallback if API fails
- Clear error messages in UI
- Automatic retry on sync failures

## Future Enhancements
- [ ] Database support (not just pages)
- [ ] Filter by date modified
- [ ] Selective block extraction
- [ ] Multiple page support per tag
- [ ] Rich text formatting preservation
- [ ] Image extraction from pages

## Notes
- Notion API has rate limits (3 requests/second)
- Large pages may take a few seconds to sync
- Nested blocks are fully supported
- Page must be shared with integration to access
- Token is stored locally in Chrome storage
