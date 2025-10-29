
<img width="1920" height="1080" alt="taggle" src="https://github.com/user-attachments/assets/309c9037-52f0-44d9-97b9-ec865a73e3db" />

**Noma** is a browser-native AI layer that sits in your cursor. Right-click to capture **text**, **images**, or **short audio** from any page, or pull structured data from connected apps (**Notion, Gmail, Pinterest, Calendar**). Noma turns that context into portable **tags** and injects them into your AI prompt **inline** - so you can paste answers directly where you work.

By default, Noma runs **on-device** with **Gemini Nano**. If the context is too large for Nano (≈ **30,000+ characters**), Noma uses **RAG** backed by an **OpenAI embedding model** to retrieve only the most relevant pieces before sending the final prompt.

### Controls

- `Ctrl/⌘ + Q` - Open Tag selector 
- `Ctrl/⌘ + Space` - Pass "Context + Prompt" into Gemini Nano 

- Highlight text (on the web) + click on the Noma spinner - Saves temporary context to be used with the immediate tag

- Click on the Noma Logo on the Tag selector - Opens Noma extension settings 

### Quick Start

```bash
git clone https://github.com/Harpita-P/Noma.git
cd Noma-main
# Chrome → Extensions → Developer mode → Load unpacked → select /dist
