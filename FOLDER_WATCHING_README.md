# Taggle Folder Watching Feature

This document describes the new folder watching feature that automatically extracts text from PDFs added to connected folders and saves them to associated tags.

## Overview

The folder watching feature allows users to:
1. Connect local folders to specific tags
2. Automatically monitor those folders for new PDF files
3. Extract text from new PDFs using the existing PDF extraction system
4. Save the extracted text to the associated tag

## How It Works

### Components

1. **FolderWatcher Class** (`folder-watcher.js`)
   - Manages folder monitoring and PDF processing
   - Uses the File System Access API for folder access
   - Scans folders every 30 seconds for new PDFs
   - Integrates with existing PDF extraction system

2. **Storage Extensions** (`storage.js`)
   - New functions for folder-tag mappings
   - `getAllFolders()`, `addFolderWatch()`, `removeFolderWatch()`, `getFoldersByTag()`

3. **UI Extensions** (`options.html`, `options.js`)
   - New section for connecting folders to tags
   - List of currently watched folders
   - Remove folder watches

### User Workflow

1. **Setup**: User goes to extension options page
2. **Connect Folder**: 
   - Select a tag from dropdown
   - Click "Connect Folder" button
   - Browser opens folder picker dialog
   - User selects folder to watch
3. **Automatic Processing**: 
   - Extension immediately scans folder every 2 seconds for first minute
   - Then continues scanning every 5 seconds for ongoing monitoring
   - When new PDFs are found, text is extracted within seconds
   - Extracted text is saved to the associated tag
   - Optional notification shows processing complete
   - Manual "Scan All Now" button for instant processing

## Technical Details

### File System Access API

- Uses modern `showDirectoryPicker()` API
- Requires user permission for each folder
- Only works in Chrome/Edge (Chromium-based browsers)
- Folder handles cannot persist across browser restarts (security limitation)

### PDF Processing

- Reuses existing `PDFExtractor` class
- Same text extraction logic as manual PDF upload
- Files are marked with source: 'folder-watch'
- Includes folder name in context title

### Storage Structure

```javascript
// Folder mapping storage
{
  "taggle-folders": {
    "folder123": {
      "id": "folder123",
      "path": "Documents/Research", // Display path
      "tagId": "tag456",
      "name": "Research",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Scanning Logic

- **Immediate Processing**: Scans every 2 seconds for the first minute after connecting a folder
- **Regular Monitoring**: Scans every 5 seconds for ongoing monitoring
- **Manual Trigger**: "Scan All Now" button for instant scanning
- Compares file `lastModified` timestamp with last scan time
- Only processes files newer than last scan
- Handles file access errors gracefully

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File System Access API | ✅ | ❌ | ❌ | ✅ |
| Folder Watching | ✅ | ❌ | ❌ | ✅ |

**Note**: This feature only works in Chromium-based browsers (Chrome, Edge) due to File System Access API requirements.

## Limitations

1. **Browser Restart**: Folder connections are lost when browser restarts (security limitation)
2. **Browser Support**: Only Chrome/Edge support the File System Access API
3. **Permission**: Users must grant folder access permission for each folder
4. **Scan Frequency**: Fixed 30-second scan interval (not configurable)
5. **File Types**: Only PDF files are processed automatically

## Security Considerations

- Uses read-only folder access
- Requires explicit user permission for each folder
- No persistent folder handles (cleared on restart)
- All processing happens locally in browser
- No data sent to external servers

## Error Handling

- Graceful degradation when File System API unavailable
- Clear error messages for permission issues
- Continues scanning other folders if one fails
- Logs errors to console for debugging

## Testing

Use `test-folder-feature.html` to verify:
- Storage functions work correctly
- FolderWatcher loads and initializes
- PDF extractor integration
- File System API availability

## Future Enhancements

Potential improvements:
- Configurable scan intervals
- Support for other file types (Word docs, text files)
- Batch processing status indicators
- Folder watch statistics
- Export/import folder configurations
