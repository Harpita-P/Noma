# Pinterest Board Integration for Noma

## Overview
This integration allows you to connect public Pinterest boards to Noma tags via RSS feeds. Pin images are downloaded and cached as base64, ready to be passed to Gemini Nano via the Prompt API.

## Core Components

### 1. pinterest-service.js
Handles RSS feed fetching and image processing:
- **URL Resolution**: Resolves pin.it short links to full board URLs
- **Board Info Extraction**: Extracts username and board name from URLs
- **RSS Feed Parsing**: Fetches and parses Pinterest board RSS feeds
- **Image Processing**: Downloads pin images, compresses them (max 512px), and converts to base64
- **De-duplication**: Removes duplicate pins by URL

### 2. pinterest-sync.js
Manages board synchronization and storage:
- **Tag Management**: Creates, deletes, and syncs Pinterest tags
- **Context Storage**: Stores pins with base64 images in Chrome storage
- **Format for AI**: Formats pin data for AI consumption (text + images)
- **Storage Stats**: Tracks storage usage for cached images

### 3. Updated Files
- **storage.js**: Added Pinterest context integration to unified context retrieval
- **popup.html**: Added Pinterest integration UI (setup modal, tags list)
- **popup.js**: Added Pinterest event handlers and rendering functions
- **content.js**: Integrated Pinterest contexts with @tag system
- **manifest.json**: Added pinterest-service.js and pinterest-sync.js to web_accessible_resources

## Features

### RSS-Based Access (No API Key Required)
- Uses public Pinterest board RSS feeds
- No authentication or API keys needed
- Works with any public board

### Image Caching with Base64
- Downloads pin images during sync
- Compresses images to 512px max dimension (maintains aspect ratio)
- Converts to base64 and stores in Chrome storage
- Quality: 0.7 (good balance between size and quality)
- Ready for direct use with Gemini Nano Prompt API

### Pin Data Structure
Each pin stores:
```javascript
{
  id: "pin-url",
  title: "Pin title",
  link: "https://pinterest.com/pin/...",
  imageUrl: "https://i.pinimg.com/...", // original URL
  imageBase64: "data:image/jpeg;base64,...", // cached for Gemini
  description: "Pin description",
  createdAt: "2024-10-24T..."
}
```

### Smart De-duplication
- Removes duplicate pins by URL
- Ensures unique pins in each board

## Usage Flow

1. **Connect Board**:
   - User pastes Pinterest board URL (full or pin.it short link)
   - Enters tag name (e.g., "myDreamKitchen")
   - Clicks "Connect Pins"

2. **Sync Process**:
   - Resolves short URLs if needed
   - Fetches RSS feed from board
   - Downloads and compresses pin images
   - Converts images to base64
   - Stores pins with images in Chrome storage

3. **Use in Prompts**:
   - Type `@myDreamKitchen` in any text field
   - Extension retrieves pin contexts with base64 images
   - Pass to Gemini Nano with both text and image data

## Storage Schema

### noma-pinterest-tags
Stores board configurations:
```javascript
{
  "tag-id": {
    tagId: "tag-id",
    boardUrl: "https://pinterest.com/username/board",
    username: "username",
    boardName: "board-name",
    tagName: "myDreamKitchen",
    createdAt: "2024-10-24T...",
    lastSynced: "2024-10-24T...",
    pinCount: 25
  }
}
```

### noma-pinterest-contexts
Stores cached pins with base64 images:
```javascript
{
  "tag-id": [
    {
      id: "pin-url",
      title: "Modern Kitchen",
      link: "https://pinterest.com/pin/...",
      imageUrl: "https://i.pinimg.com/...",
      imageBase64: "data:image/jpeg;base64,...",
      description: "Beautiful white marble countertops",
      createdAt: "2024-10-24T..."
    }
  ]
}
```

## Technical Details

### RSS Feed Format
Pinterest boards expose RSS at: `https://www.pinterest.com/{username}/{board-name}.rss`

### Image Compression
- Max dimensions: 512x512px (maintains aspect ratio)
- Format: JPEG
- Quality: 0.7
- Typical size: 50-100KB per image

### Storage Considerations
- Chrome extension storage limit: 10MB
- Recommended: 20-50 pins per board
- Estimated: ~1-5MB per board with compressed images

### Error Handling
- Graceful fallback if RSS unavailable
- Skips pins with failed image downloads
- Logs errors without breaking sync

## Integration with Gemini Nano

Pinterest contexts include base64 images ready for Gemini Nano:

```javascript
// Context format passed to Gemini
{
  type: "pinterest",
  text: "Pin: Modern Kitchen\nDescription: ...\nLink: ...",
  imageBase64: "data:image/jpeg;base64,...", // Ready for Gemini
  title: "Modern Kitchen",
  url: "https://pinterest.com/pin/..."
}
```

## UI Components

### Integration Card
- Icon: 📌
- Status: "Not connected" / "Connected"
- Buttons: "Setup" / "Disconnect"

### Setup Modal
- Board URL input (accepts full URLs or pin.it links)
- Tag name input
- "Connect Pins" button
- Status messages with progress

### Tags List
- Shows connected boards with:
  - Tag name (@myDreamKitchen)
  - Board path (username/board-name)
  - Pin count and last sync time
  - Sync and Delete buttons

## Limitations

- **Public boards only**: RSS feeds only available for public boards
- **No real-time updates**: Manual sync required
- **Storage constraints**: Limited by Chrome's 10MB extension storage
- **Image quality**: Compressed to balance quality and storage

## Future Enhancements

- Automatic periodic sync
- Configurable image compression settings
- Pin filtering by keywords
- Multiple boards per tag
- Storage usage warnings

## Testing

To test the integration:

1. Find a public Pinterest board
2. Copy the board URL
3. Open Noma popup
4. Click "Setup" under Pinterest integration
5. Paste board URL and enter tag name
6. Click "Connect Pins"
7. Wait for sync to complete
8. Use `@tagName` in any text field
9. Verify pin contexts with images are retrieved

## Notes

- First sync may take 30-60 seconds depending on pin count
- Images are compressed on-the-fly during sync
- Storage usage can be checked via `PinterestSync.getStorageStats()`
- Pin images are stored as base64 for instant access
