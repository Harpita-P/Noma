// picker.js
import { getAllTags, addContext, createTag, getAllTagsWithContextCounts } from "./storage.js";

const params = new URLSearchParams(location.search);
const channel = params.get("ch");

const els = {
  noTags: document.getElementById("no-tags"),
  hasTags: document.getElementById("has-tags"),
  tagSelect: document.getElementById("tag-select"),
  preview: document.getElementById("preview"),
  newTagInput: document.getElementById("new-tag-input"),
  newTagName: document.getElementById("new-tag-name"),
  saveBtn: document.getElementById("save"),
  cancelBtn: document.getElementById("cancel"),
  openOptions: document.getElementById("open-options"),
  closeBtn: document.getElementById("close"),
};

init();

async function init() {
  try {
    const tagsWithCounts = await getAllTagsWithContextCounts();
    
    // Always show the main interface (even with no tags, we can create new ones)
    els.hasTags.style.display = "";
    els.noTags.style.display = "none";

    // populate select - always start with "Create new tag" option
    let options = '<option value="__new__">+ Create new tag...</option>';
    if (tagsWithCounts.length > 0) {
      options += tagsWithCounts.map(t => {
        const counts = t.contextCounts || { text: 0, pdf: 0, image: 0, calendar: 0, email: 0, total: 0 };
        
        // Create indicators text
        const indicators = [];
        
        // If it's a dynamic tag, show appropriate emoji instead of numbered indicators
        if (t.isCalendarTag) {
          indicators.push(`📅`);
        } else if (t.isGmailTag) {
          indicators.push(`📧`);
        } else {
          // Show regular indicators for non-dynamic tags
          if (counts.text > 0) indicators.push(`📄${counts.text}`);
          if (counts.pdf > 0) indicators.push(`📕${counts.pdf}`);
          if (counts.image > 0) indicators.push(`🖼️${counts.image}`);
          if (counts.calendar > 0) indicators.push(`📅${counts.calendar}`);
          if (counts.email > 0) indicators.push(`📧${counts.email}`);
        }
        
        const indicatorText = indicators.length > 0 ? ` (${indicators.join(' ')})` : '';
        
        return `<option value="${t.id}">@${t.name}${indicatorText}</option>`;
      }).join("");
    }
    els.tagSelect.innerHTML = options;
    
    // Set initial state
    updatePreview();
    updateNewTagVisibility();

    els.tagSelect.onchange = () => {
      updatePreview();
      updateNewTagVisibility();
    };
    els.cancelBtn.onclick = () => window.close();
    els.saveBtn.onclick = onSave;
  } catch (error) {
    console.error("Error initializing picker:", error);
    // Show error state
    els.noTags.style.display = "";
    els.hasTags.style.display = "none";
    els.noTags.innerHTML = `
      <p class="muted">Error loading tags.</p>
      <p>Please try reloading the extension.</p>
      <div class="actions">
        <button onclick="window.close()">Close</button>
      </div>
    `;
  }
}

function updatePreview() {
  const selectedValue = els.tagSelect.value;
  if (selectedValue === "__new__") {
    const newTagName = els.newTagName.value.trim();
    els.preview.textContent = newTagName ? `@${newTagName.replace(/^@+/, "")}` : "@newTag";
  } else {
    const opt = els.tagSelect.options[els.tagSelect.selectedIndex];
    const label = opt ? opt.text : "@tag";
    els.preview.textContent = label;
  }
}

function updateNewTagVisibility() {
  const selectedValue = els.tagSelect.value;
  if (selectedValue === "__new__") {
    els.newTagInput.style.display = "";
    els.newTagName.focus();
    // Update preview when typing in new tag name
    els.newTagName.oninput = updatePreview;
  } else {
    els.newTagInput.style.display = "none";
    els.newTagName.oninput = null;
  }
}

async function onSave() {
  try {
    if (!channel) return window.close();
    
    const storageObj = await chrome.storage.local.get(channel);
    const payload = storageObj[channel];
    if (!payload) return window.close();

    let tagId = els.tagSelect.value;

    // Handle new tag creation
    if (tagId === "__new__") {
      const newTagName = els.newTagName.value.trim();
      if (!newTagName) {
        els.newTagName.focus();
        els.newTagName.style.borderColor = "#ff6b6b";
        setTimeout(() => {
          els.newTagName.style.borderColor = "";
        }, 2000);
        return;
      }

      els.saveBtn.textContent = "Creating...";
      const newTag = await createTag(newTagName);
      if (!newTag) {
        els.saveBtn.textContent = "Tag exists!";
        setTimeout(() => {
          els.saveBtn.textContent = "Save";
        }, 2000);
        return;
      }
      tagId = newTag.id;
    }

    els.saveBtn.textContent = "Saving...";
    await addContext(tagId, payload);

    // clean temp
    await chrome.storage.local.remove(channel);

    // tiny "saved" flash then close
    els.saveBtn.textContent = "Saved ✓";
    setTimeout(() => window.close(), 350);
  } catch (error) {
    console.error("Error saving context:", error);
    els.saveBtn.textContent = "Error";
    setTimeout(() => {
      els.saveBtn.textContent = "Save";
    }, 2000);
  }
}
