// storage.js
/* global chrome */
const TAGS_KEY = "taggle-tags";
const CTX_KEY  = "taggle-contexts"; // map: tagId -> array of context items
const FOLDERS_KEY = "taggle-folders"; // map: folderId -> { path, tagId, name }

const nowISO = () => new Date().toISOString();
const id12 = () => Math.random().toString(36).slice(2, 14);

export async function getAllTags() {
  const { [TAGS_KEY]: tags = [] } = await chrome.storage.local.get(TAGS_KEY);
  return tags;
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
  const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
  return ctxMap[tagId] || [];
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
  } else {
    // Default to text context for backward compatibility
    item = { 
      id: id12(), 
      type: "text",
      text: contextData.text || contextData.selection, 
      url: contextData.url || "", 
      title: contextData.title || "", 
      createdAt: nowISO() 
    };
  }
  
  ctxMap[tagId] = ctxMap[tagId] || [];
  ctxMap[tagId].unshift(item); // newest first
  await chrome.storage.local.set({ [CTX_KEY]: ctxMap });
  return item;
}

// Folder management functions
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
