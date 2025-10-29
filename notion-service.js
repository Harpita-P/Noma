class NotionService {
      constructor() {
            this.baseUrl = 'https://api.notion.com/v1';
            this.notionVersion = '2022-06-28';
            this.token = null;
  }
      async initialize(token) {
            this.token = token;
            try {
                  await this.testConnection();
                  return {
                success: true
      };
    }
        catch (error) {
                  console.error('Failed to initialize Notion service:', error);
                  return {
                success: false,
        error: error.message
      };
    }
  }
      async testConnection() {
            const response = await fetch(`${this.baseUrl}/users/me`, {
                  method: 'GET',
              headers: this.getHeaders()
    });
            if (!response.ok) {
                  throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }
            return await response.json();
  }
      getHeaders() {
            return {
                  'Authorization': `Bearer ${this.token}`,
              'Notion-Version': this.notionVersion,
              'Content-Type': 'application/json'
    };
  }
      extractPageId(pageUrlOrId) {
            if (pageUrlOrId.includes('notion.so') || pageUrlOrId.includes('notion.site')) {
                  const match = pageUrlOrId.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                  if (match) {
                        return match[1].replace(/-/g, '');
      }
    }
            return pageUrlOrId.replace(/-/g, '');
  }
      formatPageId(pageId) {
            const clean = pageId.replace(/-/g, '');
            return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
  }
      async getPage(pageId) {
            const formattedId = this.formatPageId(this.extractPageId(pageId));
            const response = await fetch(`${this.baseUrl}/pages/${formattedId}`, {
                  method: 'GET',
              headers: this.getHeaders()
    });
            if (!response.ok) {
                  const error = await response.json();
                  throw new Error(`Failed to fetch page: ${error.message || response.statusText}`);
    }
            return await response.json();
  }
      async getPageBlocks(pageId) {
            const formattedId = this.formatPageId(this.extractPageId(pageId));
            let allBlocks = [];
            let hasMore = true;
            let startCursor = undefined;
            while (hasMore) {
                  const url = new URL(`${this.baseUrl}/blocks/${formattedId}/children`);
                  if (startCursor) {
                        url.searchParams.append('start_cursor',
        startCursor);
      }
                  url.searchParams.append('page_size',
      '100');
                  const response = await fetch(url.toString(), {
                        method: 'GET',
                  headers: this.getHeaders()
      });
                  if (!response.ok) {
                        const error = await response.json();
                        throw new Error(`Failed to fetch blocks: ${error.message || response.statusText}`);
      }
                  const data = await response.json();
                  allBlocks = allBlocks.concat(data.results);
                  hasMore = data.has_more;
                  startCursor = data.next_cursor;
    }
            return allBlocks;
  }
      async getBlockChildren(blockId) {
            let allBlocks = [];
            let hasMore = true;
            let startCursor = undefined;
            while (hasMore) {
                  const url = new URL(`${this.baseUrl}/blocks/${blockId}/children`);
                  if (startCursor) {
                        url.searchParams.append('start_cursor',
        startCursor);
      }
                  url.searchParams.append('page_size',
      '100');
                  const response = await fetch(url.toString(), {
                        method: 'GET',
                  headers: this.getHeaders()
      });
                  if (!response.ok) {
                        return allBlocks;
      }
                  const data = await response.json();
                  allBlocks = allBlocks.concat(data.results);
                  hasMore = data.has_more;
                  startCursor = data.next_cursor;
    }
            return allBlocks;
  }
      extractRichText(richTextArray) {
            if (!richTextArray || !Array.isArray(richTextArray)) {
                  return '';
    }
            return richTextArray.map(text => text.plain_text || '').join('');
  }
      async extractBlockText(block) {
            let text = '';
            const type = block.type;
            switch (type) {
                  case 'paragraph':
        text = this.extractRichText(block.paragraph.rich_text);
                    break;
                  case 'heading_1':
        text = '# ' + this.extractRichText(block.heading_1.rich_text);
                    break;
                  case 'heading_2':
        text = '## ' + this.extractRichText(block.heading_2.rich_text);
                    break;
                  case 'heading_3':
        text = '### ' + this.extractRichText(block.heading_3.rich_text);
                    break;
                  case 'bulleted_list_item':
        text = '• ' + this.extractRichText(block.bulleted_list_item.rich_text);
                    break;
                  case 'numbered_list_item':
        text = '• ' + this.extractRichText(block.numbered_list_item.rich_text);
                    break;
                  case 'to_do':
        const checked = block.to_do.checked ? '[x]' : '[ ]';
                    text = `${checked} ${this.extractRichText(block.to_do.rich_text)}`;
                    break;
                  case 'toggle':
        text = this.extractRichText(block.toggle.rich_text);
                    break;
                  case 'quote':
        text = '> ' + this.extractRichText(block.quote.rich_text);
                    break;
                  case 'code':
        text = '```\n' + this.extractRichText(block.code.rich_text) + '\n```';
                    break;
                  case 'callout':
        text = this.extractRichText(block.callout.rich_text);
                    break;
                  case 'divider':
        text = '---';
                    break;
                  case 'table_row':
        if (block.table_row && block.table_row.cells) {
                          text = block.table_row.cells.map(cell => this.extractRichText(cell)).join(' | ');
      }
                    break;
                  default:
        if (block[type] && block[type].rich_text) {
                          text = this.extractRichText(block[type].rich_text);
      }
    }
            if (block.has_children) {
                  try {
                        const children = await this.getBlockChildren(block.id);
                        for (const child of children) {
                              const childText = await this.extractBlockText(child);
                              if (childText) {
                                    text += '\n  ' + childText;
          }
        }
      }
            catch (error) {
                        console.error('Error getting child blocks:', error);
      }
    }
            return text;
  }
      async extractPageContent(pageId) {
            try {
                  const page = await this.getPage(pageId);
                  let title = 'Untitled';
                  if (page.properties && page.properties.title) {
                        title = this.extractRichText(page.properties.title.title);
      }
            else if (page.properties) {
                        const nameProperty = Object.values(page.properties).find(prop => prop.type === 'title');
                        if (nameProperty && nameProperty.title) {
                              title = this.extractRichText(nameProperty.title);
        }
      }
                  const blocks = await this.getPageBlocks(pageId);
                  const textParts = [];
                  for (const block of blocks) {
                        const blockText = await this.extractBlockText(block);
                        if (blockText && blockText.trim()) {
                              textParts.push(blockText);
        }
      }
                  const fullText = textParts.join('\n\n');
                  return {
                        success: true,
                  title: title,
                  content: fullText,
                  pageId: this.extractPageId(pageId),
                  lastUpdated: new Date().toISOString(),
                  blockCount: blocks.length
      };
    }
        catch (error) {
                  console.error('Error extracting page content:', error);
                  return {
                        success: false,
                  error: error.message
      };
    }
  }
}
if (typeof window !== 'undefined') {
      window.NotionService = NotionService;
}
if (typeof module !== 'undefined' && module.exports) {
      module.exports = NotionService;
}