# Quick Test Guide - Image Generation

## Setup (One Time)
1. Get Gemini API key: https://aistudio.google.com/app/apikey
2. Click Noma extension icon
3. Paste key in "Gemini API Key" field
4. Click "Save Key"
5. Verify you see "✓ API key configured"

## Test 1: Simple Generation (No Tag)
1. Go to any webpage with a text input (e.g., Google Docs, Gmail compose)
2. Click in the text field
3. Type: `Create a cute cat wearing a wizard hat`
4. Press `Ctrl/⌘ + Space`
5. Wait 5-10 seconds
6. Image should appear!

## Test 2: With Tag Context
1. Create a tag: Click Noma icon → Type "TestTag" → Click "Create"
2. Right-click any text on a webpage → "Save to Noma" → Select "TestTag"
3. In a text field, type: `@TestTag Create an image based on this context`
4. Press `Ctrl/⌘ + Space`
5. Image generated with context!

## Test 3: Different Platforms
Try these platforms to see image insertion:
- ✅ Gmail compose (contentEditable - best)
- ✅ Google Docs (contentEditable - best)
- ✅ Notion (contentEditable - best)
- ⚠️ Twitter/X (textarea - clipboard/download)
- ⚠️ WhatsApp Web (textarea - clipboard/download)

## Troubleshooting

### "Please add your Gemini API key"
- Go to Noma settings and add your API key
- Make sure it starts with `AIza`

### Console shows error
- Open DevTools (F12) → Console tab
- Look for "Noma Image Gen:" messages
- Common errors:
  - 401: Invalid API key
  - 429: Rate limit (wait a moment)
  - 400: Prompt violates policy

### Image doesn't appear
- **ContentEditable fields**: Should work automatically
- **Textarea/Input**: Image copied to clipboard, try pasting (Ctrl/⌘ + V)
- **Fallback**: Check Downloads folder

## Expected Behavior
1. You type prompt starting with "Create"
2. Press Ctrl/⌘ + Space
3. Spinner appears
4. Toast: "Generating image with Gemini..."
5. Toast: "Inserting image..."
6. Toast: "Image generated successfully!"
7. Image appears in field (or downloads)

## Console Logs to Check
Open DevTools Console and look for:
```
Noma Image Gen: Detected 'Create' keyword, triggering image generation
Noma Image Gen: Generating image...
Noma Image Gen: API response received
Noma Image Gen: Image inserted successfully
```

If you see these, it's working! 🎉
