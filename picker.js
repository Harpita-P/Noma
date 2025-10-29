import {
    getAllTags,
  addContext,
  createTag,
  getAllTagsWithContextCounts
}
from "./storage.js";
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
      transcriptionStatus: document.getElementById("transcription-status"),
      transcriptionMessage: document.getElementById("transcription-message"),
};
init();
async function init() {
      try {
            const tagsWithCounts = await getAllTagsWithContextCounts();
            els.hasTags.style.display = "";
            els.noTags.style.display = "none";
            let options = '<option value="__new__">+ Create new tag...</option>';
            if (tagsWithCounts.length > 0) {
                  options += tagsWithCounts.map(t => {
                        const counts = t.contextCounts || {
                    text: 0,
          pdf: 0,
          image: 0,
          calendar: 0,
          email: 0,
          total: 0
        };
                        const indicators = [];
                        if (t.isCalendarTag) {
                              indicators.push(`📅`);
        }
                else if (t.isGmailTag) {
                              indicators.push(`📧`);
        }
                else {
                              if (counts.text > 0) indicators.push(`📄${counts.text}`);
                              if (counts.pdf > 0) indicators.push(`📕${counts.pdf}`);
                              if (counts.image > 0) indicators.push(`🖼️${counts.image}`);
                              if (counts.audio > 0) indicators.push(`🎙️${counts.audio}`);
                              if (counts.calendar > 0) indicators.push(`📅${counts.calendar}`);
                              if (counts.email > 0) indicators.push(`📧${counts.email}`);
        }
                        const indicatorText = indicators.length > 0 ? ` (${indicators.join(' ')})` : '';
                        return `<option value="${t.id}">@${t.name}${indicatorText}</option>`;
      }).join("");
    }
            els.tagSelect.innerHTML = options;
            updatePreview();
            updateNewTagVisibility();
            els.tagSelect.onchange = () => {
                  updatePreview();
                  updateNewTagVisibility();
    };
            els.cancelBtn.onclick = () => window.close();
            els.saveBtn.onclick = onSave;
  }
    catch (error) {
            console.error("Error initializing picker:", error);
            els.noTags.style.display = "";
            els.hasTags.style.display = "none";
            els.noTags.innerHTML = `      <p class="muted">Error loading tags.</p>      <p>Please try reloading the extension.</p>      <div class="actions">        <button onclick="window.close()">Close</button>      </div>    `;
  }
}
function updatePreview() {
      const selectedValue = els.tagSelect.value;
      if (selectedValue === "__new__") {
            const newTagName = els.newTagName.value.trim();
            els.preview.textContent = newTagName ? `@${newTagName.replace(/^@+/, "")}` : "@newTag";
  }
    else {
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
            els.newTagName.oninput = updatePreview;
  }
    else {
            els.newTagInput.style.display = "none";
            els.newTagName.oninput = null;
  }
}
async function onSave() {
      try {
            if (!channel) return window.close();
            const storageObj = await chrome.storage.local.get(channel);
            let payload = storageObj[channel];
            if (!payload) return window.close();
            if (payload.type === "audio" && payload.pendingTranscription) {
                  els.transcriptionStatus.style.display = "";
                  els.transcriptionMessage.textContent = "🎙️ Transcribing audio...";
                  els.saveBtn.disabled = true;
                  try {
                        if (typeof AudioService === 'undefined') {
                              console.log('Picker: Loading audio service...');
                              await new Promise((resolve, reject) => {
                                    const script = document.createElement('script');
                                    script.src = chrome.runtime.getURL('audio-service.js');
                                    script.onload = () => {
                                          console.log('Picker: Audio service loaded');
                                          resolve();
            };
                                    script.onerror = (e) => {
                                          console.error('Picker: Failed to load audio service', e);
                                          reject(new Error('Failed to load audio service'));
            };
                                    document.head.appendChild(script);
          });
        }
                        console.log('Picker: Starting transcription...');
                        let result;
                        try {
                              result = await AudioService.transcribeFromUrl(payload.audioUrl);
        }
                catch (transcribeError) {
                              console.error('Picker: Transcription failed:', transcribeError);
                              throw new Error(`Transcription failed: ${transcribeError.message || 'Unknown error'}`);
        }
                        console.log('Picker: Transcription successful');
                        console.log('Picker: Transcription result:', result);
                        payload = {
                              type: 'audio',
                      transcription: result.transcription,
                      audioData: result.audioData,
                      filename: payload.filename || 'audio.m4a',
                      mimeType: result.mimeType,
                      size: result.size,
                      audioUrl: payload.audioUrl,
                      url: payload.audioUrl || '',
                      title: payload.filename || '',
                      pendingTranscription: false
        };
                        console.log('Picker: Updated payload:', payload);
                        els.transcriptionMessage.textContent = "✅ Transcription complete!";
                        els.saveBtn.disabled = false;
      }
            catch (error) {
                        console.error("Picker: Transcription error:", error);
                        console.error("Picker: Error stack:", error.stack);
                        const errorMsg = error.message.includes('not yet available') || error.message.includes('not yet supported')          ? '⚠️ Audio transcription not yet available. Saving audio file only.'          : `❌ ${error.message || 'Transcription failed'}`;
                        els.transcriptionMessage.textContent = errorMsg;
                        els.transcriptionMessage.style.color = '#ff6b6b';
                        els.saveBtn.disabled = false;
                        payload.transcription = '';
                          payload.transcriptionError = error.message || 'Unknown error';
                        payload.pendingTranscription = false;
      }
    }
            let tagId = els.tagSelect.value;
            if (tagId === "__new__") {
                  const newTagName = els.newTagName.value.trim();
                  if (!newTagName) {
                        els.newTagName.focus();
                        els.newTagName.style.borderColor = "#ff6b6b";
                        setTimeout(() => {
                              els.newTagName.style.borderColor = "";
        },
        2000);
                        return;
      }
                  els.saveBtn.textContent = "Creating...";
                  const newTag = await createTag(newTagName);
                  if (!newTag) {
                        els.saveBtn.textContent = "Tag exists!";
                        setTimeout(() => {
                              els.saveBtn.textContent = "Save";
        },
        2000);
                        return;
      }
                  tagId = newTag.id;
    }
            els.saveBtn.textContent = "Saving...";
            await addContext(tagId,
    payload);
            await chrome.storage.local.remove(channel);
            els.saveBtn.textContent = "Saved ✓";
            setTimeout(() => window.close(),
    350);
  }
    catch (error) {
            console.error("Error saving context:", error);
            els.saveBtn.textContent = "Error";
            setTimeout(() => {
                  els.saveBtn.textContent = "Save";
    },
    2000);
  }
}