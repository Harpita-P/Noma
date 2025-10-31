# Testing Noma

Noma is an **unpublished Chrome extension**, so testing requires a local installation. Follow the steps below to get started.

---

## Installation

### 1. Get the Code

**Option A: Clone the Repository**
```bash
git clone https://github.com/Harpita-P/Noma.git
cd Noma
```

**Option B: Download ZIP**
1. Go to [github.com/Harpita-P/Noma](https://github.com/Harpita-P/Noma)
2. Click the green **Code** button
3. Select **Download ZIP**
4. Extract the ZIP file to a folder

### 2. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the Noma folder
5. The Noma extension should now be active! Save some context to your first tag, and try it out.

---
## You Can Now Begin Using Noma!

## Required API Keys

To unlock Noma's full capabilities, you'll need to configure API keys in the extension settings:

<img src="Images/Noma%20Settings.png" alt="Noma Settings" width="500"/>

### OpenAI API Key
- **Purpose**: Enables RAG (semantic search) for large contexts (25k+ characters)
- **Get it**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Setup**: Click Noma icon → Settings → Paste key in "OpenAI API Key" field → Save

### Gemini Developer API Key
- **Purpose**: Enables text-to-image generation via the `Create` keyword & audio transcription
- **Get it**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Setup**: Click Noma icon → Settings → Paste key in "Gemini API Key" field → Save
- **Note**: Requires billing enabled for image generation

---

## Basic Usage

**Creating Tags**

To create a tag, or save context to an existing tag, right-click on any selected text / image / audio file and click Save to Tag. To save PDFs, go to Noma icon → Settings → Connect Document.

<img src="NomaTagDemo.gif" alt="Noma Tag Demo" width="600"/>

**How to Use Noma While You Work:**

Press `Ctrl + Q` to open Tag Selector anywhere, pick a `@tag`, type your prompt, then press `Ctrl + Space` to hit Enter. Keyboard commands are the same for Mac/Windows. You can also just type `@yourTagName` instead of selecting it via the Tag Selector.

### Tag Format
All Noma prompts follow this structure:
```
@tagName Your Prompt
```

### Text Generation (Client Side)
```
@myResearchNotes Give my friend a summary of the papers I read today
@RoomDecorIdeas Write a blog post about my best room decor pics from my Pinterest board
```
Press `Ctrl/⌘ + Space` to generate a text response using Gemini Nano via the Multimodal Prompt API.

### Image Generation (Server Side Text-to-Image)
To generate images, use the **`Create`** keyword right after a @tag:
```
@DesignNotes Create a modern logo for my coffee shop based on all my ideas
```
Press `Ctrl/⌘ + Space` to generate an image using Gemini 2.5 Flash Image via the Gemini Developer API.

<img src="PawsofHope.gif" alt="Paws of Hope Demo" width="600"/>

---

## Integration Setup

Noma supports linking data from **Notion**, **Gmail**, **Pinterest**, and **Google Calendar**. Go to **Settings → Integrations** to connect your apps.

### Notion
1. Create an integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Copy the **Integration Token** (starts with `secret_`)
3. Share your target Notion page with the integration
4. In Noma Settings → Click "Setup" under Notion
5. Paste Integration Token and Page URL
6. Enter a tag name (e.g., `myNotion`)
7. Click "Save & Connect"
8. "Sync" to refresh data

**Usage:**
```
@myNotion Summarize my project notes
```

### Pinterest
**Note**: Only **public boards** are supported (no login required). Private boards are not accessible in this mode.

1. Copy a public Pinterest board URL (e.g., `https://pinterest.com/username/board-name`)
2. In Noma Settings → Click "Setup" under Pinterest
3. Paste the board URL
4. Enter a tag name (e.g., `myDreamKitchen`)
5. Click "Connect Pins"
6. "Sync" to refresh data 

**Usage:**
```
@myDreamKitchen Describe a kitchen design inspired by these pins
```

### Google Calendar & Gmail (OAuth)
**Important**: Since Noma is an unpublished app, you'll need to provide your own **Google Client ID** if you want to create a tag for your calendar or emails.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google Calendar API** and **Gmail API**
4. Create OAuth 2.0 credentials (**Chrome extension**)
5. Add authorized redirect URI: `https://<your-extension-id>.chromiumapp.org/`
6. Copy the **Client ID**
7. In Noma Settings → Paste Client ID → Click "Save"
8. Click "Connect" for Calendar or Gmail
9. Sign in via OAuth authentication


## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Q` | Open tag selector |
| `Ctrl + Space` | Generate response (text or image) |

