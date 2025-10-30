# Noma Nano Banana Image Generation

## Overview
Noma now supports **image generation** using the Gemini 2.0 Flash Exp model (Nano Banana) via the Gemini Developer API. This feature allows you to generate images directly in text input fields by combining tag context with natural language prompts.

## How It Works

### Basic Flow
1. **Select a tag** - Use `Ctrl/⌘ + Q` to open the tag selector and choose a tag (e.g., `@BirthdayPartyNotes`)
2. **Type your prompt** - Start your prompt with the keyword **"Create"** (case-insensitive)
3. **Generate** - Press `Ctrl/⌘ + Space` to trigger image generation
4. **Image appears** - The generated image is inserted directly into your input field

### Example Usage
```
@BirthdayPartyNotes Create a cute birthday invitation based on my notes
```

When you press `Ctrl/⌘ + Space`, Noma will:
- Extract the context from `@BirthdayPartyNotes`
- Send it along with your prompt to Gemini
- Generate an image
- Insert it into the current text field

## Setup

### 1. Get a Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key (starts with `AIza...`)

### 2. Configure Noma
1. Click the Noma extension icon
2. Find the "Gemini API Key" field
3. Paste your API key
4. Click "Save Key"

## Supported Input Types

### ✅ ContentEditable Elements
- **Best support** - Images are inserted as `<img>` tags directly
- Works in: Gmail compose, Notion, most rich text editors
- Images appear inline with proper formatting

### ⚠️ Textarea/Input Fields
- **Limited support** - Image is copied to clipboard
- You may need to manually paste (`Ctrl/⌘ + V`)
- Fallback: Image downloads automatically if clipboard fails

### Platforms Tested
- ✅ Gmail
- ✅ Notion
- ✅ Google Docs
- ✅ Slack
- ✅ Discord
- ⚠️ WhatsApp Web (clipboard paste required)
- ⚠️ Twitter/X (clipboard paste required)

## Keyword Detection

The system triggers image generation when your prompt starts with **"Create"** (case-insensitive):

✅ **Valid triggers:**
- `Create a logo...`
- `create an illustration...`
- `CREATE a poster...`

❌ **Won't trigger:**
- `Please create...` (doesn't start with "Create")
- `I want to create...` (doesn't start with "Create")

## Context Integration

### Text Context
Any text context from your tag is automatically included in the image generation prompt:
```
@RecipeNotes Create a beautiful food photo based on this recipe
```
The recipe text is sent as context to help generate a relevant image.

### Image Context (Editing Mode)
If your tag contains images (e.g., from Pinterest boards), they're sent as reference images:
```
@KitchenInspo Create a similar kitchen but with blue cabinets
```
Gemini uses the reference images to understand style and composition.

## Technical Details

### API Model
- **Model**: `gemini-2.0-flash-exp`
- **Endpoint**: Google Generative Language API
- **Authentication**: API key (stored locally in Chrome storage)

### Image Format
- **Output**: Base64-encoded PNG/JPEG
- **Watermark**: All generated images include SynthID watermark (automatic)
- **Size**: Optimized for web display

### Privacy
- API key stored locally in Chrome storage
- No data sent to Noma servers
- All requests go directly to Google's API

## Troubleshooting

### "Please add your Gemini API key"
- Go to Noma settings and add your API key
- Make sure it starts with `AIza`

### "Image generation service not loaded"
- Refresh the page
- Check browser console for errors

### Image doesn't appear
- **ContentEditable**: Should work automatically
- **Textarea**: Try pasting from clipboard (`Ctrl/⌘ + V`)
- **Fallback**: Check your Downloads folder

### API Errors
- **401 Unauthorized**: Invalid API key
- **429 Too Many Requests**: Rate limit exceeded, wait a moment
- **400 Bad Request**: Prompt may violate content policy

## Best Practices

### Prompt Writing
1. **Be descriptive**: "Create a photorealistic portrait of a cat wearing a wizard hat"
2. **Specify style**: "Create a minimalist logo for a coffee shop"
3. **Use context**: Let your tag provide the details, keep prompts focused

### Context Tips
- Use tags with rich text context for better results
- Pinterest boards work great as style references
- Notion pages with detailed descriptions help guide generation

### Performance
- Image generation takes 5-15 seconds
- Larger contexts may take longer
- Network speed affects response time

## Limitations

1. **No on-device processing**: Uses cloud API (not Gemini Nano on-device)
2. **Requires API key**: Free tier has rate limits
3. **Input field compatibility**: Some platforms may not support image insertion
4. **Content policy**: Subject to Google's content policies

## Future Enhancements

Potential improvements:
- Multi-turn editing (iterative refinement)
- Style transfer from multiple images
- Text overlay generation
- Custom aspect ratios
- Batch generation

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify API key is correctly configured
3. Test with a simple prompt first
4. Ensure you have an active internet connection
