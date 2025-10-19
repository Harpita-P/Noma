// Taggle v1 — Prompt API edition (LanguageModel.*)
// Behavior: In any focused editable, press Ctrl+Space (Cmd+Space on Mac) -> send field text to Gemini Nano -> replace entire field with result.

(function () {
  // --- Helpers ---------------------------------------------------------------

  const EXPECTED = {
    expectedInputs:  [ 
      { type: "text", languages: ["en"] },
      { type: "image" }
    ],
    expectedOutputs: [ { type: "text", languages: ["en"] } ]
  };

  // === Tag context helpers ===
  const TAGS_KEY = "taggle-tags";
  const CTX_KEY  = "taggle-contexts";

  function parseTagSyntax(input) {
    // Example: "@myTag Where is the script?"
    const m = input.match(/^\s*(@[A-Za-z0-9_]+)\s+([\s\S]+)$/i);
    if (!m) return null;
    const tagToken = m[1];
    const userPrompt = m[2].trim();
    const tagName = tagToken.replace(/^@+/, "");
    if (!tagName || !userPrompt) return null;
    return { tagToken, tagName, userPrompt };
  }


  function findTagInText(text, caretPos) {
    // Look for @tag pattern in the entire text
    const tagRegex = /@[A-Za-z0-9_]+/g;
    let match;
    let targetTag = null;
    
    // Find all @tag matches
    while ((match = tagRegex.exec(text)) !== null) {
      const tagStartPos = match.index;
      const tagEndPos = tagStartPos + match[0].length;
      
      // Check if cursor is within or immediately after this tag
      if (caretPos >= tagStartPos && caretPos <= tagEndPos + 1) {
        // Found the tag that contains the cursor
        const restOfText = text.substring(tagEndPos).trim();
        if (restOfText) {
          const fullTagText = match[0] + ' ' + restOfText;
          targetTag = {
            match: fullTagText,
            startPos: tagStartPos,
            endPos: text.length
          };
          break;
        }
      }
    }
    
    // If no tag found at cursor, look for the closest tag before cursor
    if (!targetTag) {
      tagRegex.lastIndex = 0; // Reset regex
      let lastValidTag = null;
      
      while ((match = tagRegex.exec(text)) !== null) {
        const tagStartPos = match.index;
        const tagEndPos = tagStartPos + match[0].length;
        
        if (tagStartPos <= caretPos) {
          const restOfText = text.substring(tagEndPos).trim();
          if (restOfText) {
            lastValidTag = {
              match: match[0] + ' ' + restOfText,
              startPos: tagStartPos,
              endPos: text.length
            };
          }
        } else {
          break; // We've passed the cursor position
        }
      }
      targetTag = lastValidTag;
    }
    
    if (!targetTag) return null;
    
    // Parse the found tag
    const parsed = parseTagSyntax(targetTag.match);
    if (!parsed) return null;
    
    return {
      ...parsed,
      startPos: targetTag.startPos,
      beforeTag: text.substring(0, targetTag.startPos)
    };
  }

  async function findTagByName(tagName) {
    const { [TAGS_KEY]: tags = [] } = await chrome.storage.local.get(TAGS_KEY);
    console.log("Taggle: All tags from storage:", tags);
    const lc = tagName.toLowerCase();
    const found = tags.find(t => (t.name || "").toLowerCase() === lc) || null;
    console.log("Taggle: Looking for tag:", tagName, "found:", found);
    return found;
  }

  async function buildContextData(tagId, { maxChars = 100000 } = {}) {
    const { [CTX_KEY]: ctxMap = {} } = await chrome.storage.local.get(CTX_KEY);
    const items = ctxMap[tagId] || [];
    console.log("Taggle: Raw items from storage:", items);
    
    const textParts = [];
    const imagePromises = [];
    
    items.forEach(item => {
      if (item.type === "image" && item.imageData) {
        // Convert base64 data URL to File object for Prompt API
        const imagePromise = (async () => {
          try {
            const response = await fetch(item.imageData);
            const blob = await response.blob();
            return new File([blob], `image-${item.id}`, { type: item.mimeType || 'image/jpeg' });
          } catch (e) {
            console.warn("Taggle: Could not process image:", e);
            return null;
          }
        })();
        imagePromises.push(imagePromise);
      } else if (item.text) {
        textParts.push(item.text.trim());
      }
    });
    
    // Wait for all images to be processed
    const images = (await Promise.all(imagePromises)).filter(Boolean);
    
    console.log("Taggle: Extracted text parts:", textParts);
    console.log("Taggle: Found images:", images.length);
    
    let textBlob = textParts.join("\n---\n").trim();
    if (textBlob.length > maxChars) textBlob = textBlob.slice(0, maxChars) + "\n[...]";
    
    return { textBlob, images };
  }

  function makeFinalPrompt({ contextText, userPrompt }) {
    if (contextText) {
      return `CONTEXT:\n${contextText}\n\nUSER PROMPT:\n${userPrompt}`;
    }
    return `USER PROMPT:\n${userPrompt}`;
  }

  // === Tag selector system (triggered with Ctrl+Q) ===
  
  // Generate consistent colors for tags using the specified color scheme
  function getTagColor(tagName) {
    // Create a simple hash from tag name for consistency
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Color palette matching the reference image
    const colors = [
      '#60a5fa', // Light blue
      '#ef4444', // Red
      '#fbbf24', // Yellow
      '#a855f7', // Purple
      '#f472b6', // Light pink
      '#fb923c'  // Orange
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Distribute colors to avoid adjacent tags having the same color
  function distributeTagColors(tags) {
    if (tags.length <= 1) return tags.map(tag => ({ ...tag, color: getTagColor(tag.name) }));
    
    const colors = [
      '#60a5fa', // Light blue
      '#ef4444', // Red
      '#fbbf24', // Yellow
      '#a855f7', // Purple
      '#f472b6', // Light pink
      '#fb923c'  // Orange
    ];
    
    const tagColors = [];
    let lastColorIndex = -1;
    
    tags.forEach((tag, index) => {
      let availableColors = colors.filter((_, colorIndex) => colorIndex !== lastColorIndex);
      
      // If we have more than 6 tags, we might need to reuse colors but still avoid adjacent duplicates
      if (availableColors.length === 0) {
        availableColors = colors;
      }
      
      // Use hash to pick from available colors consistently
      let hash = 0;
      for (let i = 0; i < tag.name.length; i++) {
        hash = tag.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const colorIndex = Math.abs(hash) % availableColors.length;
      const selectedColor = availableColors[colorIndex];
      
      tagColors.push({ ...tag, color: selectedColor });
      lastColorIndex = colors.indexOf(selectedColor);
    });
    
    return tagColors;
  }
  let tagDropdown = null;
  let tagSelectorActive = false;
  let currentElement = null;
  let selectedTagIndex = 0;
  let storedCaretPosition = 0;
  let currentTagColors = [];

  function createTagDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = 'taggle-tag-selector';
    dropdown.style.cssText = `
      position: absolute;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
      max-height: 320px;
      overflow: hidden;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      font-size: 13px;
      display: none;
      min-width: 280px;
      max-width: 400px;
    `;
    document.body.appendChild(dropdown);
    return dropdown;
  }

  function positionDropdown(element, dropdown) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Try to position near cursor if possible
    let left = rect.left + scrollLeft;
    let top = rect.top + scrollTop;
    
    // For input/textarea, position at cursor if we can get it
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const caretPos = getCaretPosition(element);
      const text = getText(element);
      
      // Create a temporary span to measure text width up to cursor
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font: ${window.getComputedStyle(element).font};
        padding: ${window.getComputedStyle(element).padding};
        border: ${window.getComputedStyle(element).border};
      `;
      tempSpan.textContent = text.substring(0, caretPos);
      document.body.appendChild(tempSpan);
      
      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      // Position dropdown near the cursor
      left = rect.left + scrollLeft + Math.min(textWidth, rect.width - 200);
      top = rect.top + scrollTop + 25; // Slightly below the text line
    } else {
      // For contentEditable, position at the element's position
      top = rect.top + scrollTop + 25;
    }
    
    // Make sure dropdown doesn't go off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 250;
    const dropdownHeight = 200;
    
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 10;
    }
    if (left < 10) left = 10;
    
    if (top + dropdownHeight > viewportHeight + scrollTop) {
      top = rect.top + scrollTop - dropdownHeight - 5; // Position above if no room below
    }
    
    dropdown.style.left = left + 'px';
    dropdown.style.top = top + 'px';
    dropdown.style.minWidth = '250px';
  }

  async function showTagSelector(element) {
    console.log("Taggle: showTagSelector called with element:", element);
    const { [TAGS_KEY]: tags = [] } = await chrome.storage.local.get(TAGS_KEY);
    console.log("Taggle: Found tags:", tags);
    
    if (!tags.length) {
      console.log("Taggle: No tags found");
      toast("No tags found. Create some in Options first.");
      return;
    }

    if (!tagDropdown) {
      tagDropdown = createTagDropdown();
    }

    currentElement = element;
    selectedTagIndex = 0;
    tagSelectorActive = true;
    storedCaretPosition = getCaretPosition(element); // Store cursor position when selector opens
    
    console.log('Taggle: showTagSelector debug:', {
      elementType: element.tagName,
      isContentEditable: element.isContentEditable,
      currentText: getText(element),
      storedCaretPosition: storedCaretPosition
    });

    // Distribute colors to avoid adjacent duplicates
    const tagsWithColors = distributeTagColors(tags);
    currentTagColors = tagsWithColors;

    tagDropdown.innerHTML = `
      <div style="
        padding: 12px 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        max-height: 280px;
        overflow-y: auto;
      ">
        ${tagsWithColors.map((tag, index) => {
          const tagColor = tag.color;
          return `<div class="taggle-tag-item" data-tag="${tag.name}" data-index="${index}" style="
            padding: 4px 12px;
            cursor: pointer;
            border-radius: 16px;
            background: ${tagColor}15;
            border: 1px solid ${tagColor}30;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            font-size: 12px;
            color: ${tagColor};
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            ${index === 0 ? `background: ${tagColor}25; border-color: ${tagColor}50; transform: scale(1.02);` : ''}
          ">
            <span style="
              display: inline-block;
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: ${tagColor};
              margin-right: 5px;
              opacity: 0.9;
            "></span>
            @${tag.name}
          </div>`;
        }).join('')}
      </div>
      <div style="
        padding: 8px 16px;
        background: rgba(248, 249, 250, 0.6);
        border-top: 1px solid rgba(0, 0, 0, 0.04);
        font-size: 10px;
        color: #9ca3af;
        text-align: center;
        backdrop-filter: blur(10px);
      ">
        ↑↓ Navigate • Enter Select • Esc Cancel
      </div>
    `;

    positionDropdown(element, tagDropdown);
    tagDropdown.style.display = 'block';

    // Add click handlers and hover effects
    tagDropdown.querySelectorAll('.taggle-tag-item').forEach((item, index) => {
      const tagName = item.dataset.tag;
      const tagColor = tagsWithColors[index].color;
      
      item.onclick = () => selectTag(item.dataset.tag);
      
      item.onmouseenter = () => {
        selectedTagIndex = parseInt(item.dataset.index);
        updateTagSelection();
        
        // Add subtle hover effect if not selected
        if (index !== selectedTagIndex) {
          item.style.background = `${tagColor}20`;
          item.style.borderColor = `${tagColor}40`;
          item.style.transform = 'scale(1.01)';
        }
      };
      
      item.onmouseleave = () => {
        // Remove hover effect if not selected
        if (index !== selectedTagIndex) {
          item.style.background = `${tagColor}15`;
          item.style.borderColor = `${tagColor}30`;
          item.style.transform = '';
        }
      };
    });

    // Show toast with instructions
    toast("Tag selector active. Use ↑↓ arrows and Enter to select.");
  }

  function updateTagSelection() {
    if (!tagDropdown || !currentTagColors.length) return;
    
    tagDropdown.querySelectorAll('.taggle-tag-item').forEach((item, index) => {
      const tagColor = currentTagColors[index]?.color || getTagColor(item.dataset.tag);
      
      if (index === selectedTagIndex) {
        // Highlight selected pill
        item.style.background = `${tagColor}25`;
        item.style.borderColor = `${tagColor}50`;
        item.style.transform = 'scale(1.02)';
        item.style.boxShadow = `0 2px 8px ${tagColor}20`;
        
        // Scroll the selected item into view
        item.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else {
        // Reset to default pill style
        item.style.background = `${tagColor}15`;
        item.style.borderColor = `${tagColor}30`;
        item.style.transform = '';
        item.style.boxShadow = '';
      }
    });
  }

  function hideTagSelector() {
    if (tagDropdown) {
      tagDropdown.style.display = 'none';
    }
    tagSelectorActive = false;
    currentElement = null;
  }

  function selectTag(tagName) {
    if (!currentElement) return;
    
    const text = getText(currentElement);
    const caretPos = storedCaretPosition; // Use stored position instead of current
    
    console.log('Taggle: selectTag debug:', {
      originalText: text,
      storedCaretPos: caretPos,
      textLength: text.length
    });
    
    // Insert tag at cursor position without replacing any existing text
    const beforeCaret = text.substring(0, caretPos);
    const afterCaret = text.substring(caretPos);
    
    console.log('Taggle: Text split:', {
      beforeCaret: `"${beforeCaret}"`,
      afterCaret: `"${afterCaret}"` 
    });
    
    const newText = beforeCaret + '@' + tagName + ' ' + afterCaret;
    console.log('Taggle: New text:', `"${newText}"`);
    
    setText(currentElement, newText);
    
    // Position cursor after the tag and space
    const newCaretPos = caretPos + tagName.length + 2; // +2 for @ and space
    if (currentElement.setSelectionRange) {
      setTimeout(() => {
        currentElement.focus();
        currentElement.setSelectionRange(newCaretPos, newCaretPos);
      }, 10);
    }
    
    hideTagSelector();
    toast(`Tag @${tagName} inserted!`);
  }

  function getCaretPosition(element) {
    if (element.selectionStart !== undefined) {
      return element.selectionStart;
    }
    
    // For contentEditable elements, get actual cursor position
    if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        
        // Get the actual text content including line breaks
        const textBeforeCaret = preCaretRange.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(textBeforeCaret);
        
        // Convert HTML to text, preserving line breaks
        let textContent = tempDiv.innerHTML
          .replace(/<div[^>]*>/gi, '\n')
          .replace(/<br[^>]*>/gi, '\n')
          .replace(/<p[^>]*>/gi, '\n')
          .replace(/<\/div>/gi, '')
          .replace(/<\/p>/gi, '')
          .replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        const tempTextDiv = document.createElement('div');
        tempTextDiv.innerHTML = textContent;
        textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';
        
        // Clean up multiple newlines but preserve intentional ones
        textContent = textContent.replace(/\n\n+/g, '\n\n');
        
        console.log('Taggle: getCaretPosition debug:', {
          rawHTML: tempDiv.innerHTML,
          processedText: JSON.stringify(textContent),
          length: textContent.length
        });
        
        return textContent.length;
      }
    }
    
    // Fallback
    return getText(element).length;
  }

  function activeEditable() {
    // Special case: WhatsApp Web - always target the message input
    if (window.location.hostname === 'web.whatsapp.com') {
      const whatsappEditor = document.querySelector('#main div[contenteditable="true"]');
      if (whatsappEditor) return whatsappEditor;
    }
    
    const el = document.activeElement;
    if (!el) return null;
    
    // Check if current element is supported
    if (el.isContentEditable || 
        el.tagName === 'TEXTAREA' || 
        (el.tagName === 'INPUT' && (el.type || "").toLowerCase() !== "password")) {
      return el;
    }
    
    return null;
  }

  function getText(el) {
    if (!el) return "";
    
    if (el.isContentEditable) {
      // Get text with proper line break handling to match getCaretPosition
      let textContent = el.innerHTML
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '')
        .replace(/<\/p>/gi, '')
        .replace(/<[^>]*>/g, '');
      
      // Decode HTML entities
      const tempTextDiv = document.createElement('div');
      tempTextDiv.innerHTML = textContent;
      textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';
      
      // Clean up multiple newlines but preserve intentional ones
      textContent = textContent.replace(/\n\n+/g, '\n\n');
      
      return textContent;
    } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      return el.value || "";
    }
    
    return "";
  }

  function setText(el, text, isSpinner = false) {
    if (!el) return;
    
    if (el.isContentEditable) {
      if (isSpinner) {
        // During spinner - preserve HTML structure but replace text content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = el.innerHTML;
        
        // Convert text to HTML with proper line breaks
        const htmlText = text.replace(/\n/g, '<br>');
        el.innerHTML = htmlText;
      } else {
        // Final result - preserve HTML structure and formatting
        // Convert plain text to HTML with proper line breaks
        const htmlText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        
        el.innerHTML = htmlText;
        
        // Position cursor at the end
        setTimeout(() => {
          el.focus();
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false); // Collapse to end
          selection.removeAllRanges();
          selection.addRange(range);
        }, 10);
      }
    } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      // For input/textarea elements - direct value assignment
      el.value = text;
      
      if (!isSpinner) {
        // Move cursor to end only for final result
        el.selectionStart = el.selectionEnd = text.length;
      }
      
      // Trigger comprehensive events
      el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }
  }

  // Tiny toast
  function toast(msg, ms = 2000) {
    const n = document.createElement("div");
    n.textContent = msg;
    Object.assign(n.style, {
      position: "fixed", top: "10px", left: "50%", transform: "translateX(-50%)",
      background: "rgba(0,0,0,.85)", color: "#fff", padding: "8px 10px",
      borderRadius: "8px", zIndex: 999999, fontFamily: "system-ui", fontSize: "12px"
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), ms);
  }

  // Simple spinner while we wait
  const SPIN = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  function startSpinner(el) {
    let i = 0;
    const id = setInterval(() => setText(el, SPIN[i = (i + 1) % SPIN.length], true), 90);
    return () => clearInterval(id);
  }


  function startPartialSpinner(el, beforeText) {
    let i = 0;
    const id = setInterval(() => {
      const spinnerText = beforeText + SPIN[i = (i + 1) % SPIN.length];
      setText(el, spinnerText, true);
    }, 90);
    return () => clearInterval(id);
  }

  // --- Prompt API path -------------------------------------------------------

  // One session per request (simple v1). You can cache one if you like.
  async function runPrompt(userText, signal) {
    // IMPORTANT: Pass the SAME options to availability() that you'll use to create/prompt
    const avail = await LanguageModel.availability(EXPECTED);
    // values may be 'unavailable' | 'after-download' | 'downloading' | 'readily'
    if (avail === "unavailable") throw new Error("Gemini Nano unavailable on this device/browser.");

    // Create session; show download progress if needed
    const session = await LanguageModel.create({
      ...EXPECTED,
      // light touch system style
      initialPrompts: [{ role: "system", content: "You are concise and helpful. Prefer plain text." }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          // e.loaded is 0..1 (fraction)
          const pct = Math.round((e.loaded || 0) * 100);
          // Avoid spamming: update a single toast-ish element
          progressToast(`${pct < 100 ? "Downloading model…" : "Finalizing…"} ${pct}%`);
        });
      },
      signal
    });

    try {
      // Non-streamed for v1 simplicity
      const result = await session.prompt(userText, { signal });
      return result;
    } finally {
      try { session.destroy(); } catch {}
      progressToast(""); // clear
    }
  }

  // Multimodal prompt function for handling images + text
  async function runMultimodalPrompt(contextData, userPrompt, signal) {
    // IMPORTANT: Pass the SAME options to availability() that you'll use to create/prompt
    const avail = await LanguageModel.availability(EXPECTED);
    if (avail === "unavailable") throw new Error("Gemini Nano unavailable on this device/browser.");

    // Create session with multimodal support
    const session = await LanguageModel.create({
      ...EXPECTED,
      initialPrompts: [{ role: "system", content: "You are concise and helpful. Analyze images and text context together to provide accurate responses." }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          const pct = Math.round((e.loaded || 0) * 100);
          progressToast(`${pct < 100 ? "Downloading model…" : "Finalizing…"} ${pct}%`);
        });
      },
      signal
    });

    try {
      // Build multimodal prompt content
      const promptContent = [];
      
      // Add text context if available
      if (contextData.textBlob) {
        promptContent.push({
          type: "text",
          value: `CONTEXT:\n${contextData.textBlob}\n\n`
        });
      }
      
      // Add images
      for (const image of contextData.images) {
        promptContent.push({
          type: "image",
          value: image
        });
      }
      
      // Add user prompt
      promptContent.push({
        type: "text", 
        value: `USER PROMPT:\n${userPrompt}`
      });

      console.log("Taggle: Multimodal prompt content:", promptContent);

      // Send multimodal prompt
      const result = await session.prompt([{
        role: "user",
        content: promptContent
      }], { signal });
      
      return result;
    } finally {
      try { session.destroy(); } catch {}
      progressToast(""); // clear
    }
  }

  // A single updatable toast for progress
  let _progressEl = null, _progressTimer = null;
  function progressToast(text) {
    if (!text) {
      if (_progressEl) { _progressEl.remove(); _progressEl = null; }
      if (_progressTimer) { clearTimeout(_progressTimer); _progressTimer = null; }
      return;
    }
    if (!_progressEl) {
      _progressEl = document.createElement("div");
      Object.assign(_progressEl.style, {
        position: "fixed", top: "10px", left: "50%", transform: "translateX(-50%)",
        background: "rgba(20,20,20,.92)", color: "#fff", padding: "8px 10px",
        borderRadius: "8px", zIndex: 999999, fontFamily: "system-ui", fontSize: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,.35)"
      });
      document.body.appendChild(_progressEl);
    }
    _progressEl.textContent = text;
    if (_progressTimer) clearTimeout(_progressTimer);
    _progressTimer = setTimeout(() => progressToast(""), 2500);
  }

  // === Event listeners for tag selector ===
  
  document.addEventListener('keydown', (e) => {
    console.log("Taggle: Key pressed:", e.key, "Ctrl:", e.ctrlKey, "Meta:", e.metaKey);
    
    // Ctrl+Q to trigger tag selector
    if (e.key === 'q' && (e.ctrlKey || e.metaKey)) {
      console.log("Taggle: Ctrl+Q detected");
      const el = activeEditable();
      console.log("Taggle: Active element:", el);
      if (el) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Taggle: Showing tag selector");
        showTagSelector(el);
        return;
      } else {
        console.log("Taggle: No active editable element found");
      }
    }

    // Handle tag selector navigation when active
    if (tagSelectorActive && tagDropdown && tagDropdown.style.display === 'block') {
      const items = tagDropdown.querySelectorAll('.taggle-tag-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedTagIndex = (selectedTagIndex + 1) % items.length;
        updateTagSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedTagIndex = (selectedTagIndex - 1 + items.length) % items.length;
        updateTagSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = items[selectedTagIndex];
        if (selectedItem) selectTag(selectedItem.dataset.tag);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideTagSelector();
      }
    }
  }, true);

  // Hide tag selector when clicking outside
  document.addEventListener('click', (e) => {
    if (tagDropdown && !tagDropdown.contains(e.target) && tagSelectorActive) {
      hideTagSelector();
    }
  });

  // --- Ctrl+Space key handler -----------------------------------------------

  document.addEventListener("keydown", async (e) => {
    if (e.key !== " " || !(e.ctrlKey || e.metaKey)) return;  // Ctrl/Cmd + Space only

    let el = activeEditable();
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const original = getText(el);
    if (!original.trim()) return;

    const caretPos = getCaretPosition(el);
    const tagInfo = findTagInText(original, caretPos);
    let finalPromptText = original.trim(); // fallback: send raw if not "@tag ..."
    let beforeTagText = "";

    let contextData = null;
    let hasImages = false;

    if (tagInfo) {
      console.log("Taggle: Found @tag in text:", tagInfo);
      const tag = await findTagByName(tagInfo.tagName);
      beforeTagText = tagInfo.beforeTag;
      
      if (!tag) {
        toast(`Tag "@${tagInfo.tagName}" not found. Create it in Options.`);
        console.log("Taggle: Tag not found:", tagInfo.tagName);
        // Use the tag portion as fallback
        finalPromptText = tagInfo.userPrompt;
      } else {
        console.log("Taggle: Found tag:", tag);
        contextData = await buildContextData(tag.id);
        hasImages = contextData.images.length > 0;
        console.log("Taggle: Context text length:", contextData.textBlob.length);
        console.log("Taggle: Images found:", contextData.images.length);
        console.log("Taggle: Context preview:", contextData.textBlob.substring(0, 200) + "...");
        
        if (!hasImages) {
          // Text-only prompt
          finalPromptText = makeFinalPrompt({
            contextText: contextData.textBlob,
            userPrompt: tagInfo.userPrompt
          });
          console.log("Taggle: Final prompt length:", finalPromptText.length);
          console.log("Taggle: Final prompt preview:", finalPromptText.substring(0, 300) + "...");
        }
      }
    } else {
      console.log("Taggle: No @tag syntax detected, using raw text");
    }

    // Start spinner - if we have a tag, only spin from tag onwards
    const stopSpin = tagInfo ? startPartialSpinner(el, beforeTagText) : startSpinner(el);

    const ctrl = new AbortController();
    const onEsc = (ev) => { if (ev.key === "Escape") ctrl.abort(); };
    window.addEventListener("keydown", onEsc, { once: true });

    try {
      let answer;
      
      if (hasImages && contextData && contextData.images.length > 0) {
        // Multimodal prompt with images
        console.log("Taggle: Using multimodal prompt with images");
        answer = await runMultimodalPrompt(contextData, tagInfo.userPrompt, ctrl.signal);
      } else {
        // Text-only prompt
        console.log("Taggle: Using text-only prompt");
        answer = await runPrompt(finalPromptText, ctrl.signal);
      }
      
      stopSpin();
      
      // If we found a tag, only replace from the tag onwards
      if (tagInfo) {
        const newText = beforeTagText + answer;
        setText(el, newText);
        console.log("Taggle: Replaced from @tag onwards. Before:", beforeTagText, "Answer:", answer.substring(0, 100) + "...");
      } else {
        // No tag found, replace entire content as before
        setText(el, answer);
      }
    } catch (err) {
      stopSpin();
      setText(el, original);
      if (err?.name === "AbortError") toast("Taggle: cancelled");
      else { console.error("[Taggle] Prompt failed:", err); toast("Taggle: Gemini Nano unavailable or failed"); }
    } finally {
      window.removeEventListener("keydown", onEsc);
    }
  }, true);
})();
