// options.js
import { getAllTags, createTag, deleteTag, getContexts, addContext, getAllTagsWithContextCounts } from "./storage.js";

const els = {
  name: document.getElementById("tag-name"),
  create: document.getElementById("create"),
  list: document.getElementById("list"),
  refresh: document.getElementById("refresh"),
  pdfFile: document.getElementById("pdf-file"),
  pdfTagSelect: document.getElementById("pdf-tag-select"),
  uploadPdf: document.getElementById("upload-pdf"),
  uploadStatus: document.getElementById("upload-status"),
};

els.create.onclick = onCreate;
els.refresh.onclick = render;
els.pdfFile.onchange = onPdfFileChange;
els.pdfTagSelect.onchange = onPdfTagChange;
els.uploadPdf.onclick = onUploadPdf;

// Load PDF extractor
const script = document.createElement('script');
script.src = 'pdf-extractor.js';
document.head.appendChild(script);

render();

async function onCreate() {
  const raw = (els.name.value || "").trim();
  if (!raw) return;
  const made = await createTag(raw.replace(/^@+/, ""));
  if (!made) {
    alert("A tag with that name already exists.");
  } else {
    els.name.value = "";
  }
  render();
}

async function render() {
  const tagsWithCounts = await getAllTagsWithContextCounts();
  
  // Update PDF tag selector
  updatePdfTagSelector(tagsWithCounts);
  
  if (!tagsWithCounts.length) {
    els.list.innerHTML = `<p class="muted">No tags yet. Create one above.</p>`;
    return;
  }

  const parts = [];
  for (const t of tagsWithCounts) {
    const ctx = await getContexts(t.id);
    const counts = t.contextCounts || { text: 0, pdf: 0, image: 0, total: 0 };
    
    // Create context type indicators
    const indicators = [];
    if (counts.text > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Text: ${counts.text}</span>
      </span>`);
    }
    if (counts.pdf > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">PDF: ${counts.pdf}</span>
      </span>`);
    }
    if (counts.image > 0) {
      indicators.push(`<span style="display: inline-flex; align-items: center; gap: 2px; margin-right: 8px;">
        <span style="width: 8px; height: 8px; background: #eab308; border-radius: 2px; display: inline-block;"></span>
        <span style="font-size: 11px;">Images: ${counts.image}</span>
      </span>`);
    }
    
    parts.push(`
      <div class="tag">
        <div>
          <b>@${t.name}</b> 
          <span class="muted">(${counts.total} contexts)</span>
          ${indicators.length > 0 ? `<br><div style="margin-top: 4px; display: flex; flex-wrap: wrap;">${indicators.join('')}</div>` : ''}
        </div>
        <div>
          <button data-del="${t.id}">Delete</button>
        </div>
      </div>
      <div class="contexts">
        ${ctx.map(c => `
          <div class="ctx">
            <div class="muted">${c.title ? c.title + " · " : ""}${c.url ? `<a href="${c.url}" target="_blank">${c.url}</a>` : ""}</div>
            ${c.type === 'image' ? 
              `<div><strong>Image:</strong> ${c.imageUrl || 'Uploaded image'}</div>` :
              escapeHtml(c.text || c.selection)
            }
          </div>
        `).join("")}
      </div>
    `);
  }

  els.list.innerHTML = parts.join("");

  // Hook up deletes
  els.list.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this tag and all its contexts?")) {
        await deleteTag(btn.dataset.del);
        render();
      }
    };
  });
}

// Update PDF tag selector dropdown
function updatePdfTagSelector(tags) {
  const options = ['<option value="">Select a tag...</option>'];
  tags.forEach(tag => {
    const counts = tag.contextCounts || { text: 0, pdf: 0, image: 0, total: 0 };
    const totalText = counts.total > 0 ? ` (${counts.total})` : '';
    options.push(`<option value="${tag.id}">@${tag.name}${totalText}</option>`);
  });
  els.pdfTagSelect.innerHTML = options.join('');
}

// Handle PDF file selection
function onPdfFileChange() {
  const file = els.pdfFile.files[0];
  updateUploadButton();
  
  if (file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    els.uploadStatus.textContent = `Selected: ${file.name} (${sizeInMB} MB)`;
  } else {
    els.uploadStatus.textContent = '';
  }
}

// Handle tag selection change
function onPdfTagChange() {
  updateUploadButton();
}

// Update upload button state
function updateUploadButton() {
  const hasFile = els.pdfFile.files.length > 0;
  const hasTag = els.pdfTagSelect.value !== '';
  els.uploadPdf.disabled = !(hasFile && hasTag);
}

// Handle PDF upload and extraction
async function onUploadPdf() {
  const file = els.pdfFile.files[0];
  const tagId = els.pdfTagSelect.value;
  
  if (!file || !tagId) {
    els.uploadStatus.textContent = 'Please select both a PDF file and a tag.';
    return;
  }
  
  try {
    els.uploadPdf.disabled = true;
    els.uploadStatus.textContent = 'Extracting text from PDF...';
    
    // Wait for PDF extractor to be available
    let attempts = 0;
    while (!window.PDFExtractor && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.PDFExtractor) {
      throw new Error('PDF extractor not loaded. Please refresh the page and try again.');
    }
    
    // Extract text from PDF
    const extractedText = await window.PDFExtractor.extractText(file);
    
    if (!extractedText.trim()) {
      throw new Error('No text found in PDF. This might be a scanned document.');
    }
    
    els.uploadStatus.textContent = 'Saving extracted text to tag...';
    
    // Save to tag as text context
    await addContext(tagId, {
      type: 'text',
      text: extractedText,
      title: `PDF: ${file.name}`,
      url: `file://${file.name}`,
      source: 'pdf-upload'
    });
    
    els.uploadStatus.textContent = `✓ Successfully extracted and saved ${extractedText.length} characters from ${file.name}`;
    
    // Clear form
    els.pdfFile.value = '';
    els.pdfTagSelect.value = '';
    updateUploadButton();
    
    // Refresh the display
    render();
    
    // Clear status after delay
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 3000);
    
  } catch (error) {
    console.error('PDF upload failed:', error);
    els.uploadStatus.textContent = `❌ Error: ${error.message}`;
    
    // Clear error after delay
    setTimeout(() => {
      els.uploadStatus.textContent = '';
    }, 5000);
  } finally {
    els.uploadPdf.disabled = false;
    updateUploadButton();
  }
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, ch =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[ch])
  );
}
