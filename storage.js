// storage.js
/* global chrome */
const TAGS_KEY = "taggle-tags";
const CTX_KEY  = "taggle-contexts"; // map: tagId -> array of context items
const FOLDERS_KEY = "taggle-folders"; // map: folderId -> { path, tagId, name }

const nowISO = () => new Date().toISOString();
const id12 = () => Math.random().toString(36).slice(2, 14);

export async function getAllTags() {
  try {
    const { [TAGS_KEY]: tags = [] } = await chrome.storage.local.get(TAGS_KEY);
    return tags;
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log("Taggle: Extension context invalidated, returning empty tags");
      return [];
    }
    throw error;
  }
}

export async function createTag(name) {
  const slug = name.replace(/\s+/g, "").replace(/^@+/, "");
  const tag = { id: id12(), name: slug, createdAt: nowISO() };
  const tags = await getAllTags();
  // prevent duplicates by name
  if (tags.some(t => t.name.toLowerCase() === slug.toLowerCase())) return null;
  tags.push(tag);
  await chrome.storage.local.set({ [TAGS_KEY]: tags });
  return tag;
}

export async function deleteTag(tagId) {
  const tags = await getAllTags();
  const filtered = tags.filter(t => t.id !== tagId);
  const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
  delete ctxMap[tagId];
  await chrome.storage.local.set({ [TAGS_KEY]: filtered, [CTX_KEY]: ctxMap });
}

export async function getContexts(tagId) {
  try {
    const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
    const regularContexts = ctxMap[tagId] || [];
    
    // Check if this is a calendar tag and merge calendar contexts
    try {
      if (typeof window !== 'undefined' && window.CalendarSync) {
        const isCalendarTag = await window.CalendarSync.isCalendarTag(tagId);
        if (isCalendarTag) {
          const calendarContexts = await window.CalendarSync.getCalendarContexts(tagId);
          // Convert calendar events to context format and merge
          const formattedCalendarContexts = calendarContexts.map(event => ({
            id: event.id,
            type: "calendar",
            text: window.CalendarSync.formatCalendarContextsForAI([event]),
            title: event.title,
            url: event.meetingLinks?.[0] || "",
            source: "google-calendar",
            createdAt: event.createdAt,
            calendarEvent: event // Store full event data
          }));
          return [...formattedCalendarContexts, ...regularContexts];
        }
      }
    } catch (calendarError) {
      console.warn("Taggle: Error fetching calendar contexts:", calendarError);
    }
    
    // Check if this is a Gmail tag and merge Gmail contexts
    try {
      if (typeof window !== 'undefined' && window.GmailSync) {
        const isGmailTag = await window.GmailSync.isGmailTag(tagId);
        if (isGmailTag) {
          const gmailContexts = await window.GmailSync.getGmailContexts(tagId);
          // Convert Gmail emails to context format and merge
          const formattedGmailContexts = gmailContexts.map(email => ({
            id: email.id,
            type: "email",
            text: window.GmailSync.formatEmailForAI(email),
            title: email.subject,
            url: "", // Gmail doesn't have direct URLs
            source: "gmail",
            createdAt: email.createdAt,
            emailData: email // Store full email data
          }));
          return [...formattedGmailContexts, ...regularContexts];
        }
      }
    } catch (gmailError) {
      console.warn("Taggle: Error fetching Gmail contexts:", gmailError);
    }
    
    // Check if this is a Notion tag and merge Notion contexts
    try {
      if (typeof window !== 'undefined' && window.NotionSync) {
        const isNotionTag = await window.NotionSync.isNotionTag(tagId);
        if (isNotionTag) {
          const notionContexts = await window.NotionSync.getNotionContexts(tagId);
          // Convert Notion pages to context format and merge
          const formattedNotionContexts = notionContexts.map(page => ({
            id: page.id,
            type: "notion",
            text: window.NotionSync.formatNotionContentForAI([page]),
            title: page.title,
            url: `https://notion.so/${page.pageId}`,
            source: "notion",
            createdAt: page.createdAt,
            notionData: page // Store full page data
          }));
          return [...formattedNotionContexts, ...regularContexts];
        }
      }
    } catch (notionError) {
      console.warn("Taggle: Error fetching Notion contexts:", notionError);
    }
    
    // Check if this is a Pinterest tag and merge Pinterest contexts
    try {
      if (typeof window !== 'undefined' && window.PinterestSync) {
        const isPinterestTag = await window.PinterestSync.isPinterestTag(tagId);
        if (isPinterestTag) {
          const pinterestContexts = await window.PinterestSync.getPinterestContexts(tagId);
          // Convert Pinterest pins to context format and merge
          const formattedPinterestContexts = pinterestContexts.map(pin => ({
            id: pin.id,
            type: "pinterest",
            text: window.PinterestSync.formatPinterestContentForAI([pin], false).text,
            title: pin.title,
            url: pin.link,
            source: "pinterest",
            createdAt: pin.createdAt,
            imageBase64: pin.imageBase64, // Store base64 image for Gemini
            pinterestData: pin // Store full pin data
          }));
          return [...formattedPinterestContexts, ...regularContexts];
        }
      }
    } catch (pinterestError) {
      console.warn("Taggle: Error fetching Pinterest contexts:", pinterestError);
    }
    
    return regularContexts;
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log("Taggle: Extension context invalidated, returning empty contexts");
      return [];
    }
    throw error;
  }
}

export async function addContext(tagId, contextData) {
  const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
  
  let item;
  if (contextData.type === "image") {
    item = { 
      id: id12(), 
      type: "image",
      imageUrl: contextData.imageUrl,
      imageData: contextData.imageData,
      mimeType: contextData.mimeType,
      url: contextData.url || "", 
      title: contextData.title || "", 
      createdAt: nowISO() 
    };
  } else if (contextData.type === "audio") {
    item = { 
      id: id12(), 
      type: "audio",
      audioUrl: contextData.audioUrl,
      transcription: contextData.transcription || "",
      audioData: contextData.audioData,
      mimeType: contextData.mimeType,
      size: contextData.size,
      transcriptionError: contextData.transcriptionError,
      url: contextData.url || "", 
      title: contextData.title || "", 
      createdAt: nowISO() 
    };
  } else {
    // Default to text context for backward compatibility
    item = { 
      id: id12(), 
      type: "text",
      text: contextData.text || contextData.selection, 
      url: contextData.url || "", 
      title: contextData.title || "", 
      source: contextData.source || "web", // Track source (web, pdf-upload, etc.)
      createdAt: nowISO() 
    };
  }
  
  ctxMap[tagId] = ctxMap[tagId] || [];
  ctxMap[tagId].unshift(item); // newest first
  await chrome.storage.local.set({ [CTX_KEY]: ctxMap });
  return item;
}

export async function updateContext(tagId, contextId, updates) {
  const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
  
  if (!ctxMap[tagId]) {
    return null;
  }
  
  const contextIndex = ctxMap[tagId].findIndex(ctx => ctx.id === contextId);
  if (contextIndex === -1) {
    return null;
  }
  
  // Update the context with new properties
  ctxMap[tagId][contextIndex] = { ...ctxMap[tagId][contextIndex], ...updates };
  
  await chrome.storage.local.set({ [CTX_KEY]: ctxMap });
  return ctxMap[tagId][contextIndex];
}

// ---------- Context counting ----------
export async function getContextTypeCounts(tagId) {
  try {
    const contexts = await getContexts(tagId);
    const counts = {
      text: 0,
      pdf: 0,
      image: 0,
      audio: 0,
      calendar: 0,
      email: 0,
      notion: 0,
      pinterest: 0,
      total: contexts.length
    };

    contexts.forEach(ctx => {
      if (ctx.type === "image") {
        counts.image++;
      } else if (ctx.type === "audio") {
        counts.audio++;
      } else if (ctx.type === "calendar") {
        counts.calendar++;
      } else if (ctx.type === "email") {
        counts.email++;
      } else if (ctx.type === "notion") {
        counts.notion++;
      } else if (ctx.type === "pinterest") {
        counts.pinterest++;
      } else if (ctx.type === "text") {
        if (ctx.source === "pdf-upload" || (ctx.title && ctx.title.startsWith("PDF:"))) {
          counts.pdf++;
        } else {
          counts.text++;
        }
      }
    });

    return counts;
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log("Taggle: Extension context invalidated, returning empty counts");
      return { text: 0, pdf: 0, image: 0, audio: 0, calendar: 0, email: 0, notion: 0, pinterest: 0, total: 0 };
    }
    throw error;
  }
}

export async function getAllTagsWithContextCounts() {
  try {
    const tags = await getAllTags();
    const tagsWithCounts = [];

    // Get calendar tags to check which tags are calendar tags
    let calendarTags = {};
    try {
      const { 'taggle-calendar-tags': storedCalendarTags = {} } = await chrome.storage.local.get('taggle-calendar-tags');
      calendarTags = storedCalendarTags;
    } catch (error) {
      console.warn('Taggle: Could not load calendar tags:', error);
    }

    // Get Gmail tags to check which tags are Gmail tags
    let gmailTags = {};
    try {
      const { 'taggle-gmail-tags': storedGmailTags = {} } = await chrome.storage.local.get('taggle-gmail-tags');
      gmailTags = storedGmailTags;
    } catch (error) {
      console.warn('Taggle: Could not load Gmail tags:', error);
    }

    // Get Notion tags to check which tags are Notion tags
    let notionTags = {};
    try {
      const { 'taggle-notion-tags': storedNotionTags = {} } = await chrome.storage.local.get('taggle-notion-tags');
      notionTags = storedNotionTags;
    } catch (error) {
      console.warn('Taggle: Could not load Notion tags:', error);
    }

    // Get Pinterest tags to check which tags are Pinterest tags
    let pinterestTags = {};
    try {
      const { 'taggle-pinterest-tags': storedPinterestTags = {} } = await chrome.storage.local.get('taggle-pinterest-tags');
      pinterestTags = storedPinterestTags;
    } catch (error) {
      console.warn('Taggle: Could not load Pinterest tags:', error);
    }

    for (const tag of tags) {
      const counts = await getContextTypeCounts(tag.id);
      const isCalendarTag = !!calendarTags[tag.id];
      const isGmailTag = !!gmailTags[tag.id];
      const isNotionTag = !!notionTags[tag.id];
      const isPinterestTag = !!pinterestTags[tag.id];
      
      tagsWithCounts.push({
        ...tag,
        contextCounts: counts,
        isCalendarTag: isCalendarTag,
        isGmailTag: isGmailTag,
        isNotionTag: isNotionTag,
        isPinterestTag: isPinterestTag
      });
    }

    return tagsWithCounts;
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log("Taggle: Extension context invalidated, returning empty tags with counts");
      return [];
    }
    throw error;
  }
} 

// ---------- Folder management ----------
export async function getAllFolders() {
  const { [FOLDERS_KEY]: folders = {} } = await chrome.storage.local.get(FOLDERS_KEY);
  return folders;
}

export async function addFolderWatch(folderPath, tagId, folderName) {
  const folders = await getAllFolders();
  const folderId = id12();
  folders[folderId] = {
    id: folderId,
    path: folderPath,
    tagId: tagId,
    name: folderName || folderPath.split(/[/\\]/).pop(),
    createdAt: nowISO()
  };
  await chrome.storage.local.set({ [FOLDERS_KEY]: folders });
  return folders[folderId];
}

export async function removeFolderWatch(folderId) {
  const folders = await getAllFolders();
  delete folders[folderId];
  await chrome.storage.local.set({ [FOLDERS_KEY]: folders });
}

export async function getFoldersByTag(tagId) {
  const folders = await getAllFolders();
  return Object.values(folders).filter(folder => folder.tagId === tagId);
}
