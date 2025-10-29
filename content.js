(function () {
          if (window.taggleContentScriptLoaded) {
                  return;
  }
          window.taggleContentScriptLoaded = true;
          const style = document.createElement('style');
          style.textContent = `    /* Import Ranade font from Fontshare */    @import url('https://api.fontshare.com/v2/css?f[]=ranade@400&display=swap');    /* Black cursor for input fields and contentEditable elements */    input, textarea, [contenteditable="true"], [contenteditable] {      caret-color: #000000 !important;    }    /* Black cursor for specific selectors that might override */    input:focus, textarea:focus, [contenteditable="true"]:focus, [contenteditable]:focus {      caret-color: #000000 !important;    }    /* Ensure it works on common rich text editors */    .ql-editor, .DraftEditor-editorContainer, .notranslate, [role="textbox"] {      caret-color: #000000 !important;    }    #noma-logo-button {      border-radius: 35%;      padding: 0;      transform: none !important;      transition: none !important;      overflow: hidden;      background: transparent !important;      border: none !important;    }    #noma-logo-button:hover {      transform: none !important;    }    /* Search input focus state - minimal grey */    #tag-search-input:focus {      border-color: rgba(128, 128, 128, 0.2) !important;    }    :root {      --taggle-placeholder-color: rgba(128, 128, 128, 0.4);    }    #tag-search-input::placeholder {      color: var(--taggle-placeholder-color);    }    /* Floating Noma button for text selection */    #noma-floating-button {      position: absolute;      width: 32px;      height: 32px;      border-radius: 50%;      background: white;      border: 1px solid rgba(0, 0, 0, 0.1);      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);      cursor: pointer;      display: flex;      align-items: center;      justify-content: center;      z-index: 999999;      transition: transform 0.2s ease;    }    /* Make tooltip appear instantly */    #noma-floating-button[title]:hover::after {      transition-delay: 0s !important;    }    #noma-floating-button:hover {      transform: scale(1.1);    }    #noma-floating-button img {      width: 26px;      height: 26px;      object-fit: contain;      animation: noma-spin 2s linear infinite;    }    @keyframes noma-spin {      from {        transform: rotate(0deg);      }      to {        transform: rotate(360deg);      }    }  `;
          document.head.appendChild(style);
          function formatCalendarEventForAI(event) {
                  const parts = [];
                  if (event.title) {
                          parts.push(`Meeting: ${event.title}`);
    }
                  if (event.startTimeFormatted) {
                          parts.push(`Time: ${event.startTimeFormatted}`);
                          if (event.endTimeFormatted) {
                                  parts.push(`- ${event.endTimeFormatted}`);
      }
    }
                  if (event.attendees) {
                          parts.push(`Attendees: ${event.attendees}`);
    }
                  if (event.location) {
                          parts.push(`Location: ${event.location}`);
    }
                  if (event.meetingLinks && event.meetingLinks.length > 0) {
                          parts.push(`Meeting Link: ${event.meetingLinks[0]}`);
    }
                  if (event.description) {
                          parts.push(`Description: ${event.description}`);
    }
                  return parts.join('\n');
  }
          function formatEmailForAI(email) {
                  const parts = [];
                  parts.push(`Subject: ${email.subject || 'No Subject'}`);
                  if (email.senderName && email.senderEmail) {
                          parts.push(`From: ${email.senderName} <${email.senderEmail}>`);
    }
              else if (email.senderEmail) {
                          parts.push(`From: ${email.senderEmail}`);
    }
                  if (email.dateFormatted) {
                          parts.push(`Date: ${email.dateFormatted}`);
    }
                  if (email.bodyText) {
                          parts.push(`Content: ${email.bodyText}`);
    }
              else if (email.snippet) {
                          parts.push(`Preview: ${email.snippet}`);
    }
                  if (email.isUnread) {
                          parts.push(`Status: Unread`);
    }
                  if (email.isImportant) {
                          parts.push(`Priority: Important`);
    }
                  return parts.join('\n');
  }
          const loadDynamicServices = async () => {
                  try {
                          if (!window.taggleCalendarServiceLoaded) {
                                  const calendarServiceScript = document.createElement('script');
                                  calendarServiceScript.src = chrome.runtime.getURL('calendar-service-v3.js');
                                  document.head.appendChild(calendarServiceScript);
                                  window.taggleCalendarServiceLoaded = true;
      }
                          if (!window.taggleCalendarSyncLoaded) {
                                  const calendarSyncScript = document.createElement('script');
                                  calendarSyncScript.src = chrome.runtime.getURL('calendar-sync.js');
                                  document.head.appendChild(calendarSyncScript);
                                  window.taggleCalendarSyncLoaded = true;
      }
                          if (!window.taggleGmailServiceLoaded) {
                                  const gmailServiceScript = document.createElement('script');
                                  gmailServiceScript.src = chrome.runtime.getURL('gmail-service.js');
                                  document.head.appendChild(gmailServiceScript);
                                  window.taggleGmailServiceLoaded = true;
      }
                          if (!window.taggleGmailSyncLoaded) {
                                  const gmailSyncScript = document.createElement('script');
                                  gmailSyncScript.src = chrome.runtime.getURL('gmail-sync.js');
                                  document.head.appendChild(gmailSyncScript);
                                  window.taggleGmailSyncLoaded = true;
      }
                          if (!window.taggleNotionServiceLoaded) {
                                  const notionServiceScript = document.createElement('script');
                                  notionServiceScript.src = chrome.runtime.getURL('notion-service.js');
                                  document.head.appendChild(notionServiceScript);
                                  window.taggleNotionServiceLoaded = true;
      }
                          if (!window.taggleNotionSyncLoaded) {
                                  const notionSyncScript = document.createElement('script');
                                  notionSyncScript.src = chrome.runtime.getURL('notion-sync.js');
                                  document.head.appendChild(notionSyncScript);
                                  window.taggleNotionSyncLoaded = true;
      }
                          if (!window.tagglePinterestServiceLoaded) {
                                  const pinterestServiceScript = document.createElement('script');
                                  pinterestServiceScript.src = chrome.runtime.getURL('pinterest-service.js');
                                  document.head.appendChild(pinterestServiceScript);
                                  window.tagglePinterestServiceLoaded = true;
      }
                          if (!window.tagglePinterestSyncLoaded) {
                                  const pinterestSyncScript = document.createElement('script');
                                  pinterestSyncScript.src = chrome.runtime.getURL('pinterest-sync.js');
                                  document.head.appendChild(pinterestSyncScript);
                                  window.tagglePinterestSyncLoaded = true;
      }
                          await new Promise(resolve => setTimeout(resolve, 1000));
                          if (window.CalendarSync && !window.CalendarSync.initialized) {
                                  await window.CalendarSync.initialize();
      }
                          if (window.GmailSync && !window.GmailSync.initialized) {
                                  await window.GmailSync.initialize();
      }
                          if (window.NotionSync && !window.NotionSync.initialized) {
                                  await window.NotionSync.initialize();
      }
                          if (window.PinterestSync && !window.PinterestSync.initialized) {
                                  await window.PinterestSync.initialize();
      }
    }
              catch (error) {
                          console.warn("Taggle: Could not load dynamic services:", error);
    }
  };
          loadDynamicServices();
          const loadRAGSystem = async () => {
                  try {
                          if (!window.taggleRAGSystemLoaded) {
                                  const ragScript = document.createElement('script');
                                  ragScript.src = chrome.runtime.getURL('rag-system.js');
                                  document.head.appendChild(ragScript);
                                  window.taggleRAGSystemLoaded = true;
                                  await new Promise(resolve => setTimeout(resolve, 1000));
      }
                          if (window.RAGSystem && !window.taggleRAG) {
                                  window.taggleRAG = new window.RAGSystem();
                                  await window.taggleRAG.initialize();
                                  console.log('Taggle RAG: System initialized in content script');
      }
    }
              catch (error) {
                          console.warn("Taggle: Could not load RAG system:", error);
    }
  };
          loadDynamicServices();
          loadRAGSystem();
          const EXPECTED = {
                  expectedInputs:  [      {
                    type: "text",
      languages: ["en"]
    },
            {
                    type: "image"
    }
                  ],
          expectedOutputs: [ {
                    type: "text",
      languages: ["en"]
    }
              ]
  };
        function getLM() {
                if (typeof self !== 'undefined' && 'LanguageModel' in self) return self.LanguageModel;
                if (typeof self !== 'undefined' && self.ai && self.ai.languageModel) {
                        return {
                                availability: (...args) => self.ai.languageModel.capabilities?.(...args)?.then(c => {
                                        const v = c?.available;
                                        return v === 'readily' ? 'available' : v === 'after-download' ? 'downloadable' : 'unavailable';
        }) ?? Promise.resolve('unavailable'), params: () => self.ai.languageModel.params?.() ?? Promise.resolve({}), create: (opts = {}) => self.ai.languageModel.create({
                                        systemPrompt: opts.initialPrompts?.find(p => p.role === 'system')?.content,
                    monitor: opts.monitor,
        })
      };
    }
                return null;
  }
        function expectedToSessionOptions(expected) {
                const opts = {};
                if (expected?.expectedInputs) opts.expectedInputs = expected.expectedInputs;
                if (expected?.expectedOutputs) opts.expectedOutputs = expected.expectedOutputs;
                return opts;
  }
        async function createSessionWithDownload(expected, { systemPrompt } = {}) {
                const LM = getLM();
                if (!LM) throw new Error("Prompt API not available in this context.");
                const availability = await LM.availability(expectedToSessionOptions(EXPECTED));
                if (availability === 'unavailable') {
                        throw new Error("Gemini Nano unavailable (Prompt API not enabled, policy blocked, or device unsupported).");
    }
                const options = {
                        ...expectedToSessionOptions(EXPECTED),
            initialPrompts: systemPrompt ? [{
                          role: 'system',
        content: systemPrompt
      }
                    ] : undefined,
            monitor(m) {
                                m.addEventListener('downloadprogress', (e) => {
                                        const pct = Math.round((e.loaded || 0) * 100);
                                        console.log(`Downloading on-device model… ${pct}%`);
                                        if (pct >= 100) console.log("Model ready!");
        });
      }
    };
                const session = await LM.create(options);
                return session;
  }
        async function runPrompt(finalPromptText, abortSignal) {
                const systemPrompt = "You are responding directly to a person in a conversation. Reply naturally as if you're talking to them directly. Do NOT use markdown formatting. Do NOT use phrases like 'I am an AI' or 'As an AI assistant'. Do NOT add explanations about your capabilities or limitations. Do NOT mention the source of the context or tag. IMPORTANT: If the user requests code, return ONLY the runnable code with no explanations, no markdown code blocks, no additional text - just pure executable code. Just respond naturally and conversationally as a helpful person would.";
                const session = await createSessionWithDownload(EXPECTED,
    {
                    systemPrompt
    });
                const result = await session.prompt(finalPromptText,
    {
                    signal: abortSignal
    });
                return typeof result === 'string' ? result : String(result);
  }
        async function runMultimodalPrompt(contextData, userPrompt, abortSignal) {
                try {
                        const mmExpected = {
                                expectedInputs: [        {
                                type: "text",
            languages: ["en"]
        },
                  {
                                type: "image"
        }
                                ],
                expectedOutputs: [{
                                type: "text",
          languages: ["en"]
        }
                          ]
      };
                        const systemPrompt = "You are responding directly to a person in a conversation. Reply naturally as if you're talking to them directly. Do NOT use markdown formatting. Do NOT use phrases like 'I am an AI' or 'As an AI assistant'. Do NOT add explanations about your capabilities or limitations. Do NOT mention the source of the context or tag. IMPORTANT: If the user requests code, return ONLY the runnable code with no explanations, no markdown code blocks, no additional text - just pure executable code. Just respond naturally and conversationally as a helpful person would.";
                        const session = await createSessionWithDownload(mmExpected,
      {
                          systemPrompt
      });
                        const contextText = contextData.textBlob?.trim() || "";
                        if (contextText) {
                                await session.append([{
                                        role: 'system',
                    content: [{
                                      type: 'text',
            value: `CONTEXT:\n${contextText}\n\nUse it only if relevant.`
          }
                                ]
        }
                          ]);
      }
                        const baseUserParts = [{
                          type: 'text',
        value: userPrompt
      }
                    ];
                        const imageFiles = Array.isArray(contextData.images) ? contextData.images : [];
                        const contentParts = baseUserParts.concat(imageFiles.map(f => ({
                          type: 'image',
        value: f
      })));
                        await session.append([{
                          role: 'user',
        content: contentParts
      }
                    ]);
                        const answer = await session.prompt("Answer the user's last request.",
      {
                          signal: abortSignal
      });
                        return typeof answer === 'string' ? answer : String(answer);
    }
              catch (err) {
                        if (err?.name === 'NotSupportedError' || /multimodal|image/i.test(err?.message || '')) {
                                console.warn("Multimodal not supported here; falling back to text-only:", err);
                                const contextText = contextData.textBlob?.trim() || "";
                                const merged = contextText        ? `CONTEXT:\n${contextText}\n\nUSER PROMPT:\n${userPrompt}`        : `USER PROMPT:\n${userPrompt}`;
                                return runPrompt(merged,
        abortSignal);
      }
                        throw err;
    }
  }
          const TAGS_KEY = "taggle-tags";
          const CTX_KEY  = "taggle-contexts";
          function parseTagSyntax(input) {
                  const m = input.match(/^\s*(@[A-Za-z0-9_]+)\s+([\s\S]+)$/i);
                  if (!m) return null;
                  const tagToken = m[1];
                  const userPrompt = m[2].trim();
                  const tagName = tagToken.replace(/^@+/,
    "");
                  if (!tagName || !userPrompt) return null;
                  return {
                    tagToken,
      tagName,
      userPrompt
    };
  }
          function findTagInText(text, caretPos) {
                  const tagRegex = /@[A-Za-z0-9_]+/g;
                  let match;
                  let targetTag = null;
                  while ((match = tagRegex.exec(text)) !== null) {
                          const tagStartPos = match.index;
                          const tagEndPos = tagStartPos + match[0].length;
                          if (caretPos >= tagStartPos && caretPos <= tagEndPos + 1) {
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
                  if (!targetTag) {
                          tagRegex.lastIndex = 0;
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
        }
                          else {
                                          break;
        }
      }
                          targetTag = lastValidTag;
    }
                  if (!targetTag) return null;
                  const parsed = parseTagSyntax(targetTag.match);
                  if (!parsed) return null;
                  return {
                          ...parsed,
              startPos: targetTag.startPos,
              beforeTag: text.substring(0,
      targetTag.startPos)
    };
  }
          async function findTagByName(tagName) {
                  try {
                          const {
                          [TAGS_KEY]: tags = []
      }
                    = await chrome.storage.local.get(TAGS_KEY);
                          console.log("Taggle: All tags from storage:", tags);
                          const lc = tagName.toLowerCase();
                          const found = tags.find(t => (t.name || "").toLowerCase() === lc) || null;
                          console.log("Taggle: Looking for tag:", tagName,
      "found:",
      found);
                          return found;
    }
              catch (error) {
                          if (error.message.includes('Extension context invalidated')) {
                                  console.log("Taggle: Extension context invalidated, tag not found");
                                  return null;
      }
                          throw error;
    }
  }
          async function getContexts(tagId) {
                  try {
                          const {
                          [CTX_KEY]: ctxMap = {}
      }
                    = await chrome.storage.local.get(CTX_KEY);
                          const regularContexts = ctxMap[tagId] || [];
                          try {
                                  const {
                                'noma-calendar-tags': calendarTags = {},
          'noma-calendar-contexts': calendarContexts = {}
        }
                          =          await chrome.storage.local.get(['noma-calendar-tags',
        'noma-calendar-contexts']);
                                  console.log('Taggle: Checking calendar tags for tagId:', tagId);
                                  console.log('Taggle: Available calendar tags:',
        Object.keys(calendarTags));
                                  const isCalendarTag = calendarTags[tagId] !== undefined;
                                  console.log('Taggle: Is calendar tag?', tagId,
        isCalendarTag);
                                  if (isCalendarTag) {
                                          const events = calendarContexts[tagId] || [];
                                          console.log('Taggle: Found calendar events:', events.length);
                                          const formattedCalendarContexts = events.map(event => ({
                                                  id: event.id || `cal-${Date.now()}-${Math.random()}`,
                          type: "calendar",
                          text: formatCalendarEventForAI(event),
                          title: event.title || 'Calendar Event',
                          url: event.meetingLinks?.[0] || "",
                          source: "google-calendar",
                          createdAt: event.createdAt || new Date().toISOString(),
                          calendarEvent: event
          }));
                                          console.log('Taggle: Formatted calendar contexts:', formattedCalendarContexts.length);
                                          return [...formattedCalendarContexts,
          ...regularContexts];
        }
      }
                    catch (calendarError) {
                                  console.warn("Taggle: Error fetching calendar contexts:", calendarError);
      }
                          try {
                                  const {
                                'noma-gmail-tags': gmailTags = {},
          'noma-gmail-contexts': gmailContexts = {}
        }
                          =          await chrome.storage.local.get(['noma-gmail-tags',
        'noma-gmail-contexts']);
                                  console.log('Taggle: Checking Gmail tags for tagId:', tagId);
                                  console.log('Taggle: Available Gmail tags:',
        Object.keys(gmailTags));
                                  const isGmailTag = gmailTags[tagId] !== undefined;
                                  console.log('Taggle: Is Gmail tag?', tagId,
        isGmailTag);
                                  if (isGmailTag) {
                                          const emails = gmailContexts[tagId] || [];
                                          console.log('Taggle: Found Gmail emails:', emails.length);
                                          const formattedGmailContexts = emails.map(email => ({
                                                  id: email.id || `gmail-${Date.now()}-${Math.random()}`,
                          type: "email",
                          text: formatEmailForAI(email),
                          title: email.subject || 'No Subject',
                          url: "",
                          source: "gmail",
                          createdAt: email.createdAt || new Date().toISOString(),
                          emailData: email
          }));
                                          console.log('Taggle: Formatted Gmail contexts:', formattedGmailContexts.length);
                                          return [...formattedGmailContexts,
          ...regularContexts];
        }
      }
                    catch (gmailError) {
                                  console.warn("Taggle: Error fetching Gmail contexts:", gmailError);
      }
                          try {
                                  const {
                                'noma-notion-tags': notionTags = {},
          'noma-notion-contexts': notionContexts = {}
        }
                          =          await chrome.storage.local.get(['noma-notion-tags',
        'noma-notion-contexts']);
                                  console.log('Taggle: Checking Notion tags for tagId:', tagId);
                                  console.log('Taggle: Available Notion tags:',
        Object.keys(notionTags));
                                  const isNotionTag = notionTags[tagId] !== undefined;
                                  console.log('Taggle: Is Notion tag?', tagId,
        isNotionTag);
                                  if (isNotionTag) {
                                          const pages = notionContexts[tagId] || [];
                                          console.log('Taggle: Found Notion pages:', pages.length);
                                          const formattedNotionContexts = pages.map(page => ({
                                                  id: page.id || `notion-${Date.now()}-${Math.random()}`,
                          type: "notion",
                          text: `# ${page.title}\n\n${page.content}`,
                          title: page.title || 'Notion Page',
                          url: `https://notion.so/${page.pageId}`,
                          source: "notion",
                          createdAt: page.createdAt || new Date().toISOString(),
                          notionData: page
          }));
                                          console.log('Taggle: Formatted Notion contexts:', formattedNotionContexts.length);
                                          return [...formattedNotionContexts,
          ...regularContexts];
        }
      }
                    catch (notionError) {
                                  console.warn("Taggle: Error fetching Notion contexts:", notionError);
      }
                          try {
                                  const {
                                'noma-pinterest-tags': pinterestTags = {},
          'noma-pinterest-contexts': pinterestContexts = {}
        }
                          =          await chrome.storage.local.get(['noma-pinterest-tags',
        'noma-pinterest-contexts']);
                                  console.log('Taggle: Checking Pinterest tags for tagId:', tagId);
                                  console.log('Taggle: Available Pinterest tags:',
        Object.keys(pinterestTags));
                                  const isPinterestTag = pinterestTags[tagId] !== undefined;
                                  console.log('Taggle: Is Pinterest tag?', tagId,
        isPinterestTag);
                                  if (isPinterestTag) {
                                          const pins = pinterestContexts[tagId] || [];
                                          console.log('Taggle: Found Pinterest pins:', pins.length);
                                          const formattedPinterestContexts = pins.map(pin => ({
                                                  id: pin.id || `pinterest-${Date.now()}-${Math.random()}`,
                          type: "pinterest",
                          text: `Pin: ${pin.title}\n${pin.description ? 'Description: ' + pin.description : ''}\nLink: ${pin.link}`,
                          title: pin.title || 'Pinterest Pin',
                          url: pin.link,
                          source: "pinterest",
                          createdAt: pin.createdAt || new Date().toISOString(),
                          imageBase64: pin.imageBase64,
                          pinterestData: pin
          }));
                                          console.log('Taggle: Formatted Pinterest contexts:', formattedPinterestContexts.length);
                                          return [...formattedPinterestContexts,
          ...regularContexts];
        }
      }
                    catch (pinterestError) {
                                  console.warn("Taggle: Error fetching Pinterest contexts:", pinterestError);
      }
                          return regularContexts;
    }
              catch (error) {
                          if (error.message.includes('Extension context invalidated')) {
                                  console.log("Taggle: Extension context invalidated, returning empty contexts");
                                  return [];
      }
                          throw error;
    }
  }
          async function getContextTypeCounts(tagId) {
                  try {
                          const {
                          [CTX_KEY]: ctxMap = {}
      }
                    = await chrome.storage.local.get(CTX_KEY);
                          const contexts = ctxMap[tagId] || [];
                          const counts = {
                                  text: 0,
                  pdf: 0,
                  image: 0,
                  calendar: 0,
                  email: 0,
                  notion: 0,
                  audio: 0,
                  total: contexts.length
      };
                          contexts.forEach(ctx => {
                                  if (ctx.type === "image") {
                                          counts.image++;
        }
                          else if (ctx.type === "calendar") {
                                          counts.calendar++;
        }
                          else if (ctx.type === "email") {
                                          counts.email++;
        }
                          else if (ctx.type === "notion") {
                                          counts.notion++;
        }
                          else if (ctx.type === "audio") {
                                          counts.audio++;
        }
                          else if (ctx.type === "text") {
                                          if (ctx.source === "pdf-upload" || (ctx.title && ctx.title.startsWith("PDF:"))) {
                                                  counts.pdf++;
          }
                                else {
                                                  counts.text++;
          }
        }
      });
                          return counts;
    }
              catch (error) {
                          if (error.message.includes('Extension context invalidated')) {
                                  console.log("Taggle: Extension context invalidated, returning empty counts");
                                  return {
                                text: 0,
          pdf: 0,
          image: 0,
          calendar: 0,
          email: 0,
          notion: 0,
          audio: 0,
          total: 0
        };
      }
                          throw error;
    }
  }
          async function getAllTagsWithContextCounts() {
                  try {
                          const {
                          [TAGS_KEY]: tags = []
      }
                    = await chrome.storage.local.get(TAGS_KEY);
                          const tagsWithCounts = [];
                          let calendarTags = {};
                          try {
                                  const {
                                'noma-calendar-tags': storedCalendarTags = {}
        }
                          = await chrome.storage.local.get('noma-calendar-tags');
                                  calendarTags = storedCalendarTags;
      }
                    catch (error) {
                                  console.warn('Taggle: Could not load calendar tags:', error);
      }
                          let gmailTags = {};
                          try {
                                  const {
                                'noma-gmail-tags': storedGmailTags = {}
        }
                          = await chrome.storage.local.get('noma-gmail-tags');
                                  gmailTags = storedGmailTags;
      }
                    catch (error) {
                                  console.warn('Taggle: Could not load Gmail tags:', error);
      }
                          let notionTags = {};
                          try {
                                  const {
                                'noma-notion-tags': storedNotionTags = {}
        }
                          = await chrome.storage.local.get('noma-notion-tags');
                                  notionTags = storedNotionTags;
      }
                    catch (error) {
                                  console.warn('Taggle: Could not load Notion tags:', error);
      }
                          let pinterestTags = {};
                          try {
                                  const {
                                'noma-pinterest-tags': storedPinterestTags = {}
        }
                          = await chrome.storage.local.get('noma-pinterest-tags');
                                  pinterestTags = storedPinterestTags;
      }
                    catch (error) {
                                  console.warn('Taggle: Could not load Pinterest tags:', error);
      }
                          console.log('Taggle: Loaded integration tags - Calendar:',
      Object.keys(calendarTags),
      'Gmail:',
      Object.keys(gmailTags),
      'Notion:',
      Object.keys(notionTags),
      'Pinterest:',
      Object.keys(pinterestTags));
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
    }
              catch (error) {
                          if (error.message.includes('Extension context invalidated')) {
                                  console.log("Taggle: Extension context invalidated, returning empty tags");
                                  return [];
      }
                          throw error;
    }
  }
          async function buildContextData(tagId, { maxChars = 100000 } = {}) {
                  try {
                          const items = await getContexts(tagId);
                          console.log("Taggle: Raw items from storage (including calendar):", items);
                          const textParts = [];
                          const imagePromises = [];
                          console.log("Taggle: Current excluded contexts:",
      Array.from(excludedContexts));
                          items.forEach(item => {
                                  console.log("Taggle: Processing item:",
        item.id,
        "type:",
        item.type,
        "excluded:",
        excludedContexts.has(item.id));
                                  if (excludedContexts.has(item.id)) {
                                          console.log("Taggle: EXCLUDING context from prompt:", item.id,
          item.type);
                                          return;
        }
                                  console.log("Taggle: INCLUDING context in prompt:", item.id,
        item.type);
                                  if (item.type === "image" && item.imageData) {
                                          const imagePromise = (async () => {
                                                  try {
                                                          const response = await fetch(item.imageData);
                                                          const blob = await response.blob();
                                                          return new File([blob],
              `image-${item.id}`,
              {
                                                  type: item.mimeType || 'image/jpeg'
              });
            }
                                      catch (e) {
                                                          console.warn("Taggle: Could not process image:", e);
                                                          return null;
            }
          })();
                                          imagePromises.push(imagePromise);
                                          if (item.text) {
                                                  textParts.push(item.text.trim());
          }
        }
                                    else if (item.type === "audio" && item.transcription) {
                                          console.log("Taggle: Processing audio context:", item.filename || 'audio');
                                          textParts.push(item.transcription.trim());
        }
                                  else if (item.type === "pinterest" && item.imageBase64) {
                                          console.log("Taggle: Processing Pinterest pin with image:", item.title);
                                          const imagePromise = (async () => {
                                                  try {
                                                          const response = await fetch(item.imageBase64);
                                                          const blob = await response.blob();
                                                          return new File([blob],
              `pinterest-${item.id}`,
              {
                                                  type: 'image/jpeg'
              });
            }
                                      catch (e) {
                                                          console.warn("Taggle: Could not process Pinterest image:", e);
                                                          return null;
            }
          })();
                                          imagePromises.push(imagePromise);
                                          if (item.text) {
                                                  textParts.push(item.text.trim());
          }
        }
                                    else if (item.text) {
                                          textParts.push(item.text.trim());
        }
      });
                          const images = (await Promise.all(imagePromises)).filter(Boolean);
                          console.log("Taggle: Extracted text parts:", textParts.length,
      textParts);
                          console.log("Taggle: Found images:", images.length,
      images);
                          console.log("Taggle: Final context data - texts:", textParts.length,
      "images:",
      images.length);
                          let textBlob = textParts.join("\n---\n").trim();
                          let ragAnalysis = null;
                          if (window.RAGSystem) {
                                  const ragSystem = new window.RAGSystem();
                                  await ragSystem.initialize();
                                  const fullContextData = {
                                textBlob,
          images
        };
                                  ragAnalysis = await ragSystem.analyzeContextData(fullContextData);
                                  if (ragAnalysis.isLargeContext) {
                                          console.log("Taggle: Large context detected, will use RAG when queried");
                                          console.log("Taggle: Context analysis:", ragAnalysis);
        }
      }
                          if (!ragAnalysis || !ragAnalysis.isLargeContext) {
                                  if (textBlob.length > maxChars) {
                                          textBlob = textBlob.slice(0,
          maxChars) + "\n[...]";
        }
      }
                          return {
                                    textBlob,
                  images,
                  ragAnalysis,
                  isLargeContext: ragAnalysis?.isLargeContext || false,
                  totalChars: ragAnalysis?.totalChars || textBlob.length
      };
    }
              catch (error) {
                          if (error.message.includes('Extension context invalidated')) {
                                  console.log("Taggle: Extension context invalidated, returning empty context data");
                                  return {
                                textBlob: "",
          images: [],
          ragAnalysis: null,
          isLargeContext: false
        };
      }
                          throw error;
    }
  }
          function makeFinalPrompt({
              contextText,
    userPrompt,
    liveContextText
  }) {
                  const processedPrompt = preprocessPrompt(userPrompt);
                  const parts = [];
                  if (liveContextText) {
                          parts.push(`LIVE CONTEXT (Selected Text):\n${liveContextText}`);
    }
                  if (contextText) {
                          parts.push(`TAG CONTEXT:\n${contextText}`);
    }
                  parts.push(`USER PROMPT:\n${processedPrompt}`);
                  return parts.join('\n\n');
  }
          function preprocessPrompt(userPrompt) {
                  const lowerPrompt = userPrompt.toLowerCase();
                  if (lowerPrompt.includes('tell ') || lowerPrompt.includes('message ') || lowerPrompt.includes('text ')) {
                          return `${userPrompt} (Write as a direct message starting with "Hey")`;
    }
                  return userPrompt;
  }
          function getTagColor(tagName) {
                  let hash = 0;
                  for (let i = 0;
              i < tagName.length;
              i++) {
                          hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
                  const colors = [      '#60a5fa',
            '#ef4444',
            '#fbbf24',
            '#a855f7',
            '#f472b6',
            '#fb923c'    ];
                  return colors[Math.abs(hash) % colors.length];
  }
          function distributeTagColors(tags) {
                  if (tags.length <= 1) return tags.map(tag => ({
                    ...tag,
      color: getTagColor(tag.name)
    }));
                  const colors = [      '#60a5fa',
            '#ef4444',
            '#fbbf24',
            '#a855f7',
            '#f472b6',
            '#fb923c'    ];
                  const tagColors = [];
                  let lastColorIndex = -1;
                  tags.forEach((tag, index) => {
                          let availableColors = colors.filter((_, colorIndex) => colorIndex !== lastColorIndex);
                          if (availableColors.length === 0) {
                                  availableColors = colors;
      }
                          let hash = 0;
                          for (let i = 0;
                    i < tag.name.length;
                    i++) {
                                  hash = tag.name.charCodeAt(i) + ((hash << 5) - hash);
      }
                          const colorIndex = Math.abs(hash) % availableColors.length;
                          const selectedColor = availableColors[colorIndex];
                          tagColors.push({
                          ...tag,
        color: selectedColor
      });
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
          let contextPreviewPanel = null;
          let excludedContexts = new Set();
            let liveContext = null;
            let floatingButton = null;
            function createTagDropdown() {
                  const dropdown = document.createElement('div');
                  dropdown.id = 'taggle-tag-selector';
                  const updateDropdownTheme = () => {
                          const theme = getThemeStyles();
                          dropdown.style.cssText = `        position: absolute;        background: ${theme.dropdown.background};        backdrop-filter: blur(20px);        -webkit-backdrop-filter: blur(20px);        border: ${theme.dropdown.border};        border-radius: 12px;        box-shadow: ${theme.dropdown.boxShadow};        max-height: 320px;        overflow: hidden;        z-index: 10000;        font-family: 'Ranade', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;        font-size: 13px;        display: none;        min-width: 280px;        max-width: 400px;      `;
    };
                  updateDropdownTheme();
                  dropdown.updateTheme = updateDropdownTheme;
                  document.body.appendChild(dropdown);
                  return dropdown;
  }
          function createFloatingButton() {
                  const button = document.createElement('div');
                  button.id = 'noma-floating-button';
                  button.title = 'Send to Noma';
                  button.innerHTML = `<img src="${chrome.runtime.getURL('Images/noma-logo.png')}" alt="Noma" />`;
                  button.style.display = 'none';
                  document.body.appendChild(button);
                  button.addEventListener('click', (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          captureLiveContext();
    });
                  return button;
  }
          function handleTextSelection(e) {
                  if (e.target.closest('#noma-floating-button') ||        e.target.closest('#taggle-tag-selector') ||        e.target.closest('#taggle-context-preview')) {
                          return;
    }
                  setTimeout(() => {
                          const selection = window.getSelection();
                          const selectedText = selection.toString().trim();
                          if (selectedText && selectedText.length > 0) {
                                  const range = selection.getRangeAt(0);
                                  const rect = range.getBoundingClientRect();
                                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                                  floatingButton.style.left = (rect.right + scrollLeft + 8) + 'px';
                                  floatingButton.style.top = (rect.top + scrollTop - 8) + 'px';
                                  floatingButton.style.display = 'flex';
                                  floatingButton.dataset.selectedText = selectedText;
      }
                    else {
                                  floatingButton.style.display = 'none';
      }
    },
    10);
  }
          function captureLiveContext() {
                  const selectedText = floatingButton.dataset.selectedText;
                  if (selectedText) {
                          liveContext = {
                                  text: selectedText,
                  timestamp: new Date().toISOString()
      };
                          floatingButton.style.display = 'none';
                          window.getSelection().removeAllRanges();
                          toast('Shared with Noma!');
                          console.log('Noma: Live Context captured:', liveContext);
    }
  }
          function clearLiveContext() {
                  liveContext = null;
                  console.log('Noma: Live Context cleared');
  }
          function createContextPreviewPanel() {
                  const panel = document.createElement('div');
                  panel.id = 'taggle-context-preview';
                  panel.style.cssText = `      position: absolute;      background: rgba(0, 0, 0, 0.9);      backdrop-filter: blur(25px);      -webkit-backdrop-filter: blur(25px);      border: 1px solid #000;      border-radius: 8px;      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);      max-height: 300px;      overflow-y: auto;      z-index: 10001;      font-family: 'Familjen Grotesk', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;      font-size: 11px;      display: none;      min-width: 200px;      max-width: 350px;      padding: 8px;      color: white;    `;
                  document.body.appendChild(panel);
                  return panel;
  }
          function positionDropdown(element, dropdown) {
                  const rect = element.getBoundingClientRect();
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                  let left = rect.left + scrollLeft;
                  let top = rect.top + scrollTop;
                  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                          const caretPos = getCaretPosition(element);
                          const text = getText(element);
                          const tempSpan = document.createElement('span');
                          tempSpan.style.cssText = `        position: absolute;        visibility: hidden;        white-space: pre;        font: ${window.getComputedStyle(element).font};        padding: ${window.getComputedStyle(element).padding};        border: ${window.getComputedStyle(element).border};      `;
                          tempSpan.textContent = text.substring(0,
      caretPos);
                          document.body.appendChild(tempSpan);
                          const textWidth = tempSpan.offsetWidth;
                          document.body.removeChild(tempSpan);
                          left = rect.left + scrollLeft + Math.min(textWidth,
      rect.width - 200);
                          top = rect.top + scrollTop + 25;
    }
              else {
                          top = rect.top + scrollTop + 25;
    }
                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  const dropdownWidth = 250;
                  const dropdownHeight = 200;
                  if (left + dropdownWidth > viewportWidth) {
                          left = viewportWidth - dropdownWidth - 10;
    }
                  if (left < 10) left = 10;
                  if (top + dropdownHeight > viewportHeight + scrollTop) {
                          top = rect.top + scrollTop - dropdownHeight - 5;
    }
                  dropdown.style.left = left + 'px';
                  dropdown.style.top = top + 'px';
                  dropdown.style.minWidth = '250px';
  }
          async function showTagSelector(element) {
                  console.log("Taggle: showTagSelector called with element:", element);
                  const tagsWithCounts = await getAllTagsWithContextCounts();
                  console.log("Taggle: Found tags with counts:", tagsWithCounts);
                  if (!tagsWithCounts.length) {
                          console.log("Taggle: No tags found");
                          toast("No tags found. Create some first.");
                          return;
    }
                  if (!tagDropdown) {
                          tagDropdown = createTagDropdown();
    }
                  currentElement = element;
                  tagSelectorActive = true;
                  excludedContexts.clear();
                  console.log("Taggle: Starting new tag selector session, cleared excluded contexts");
                  if (liveContext) {
                          console.log('Taggle: Live Context is active:',
      liveContext.text.substring(0,
      50) + '...');
    }
                  storedCaretPosition = getCaretPosition(element);
                    console.log('Taggle: showTagSelector debug:',
    {
                          elementType: element.tagName,
              isContentEditable: element.isContentEditable,
              currentText: getText(element),
              storedCaretPosition: storedCaretPosition
    });
                  const sortedTags = tagsWithCounts.sort((a, b) => {
                          const aIsDynamic = a.isCalendarTag || a.isGmailTag || a.isNotionTag || a.isPinterestTag;
                          const bIsDynamic = b.isCalendarTag || b.isGmailTag || b.isNotionTag || b.isPinterestTag;
                          if (aIsDynamic && !bIsDynamic) return -1;
                          if (!aIsDynamic && bIsDynamic) return 1;
                          return a.name.localeCompare(b.name);
    });
                  const tagsWithColors = distributeTagColors(sortedTags);
                  currentTagColors = tagsWithColors;
                  const dynamicTags = tagsWithColors.filter(tag => tag.isCalendarTag || tag.isGmailTag || tag.isNotionTag || tag.isPinterestTag);
                  const regularTags = tagsWithColors.filter(tag => !tag.isCalendarTag && !tag.isGmailTag && !tag.isNotionTag && !tag.isPinterestTag);
                  console.log('Taggle: Dynamic tags:',
    dynamicTags.map(t => ({
                    name: t.name,
      isCalendar: t.isCalendarTag,
      isGmail: t.isGmailTag,
      isNotion: t.isNotionTag,
      isPinterest: t.isPinterestTag
    })));
                  console.log('Taggle: Regular tags:',
    regularTags.map(t => t.name));
                  const renderTag = (tag,
    index,
    isDynamic = false) => {
                          const tagColor = tag.color;
                          const counts = tag.contextCounts || {
                          text: 0,
        pdf: 0,
        image: 0,
        calendar: 0,
        email: 0,
        notion: 0,
        pinterest: 0,
        total: 0
      };
                          const isCalendarTag = tag.isCalendarTag || false;
                          const isGmailTag = tag.isGmailTag || false;
                          const isNotionTag = tag.isNotionTag || false;
                          const isPinterestTag = tag.isPinterestTag || false;
                          const indicators = [];
                          if (isCalendarTag) {
                                  indicators.push(`<img src="${chrome.runtime.getURL('Images/gc-logo.png')}" style="          width: 14px;          height: 14px;          margin-right: 3px;          border-radius: 3px;          box-shadow: 0 2px 4px rgba(0,0,0,0.1);          border: 1px solid rgba(255,255,255,0.2);        " title="Google Calendar Tag" />`);
      }
                    else if (isGmailTag) {
                                  indicators.push(`<img src="${chrome.runtime.getURL('Images/email-logo.png')}" style="          width: 14px;          height: 14px;          margin-right: 3px;          border-radius: 3px;          box-shadow: 0 2px 4px rgba(0,0,0,0.1);          border: 1px solid rgba(255,255,255,0.2);        " title="Gmail Tag" />`);
      }
                    else if (isNotionTag) {
                                  indicators.push(`<img src="${chrome.runtime.getURL('Images/not-logo.png')}" style="          width: 14px;          height: 14px;          margin-right: 3px;          border-radius: 3px;          box-shadow: 0 2px 4px rgba(0,0,0,0.1);          border: 1px solid rgba(255,255,255,0.2);        " title="Notion Tag" />`);
      }
                    else if (isPinterestTag) {
                                  indicators.push(`<img src="${chrome.runtime.getURL('Images/pin-logo.png')}" style="          width: 14px;          height: 14px;          margin-right: 3px;          border-radius: 3px;          box-shadow: 0 2px 4px rgba(0,0,0,0.1);          border: 1px solid rgba(255,255,255,0.2);        " title="Pinterest Tag" />`);
      }
                    else {
                                  if (counts.text > 0) {
                                          indicators.push(`<span style="            display: inline-flex; align-items: center; justify-content: center;            min-width: 14px; height: 14px; border-radius: 3px; background: #3b82f6;            margin-right: 3px; font-size: 8px; font-weight: 600; color: white; line-height: 1;          " title="Text: ${counts.text}">${counts.text}</span>`);
        }
                                  if (counts.pdf > 0) {
                                          indicators.push(`<span style="            display: inline-flex; align-items: center; justify-content: center;            min-width: 14px; height: 14px; border-radius: 3px; background: #ef4444;            margin-right: 3px; font-size: 8px; font-weight: 600; color: white; line-height: 1;          " title="PDF: ${counts.pdf}">${counts.pdf}</span>`);
        }
                                  if (counts.image > 0) {
                                          indicators.push(`<span style="            display: inline-flex; align-items: center; justify-content: center;            min-width: 14px; height: 14px; border-radius: 3px; background: #eab308;            margin-right: 3px; font-size: 8px; font-weight: 600; color: white; line-height: 1;          " title="Images: ${counts.image}">${counts.image}</span>`);
        }
                                  if (counts.calendar > 0) {
                                          indicators.push(`<span style="            display: inline-flex; align-items: center; justify-content: center;            min-width: 14px; height: 14px; border-radius: 3px; background: #10b981;            margin-right: 3px; font-size: 8px; font-weight: 600; color: white; line-height: 1;          " title="Calendar: ${counts.calendar}">${counts.calendar}</span>`);
        }
                                  if (counts.email > 0) {
                                          indicators.push(`<span style="            display: inline-flex; align-items: center; justify-content: center;            min-width: 14px; height: 14px; border-radius: 3px; background: #f59e0b;            margin-right: 3px; font-size: 8px; font-weight: 600; color: white; line-height: 1;          " title="Email: ${counts.email}">${counts.email}</span>`);
        }
                                  if (counts.audio > 0) {
                                          indicators.push(`<img src="${chrome.runtime.getURL('Images/audio-logo.png')}" style="            width: 14px;            height: 14px;            margin-right: 3px;            border-radius: 3px;            box-shadow: 0 2px 4px rgba(0,0,0,0.1);            border: 1px solid rgba(255,255,255,0.2);          " title="Audio: ${counts.audio}" />`);
        }
      }
                          const theme = getThemeStyles();
                          const baseBackground = isDarkMode ? `${tagColor}20` : `${tagColor}15`;
                          const baseBorder = isDarkMode ? `${tagColor}40` : `${tagColor}30`;
                          const selectedBackground = isDarkMode ? `${tagColor}30` : `${tagColor}25`;
                          const selectedBorder = isDarkMode ? `${tagColor}60` : `${tagColor}50`;
                          const textColor = tagColor;
                          return `<div class="taggle-tag-item" data-tag="${tag.name}" data-index="${index}" data-tag-color="${tagColor}" style="        padding: 4px 12px; cursor: pointer; border-radius: 16px;        background: ${baseBackground}; border: 1px solid ${baseBorder};        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);        font-weight: 500; font-size: 12px; color: ${textColor};        white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;      ">        <span style="          display: inline-block; width: 5px; height: 5px; border-radius: 50%;          background: ${tagColor}; margin-right: 3px; opacity: 0.9;        "></span>        @${tag.name}        ${indicators.length > 0 ? `          <span class="tag-indicators" data-tag-id="${tag.id}" style="display: inline-flex; align-items: center; gap: 2px; margin-left: 6px;">            ${
                          indicators.join('')
      }
                              </span>        ` : ''}      </div>`;
    };
                  tagDropdown.innerHTML = `      <div style="        padding: 10px 16px 8px 16px;        background: transparent;        border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};        display: flex;        align-items: center;        justify-content: space-between;        gap: 12px;        border-radius: 12px 12px 0 0;      ">        <div style="display: flex; align-items: center; gap: 8px;">          <img src="${chrome.runtime.getURL('Images/noma-logo.png')}" style="            width: 28px;            height: 28px;            object-fit: contain;            cursor: pointer;          " title="Open Noma (Alt+T)" id="noma-logo-button" />          <span style="            font-size: 13px;            font-weight: 400;            font-family: 'Ranade', sans-serif;            color: ${isDarkMode ? '#ffffff' : '#000000'};            opacity: 0.8;          ">noma</span>        </div>        <div style="position: relative; display: inline-block;">          <svg style="            position: absolute;            left: 8px;            top: 50%;            transform: translateY(-50%);            width: 12px;            height: 12px;            opacity: 0.4;            pointer-events: none;          " viewBox="0 0 24 24" fill="none" stroke="${isDarkMode ? '#ffffff' : '#000000'}" stroke-width="2">            <circle cx="11" cy="11" r="8"></circle>            <path d="m21 21-4.35-4.35"></path>          </svg>          <input            type="text"            id="tag-search-input"            placeholder="Search your tags..."            style="              width: 120px;              padding: 3px 10px 3px 26px;              border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};              border-radius: 12px;              background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};              color: ${isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'};              font-size: 10px;              outline: none;            "          />        </div>      </div>      <div id="tag-list-container" style="        padding: 12px 16px; display: flex; flex-direction: column; gap: 12px;        max-height: 280px; overflow-y: auto;        background: ${isDarkMode ? '#0a0a0a' : '#ffffff'};      ">        ${dynamicTags.length > 0 ? `          <div style="display: flex; flex-wrap: wrap; gap: 8px;">            ${
                    dynamicTags.map((tag, index) => renderTag(tag,
      index,
      true)).join('')
    }
                        </div>        ` : ''}        ${dynamicTags.length > 0 && regularTags.length > 0 ? `          <div style="            height: 1px; background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};            margin: 4px 0;          "></div>        ` : ''}        ${regularTags.length > 0 ? `          <div style="display: flex; flex-wrap: wrap; gap: 8px;">            ${
                    regularTags.map((tag, index) => renderTag(tag,
      dynamicTags.length + index,
      false)).join('')
    }
                        </div>        ` : ''}      </div>      <div style="        padding: 8px 16px;        background: ${getThemeStyles().footer.background};        border-top: 1px solid ${getThemeStyles().footer.borderColor};        font-size: 8px; color: ${getThemeStyles().text.muted};        text-align: center; backdrop-filter: blur(10px);      ">        ↑↓ Navigate • Enter Select • Esc Cancel • Ctrl+D Dark Mode      </div>    `;
                  positionDropdown(element,
    tagDropdown);
                  tagDropdown.style.display = 'block';
                  const logoButton = tagDropdown.querySelector('#noma-logo-button');
                  if (logoButton) {
                          logoButton.onclick = () => {
                                  console.log('Noma: Logo button clicked in tag selector');
                                  chrome.runtime.sendMessage({
                                action: 'openPopup'
        });
      };
    }
                  const searchInput = tagDropdown.querySelector('#tag-search-input');
                  const tagListContainer = tagDropdown.querySelector('#tag-list-container');
                  if (searchInput) {
                          searchInput.addEventListener('input', (e) => {
                                  const searchTerm = e.target.value.toLowerCase().trim();
                                  const filteredDynamicTags = dynamicTags.filter(tag =>          tag.name.toLowerCase().includes(searchTerm)        );
                                  const filteredRegularTags = regularTags.filter(tag =>          tag.name.toLowerCase().includes(searchTerm)        );
                                  tagListContainer.innerHTML = `          ${filteredDynamicTags.length > 0 ? `            <div style="display: flex; flex-wrap: wrap; gap: 8px;">              ${
                                filteredDynamicTags.map((tag, index) => renderTag(tag,
          index,
          true)).join('')
        }
                                      </div>          ` : ''}          ${filteredDynamicTags.length > 0 && filteredRegularTags.length > 0 ? `            <div style="              height: 1px; background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};              margin: 4px 0;            "></div>          ` : ''}          ${filteredRegularTags.length > 0 ? `            <div style="display: flex; flex-wrap: wrap; gap: 8px;">              ${
                                filteredRegularTags.map((tag, index) => renderTag(tag,
          filteredDynamicTags.length + index,
          false)).join('')
        }
                                      </div>          ` : ''}          ${filteredDynamicTags.length === 0 && filteredRegularTags.length === 0 ? `            <div style="              text-align: center;              padding: 20px;              color: ${isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'};              font-size: 12px;            ">No tags found</div>          ` : ''}        `;
                                  attachTagEventListeners();
                                  selectedTagIndex = 0;
                                  updateTagSelection();
      });
                          setTimeout(() => searchInput.focus(),
      100);
    }
                  function attachTagEventListeners() {
                          tagDropdown.querySelectorAll('.taggle-tag-item').forEach((item, index) => {
                                  const tagName = item.dataset.tag;
                                  const actualIndex = parseInt(item.dataset.index);
                                  const tagColor = tagsWithColors[actualIndex]?.color || getTagColor(tagName);
                                  item.onclick = () => selectTag(item.dataset.tag);
                                  item.onmouseenter = () => {
                                          console.log("Taggle: MOUSE ENTER detected on tag:", tagName);
                                          selectedTagIndex = parseInt(item.dataset.index);
                                          updateTagSelection();
                                          document.querySelectorAll('.taggle-tag-item').forEach(t => t.removeAttribute('data-hovered'));
                                          item.setAttribute('data-hovered',
          'true');
                                          if (index !== selectedTagIndex) {
                                                  const hoverBackground = isDarkMode ? `${tagColor}25` : `${tagColor}20`;
                                                  const hoverBorder = isDarkMode ? `${tagColor}50` : `${tagColor}40`;
                                                  item.style.background = hoverBackground;
                                                  item.style.borderColor = hoverBorder;
                                                  item.style.transform = 'scale(1.01)';
          }
        };
                                  item.onmouseleave = () => {
                                          if (index !== selectedTagIndex) {
                                                  const baseBackground = isDarkMode ? `${tagColor}20` : `${tagColor}15`;
                                                  const baseBorder = isDarkMode ? `${tagColor}40` : `${tagColor}30`;
                                                  item.style.background = baseBackground;
                                                  item.style.borderColor = baseBorder;
                                                  item.style.transform = '';
          }
                                          setTimeout(() => {
                                                  if (!contextPreviewPanel?.matches(':hover') && !item.matches(':hover')) {
                                                          hideContextPreview();
            }
          },
          200);
        };
      });
                          tagDropdown.querySelectorAll('.tag-indicators').forEach(indicatorContainer => {
                                  const tagId = indicatorContainer.dataset.tagId;
                                  const tagElement = indicatorContainer.closest('.taggle-tag-item');
                                  indicatorContainer.onmouseenter = () => {
                                          console.log("Taggle: Hovering over indicators for tag ID:", tagId);
                                          if (tagId) {
                                                  const tag = currentTagColors.find(t => t.id === tagId);
                                                  if (tag && (tag.isCalendarTag || tag.isGmailTag || tag.isNotionTag || tag.isPinterestTag)) {
                                                          setTimeout(() => showDynamicTagInfo(tag,
              tagElement),
              100);
            }
                                      else {
                                                          setTimeout(() => showContextPreview(tagId,
              tagElement),
              100);
            }
          }
        };
                                  indicatorContainer.onmouseleave = () => {
                                          setTimeout(() => {
                                                  if (!contextPreviewPanel?.matches(':hover') && !indicatorContainer.matches(':hover')) {
                                                          hideContextPreview();
            }
          },
          200);
        };
      });
    }
                  attachTagEventListeners();
  }
          function updateTagSelection() {
                  if (!tagDropdown) return;
                  tagDropdown.querySelectorAll('.taggle-tag-item').forEach((item, index) => {
                          const itemIndex = parseInt(item.dataset.index);
                          const tagColor = item.dataset.tagColor || getTagColor(item.dataset.tag);
                          if (itemIndex === selectedTagIndex) {
                                  const baseBackground = isDarkMode ? `${tagColor}20` : `${tagColor}15`;
                                  const baseBorder = isDarkMode ? `${tagColor}40` : `${tagColor}30`;
                                  item.style.background = baseBackground;
                                  item.style.borderColor = baseBorder;
                                  item.style.transform = 'scale(1.02)';
                                  item.style.boxShadow = `0 2px 8px ${tagColor}20`;
                                  item.scrollIntoView({
                                          behavior: 'smooth',
                      block: 'nearest',
                      inline: 'nearest'
        });
      }
                    else {
                                  const baseBackground = isDarkMode ? `${tagColor}20` : `${tagColor}15`;
                                  const baseBorder = isDarkMode ? `${tagColor}40` : `${tagColor}30`;
                                  item.style.background = baseBackground;
                                  item.style.borderColor = baseBorder;
                                  item.style.transform = '';
                                  item.style.boxShadow = '';
      }
    });
  }
          function hideTagSelector() {
                  if (tagDropdown) {
                          tagDropdown.style.display = 'none';
    }
                  hideContextPreview();
                  tagSelectorActive = false;
                  currentElement = null;
  }
          function showDynamicTagInfo(tag, tagElement) {
                  console.log("Taggle: showDynamicTagInfo called for tag:", tag.name);
                  if (!contextPreviewPanel) {
                          contextPreviewPanel = createContextPreviewPanel();
    }
                  let infoContent = '';
                  if (tag.isCalendarTag) {
                          infoContent = `        <div style="          display: flex;          align-items: center;          gap: 8px;          margin-bottom: 8px;        ">          <img src="${chrome.runtime.getURL('Images/gc-logo.png')}" style="            width: 16px;            height: 16px;            border-radius: 2px;          " />          <div style="            font-size: 10px;            color: #fff;            font-weight: 600;          ">Google Calendar</div>        </div>        <div style="          font-size: 9px;          color: #ccc;          line-height: 1.4;          text-align: center;        ">Connected to your Google Calendar</div>      `;
    }
              else if (tag.isGmailTag) {
                          infoContent = `        <div style="          display: flex;          align-items: center;          gap: 8px;          margin-bottom: 8px;        ">          <img src="${chrome.runtime.getURL('Images/email-logo.png')}" style="            width: 16px;            height: 16px;            border-radius: 2px;          " />          <div style="            font-size: 10px;            color: #fff;            font-weight: 600;          ">Gmail</div>        </div>        <div style="          font-size: 9px;          color: #ccc;          line-height: 1.4;          text-align: center;        ">Connected to your Gmail</div>      `;
    }
              else if (tag.isNotionTag) {
                          infoContent = `        <div style="          display: flex;          align-items: center;          gap: 8px;          margin-bottom: 8px;        ">          <img src="${chrome.runtime.getURL('Images/not-logo.png')}" style="            width: 16px;            height: 16px;            border-radius: 2px;          " />          <div style="            font-size: 10px;            color: #fff;            font-weight: 600;          ">Notion</div>        </div>        <div style="          font-size: 9px;          color: #ccc;          line-height: 1.4;          text-align: center;        ">Connected to your Notion page</div>      `;
    }
              else if (tag.isPinterestTag) {
                          infoContent = `        <div style="          display: flex;          align-items: center;          gap: 8px;          margin-bottom: 8px;        ">          <img src="${chrome.runtime.getURL('Images/pin-logo.png')}" style="            width: 16px;            height: 16px;            border-radius: 2px;          " />          <div style="            font-size: 10px;            color: #fff;            font-weight: 600;          ">Pinterest</div>        </div>        <div style="          font-size: 9px;          color: #ccc;          line-height: 1.4;          text-align: center;        ">Connected to your Pinterest board</div>      `;
    }
                  contextPreviewPanel.innerHTML = `      <div style="padding: 4px;">        ${infoContent}      </div>    `;
                  const tagRect = tagElement.getBoundingClientRect();
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                  contextPreviewPanel.style.left = (tagRect.right + scrollLeft + 8) + 'px';
                  contextPreviewPanel.style.top = (tagRect.top + scrollTop) + 'px';
                  contextPreviewPanel.style.display = 'block';
                  console.log("Taggle: Showing dynamic tag info panel");
  }
          function hideContextPreview() {
                  if (contextPreviewPanel) {
                          contextPreviewPanel.style.display = 'none';
    }
  }
          async function showContextPreview(tagId, tagElement) {
                  console.log("Taggle: showContextPreview called with tagId:", tagId);
                  if (!contextPreviewPanel) {
                          contextPreviewPanel = createContextPreviewPanel();
                          console.log("Taggle: Created context preview panel");
    }
                  try {
                          const contexts = await getContexts(tagId);
                          console.log("Taggle: Retrieved contexts:", contexts.length,
      contexts);
                          if (!contexts.length) {
                                  console.log("Taggle: No contexts found, showing empty message instead");
                                  contextPreviewPanel.innerHTML = `          <div style="            font-size: 9px;            color: #ccc;            margin-bottom: 6px;            font-weight: 600;            text-transform: uppercase;            letter-spacing: 0.5px;          ">Empty Tag</div>          <div style="            font-size: 10px;            color: #999;            text-align: center;            padding: 8px;            font-style: italic;          ">No contexts saved yet.<br>Right-click content to save to this tag.</div>        `;
                                  const tagRect = tagElement.getBoundingClientRect();
                                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                                  contextPreviewPanel.style.left = (tagRect.right + scrollLeft + 8) + 'px';
                                  contextPreviewPanel.style.top = (tagRect.top + scrollTop) + 'px';
                                  contextPreviewPanel.style.display = 'block';
                                  console.log("Taggle: Showing empty tag message");
                                  return;
      }
                          const contextTags = contexts.map(ctx => {
                                  const isExcluded = excludedContexts.has(ctx.id);
                                  let color,
        typeLabel,
        displayText;
                                  if (ctx.type === "image") {
                                          color = "#eab308";
                                          typeLabel = "IMG";
                                          displayText = ctx.title || ctx.imageUrl || "Image";
        }
                          else if (ctx.source === "pdf-upload" || (ctx.title && ctx.title.startsWith("PDF:"))) {
                                          color = "#ef4444";
                                          typeLabel = "PDF";
                                          displayText = ctx.title ? ctx.title.replace("PDF: ",
          "") : "PDF Document";
        }
                          else {
                                          color = "#3b82f6";
                                          typeLabel = "TXT";
                                          displayText = ctx.title || (ctx.text ? ctx.text.substring(0,
          30) + "..." : "Text");
        }
                                  const isLocalFile = ctx.url && ctx.url.startsWith('file://');
                                  const canOpenLink = ctx.url && !isLocalFile;
                                  return `          <div class="context-item" data-context-id="${ctx.id}" data-url="${ctx.url || ''}" style="            display: flex;            align-items: center;            gap: 4px;            padding: 3px 6px;            margin: 2px 0;            border-radius: 12px;            background: ${isExcluded ? 'rgba(248, 113, 113, 0.15)' : color + '15'};            border: 1px solid ${isExcluded ? 'rgba(248, 113, 113, 0.4)' : color + '30'};            opacity: 1;            transition: all 0.2s ease;            cursor: ${canOpenLink ? 'pointer' : 'default'};            ${isExcluded ? 'position: relative;' : ''}            ${isLocalFile ? 'border-style: dashed;' : ''}          ">            ${isExcluded ? `              <div style="                position: absolute;                top: 50%;                left: 0;                right: 0;                height: 1px;                background: #f87171;                z-index: 1;                pointer-events: none;              "></div>            ` : ''}            <span style="              background: ${color};              color: white;              font-size: 7px;              font-weight: 700;              padding: 1px 3px;              border-radius: 3px;              min-width: 18px;              text-align: center;              z-index: 2;              position: relative;            ">${typeLabel}</span>            <span style="              flex: 1;              font-size: 10px;              color: ${isExcluded ? '#f87171' : 'white'};              overflow: hidden;              text-overflow: ellipsis;              white-space: nowrap;              z-index: 2;              position: relative;            ">${displayText}</span>            <button class="exclude-btn" data-context-id="${ctx.id}" style="              background: ${isExcluded ? '#000' : 'none'};              color: ${isExcluded ? '#fff' : '#f87171'};              border: 1px solid ${isExcluded ? '#000' : '#f87171'};              border-radius: 50%;              width: 12px;              height: 12px;              font-size: 8px;              font-weight: bold;              cursor: pointer;              display: flex;              align-items: center;              justify-content: center;              line-height: 1;              margin-left: 2px;              z-index: 2;              position: relative;            ">${isExcluded ? '✓' : '×'}</button>          </div>        `;
      }).join('');
                          contextPreviewPanel.innerHTML = `        <div style="          font-size: 9px;          color: #ccc;          margin-bottom: 6px;          font-weight: 600;          text-transform: uppercase;          letter-spacing: 0.5px;        ">Contexts (${contexts.length})</div>        ${contextTags}        <div style="          font-size: 8px;          color: #999;          margin-top: 6px;          text-align: center;          font-style: italic;        ">Click to open • × exclude • ✓ include</div>      `;
                          const tagRect = tagElement.getBoundingClientRect();
                          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                          contextPreviewPanel.style.left = (tagRect.right + scrollLeft + 8) + 'px';
                          contextPreviewPanel.style.top = (tagRect.top + scrollTop) + 'px';
                          contextPreviewPanel.style.display = 'block';
                          console.log("Taggle: Context preview panel positioned and shown");
                          contextPreviewPanel.querySelectorAll('.context-item').forEach(item => {
                                  item.onclick = (e) => {
                                          if (e.target.classList.contains('exclude-btn')) {
                                                  return;
          }
                                          const url = item.dataset.url;
                                          if (url && url.trim() && url !== '' && !url.startsWith('file://')) {
                                                  window.taggleLinkOpening = true;
                                                  window.open(url, '_blank');
                                                  setTimeout(() => {
                                                          window.taggleLinkOpening = false;
            },
            1000);
          }
        };
      });
                          contextPreviewPanel.querySelectorAll('.exclude-btn').forEach(btn => {
                                  btn.onclick = (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const contextId = btn.dataset.contextId;
                                          if (excludedContexts.has(contextId)) {
                                                  excludedContexts.delete(contextId);
          }
                                else {
                                                  excludedContexts.add(contextId);
          }
                                          showContextPreview(tagId,
          tagElement);
        };
      });
                          contextPreviewPanel.onmouseleave = () => {
                                  setTimeout(() => {
                                          if (!tagElement.matches(':hover')) {
                                                  hideContextPreview();
          }
        },
        200);
      };
    }
              catch (error) {
                          console.warn("Taggle: Could not show context preview:", error);
                          hideContextPreview();
    }
  }
          function getCurrentTagIdFromElement(tagElement) {
                  const tagName = tagElement.dataset.tag;
                  return currentTagColors.find(t => t.name === tagName)?.id;
  }
          function showTestPreview(tagElement) {
                  console.log("Taggle: Showing test preview panel");
                  if (!contextPreviewPanel) {
                          contextPreviewPanel = createContextPreviewPanel();
                          console.log("Taggle: Created new context preview panel");
    }
                  contextPreviewPanel.innerHTML = `      <div style="        font-size: 9px;        color: #6b7280;        margin-bottom: 6px;        font-weight: 600;        text-transform: uppercase;        letter-spacing: 0.5px;      ">TEST PREVIEW</div>      <div style="        display: flex;        align-items: center;        gap: 6px;        padding: 3px 6px;        margin: 2px 0;        border-radius: 12px;        background: #3b82f615;        border: 1px solid #3b82f630;      ">        <span style="          background: #3b82f6;          color: white;          font-size: 7px;          font-weight: 700;          padding: 1px 3px;          border-radius: 3px;          min-width: 18px;          text-align: center;        ">TEST</span>        <span style="          flex: 1;          font-size: 10px;          color: #374151;        ">This is a test preview panel</span>      </div>    `;
                  const tagRect = tagElement.getBoundingClientRect();
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                  contextPreviewPanel.style.left = (tagRect.right + scrollLeft + 8) + 'px';
                  contextPreviewPanel.style.top = (tagRect.top + scrollTop) + 'px';
                  contextPreviewPanel.style.display = 'block';
                  contextPreviewPanel.style.backgroundColor = 'red';
                    contextPreviewPanel.style.border = '3px solid blue';
                  contextPreviewPanel.style.zIndex = '99999';
                  console.log("Taggle: Test preview panel positioned at:", contextPreviewPanel.style.left,
    contextPreviewPanel.style.top);
                  console.log("Taggle: Panel element:", contextPreviewPanel);
                  console.log("Taggle: Panel display style:", contextPreviewPanel.style.display);
                  console.log("Taggle: Panel computed style:",
    window.getComputedStyle(contextPreviewPanel));
  }
          function selectTag(tagName) {
                  if (!currentElement) return;
                  const tagText = '@' + tagName + ' ';
                  console.log('Taggle: selectTag debug:', {
                          tagName: tagName,
              tagText: tagText,
              elementType: currentElement.tagName,
              isContentEditable: currentElement.isContentEditable
    });
                  let codeMirrorInstance = null;
                  if (currentElement.CodeMirror) {
                          codeMirrorInstance = currentElement.CodeMirror;
    }
              else if (currentElement.closest && currentElement.closest('.CodeMirror')) {
                          const cmElement = currentElement.closest('.CodeMirror');
                          codeMirrorInstance = cmElement.CodeMirror;
    }
                  if (!codeMirrorInstance && currentElement.tagName === 'TEXTAREA') {
                          const parent = currentElement.parentElement;
                          if (parent && parent.classList.contains('CodeMirror')) {
                                  codeMirrorInstance = parent.CodeMirror;
      }
                    else if (parent && parent.parentElement && parent.parentElement.classList.contains('CodeMirror')) {
                                  codeMirrorInstance = parent.parentElement.CodeMirror;
      }
    }
                  if (codeMirrorInstance) {
                          console.log('Taggle: CodeMirror detected, using CodeMirror API');
                          try {
                                  const cursor = codeMirrorInstance.getCursor();
                                  codeMirrorInstance.replaceRange(tagText,
        cursor);
                                  codeMirrorInstance.focus();
                                  hideTagSelector();
                                  return;
      }
                    catch (e) {
                                  console.error('Taggle: CodeMirror insertion failed:', e);
      }
    }
                  if (currentElement.isContentEditable) {
                          currentElement.focus();
                          if (storedCaretPosition !== null) {
                                  try {
                                          const selection = window.getSelection();
                                          const range = document.createRange();
                                          const walker = document.createTreeWalker(            currentElement,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false          );
                                          let currentPos = 0;
                                          let targetNode = null;
                                          let targetOffset = 0;
                                          while (walker.nextNode()) {
                                                  const node = walker.currentNode;
                                                  const nodeLength = node.textContent.length;
                                                  if (currentPos + nodeLength >= storedCaretPosition) {
                                                          targetNode = node;
                                                          targetOffset = storedCaretPosition - currentPos;
                                                          break;
            }
                                                  currentPos += nodeLength;
          }
                                          if (targetNode) {
                                                  range.setStart(targetNode,
            targetOffset);
                                                  range.collapse(true);
                                                  selection.removeAllRanges();
                                                  selection.addRange(range);
          }
        }
                          catch (e) {
                                          console.warn('Taggle: Could not restore cursor position:', e);
        }
      }
                          if (document.execCommand) {
                                  document.execCommand('insertText',
        false,
        tagText);
      }
                    else {
                                  const selection = window.getSelection();
                                  if (selection.rangeCount > 0) {
                                          const range = selection.getRangeAt(0);
                                          range.deleteContents();
                                          range.insertNode(document.createTextNode(tagText));
                                          range.collapse(false);
                                          selection.removeAllRanges();
                                          selection.addRange(range);
        }
      }
                          currentElement.dispatchEvent(new Event("input",
      {
                          bubbles: true,
        cancelable: true
      }));
                          currentElement.dispatchEvent(new Event("change",
      {
                          bubbles: true,
        cancelable: true
      }));
    }
              else {
                          const text = getText(currentElement);
                          const caretPos = storedCaretPosition !== null ? storedCaretPosition : (currentElement.selectionStart || 0);
                          console.log('Taggle: Textarea insertion:', {
                                  originalText: text,
                  caretPos: caretPos,
                  storedCaretPosition: storedCaretPosition,
                  selectionStart: currentElement.selectionStart
      });
                          const beforeCaret = text.substring(0,
      caretPos);
                          const afterCaret = text.substring(caretPos);
                          const newText = beforeCaret + tagText + afterCaret;
                          console.log('Taggle: New text:', newText);
                          currentElement.focus();
                          let inserted = false;
                          try {
                                  currentElement.setSelectionRange(caretPos,
        caretPos);
                                  inserted = document.execCommand('insertText',
        false,
        tagText);
                                  console.log('Taggle: execCommand result:', inserted);
      }
                    catch (e) {
                                  console.log('Taggle: execCommand not available:', e);
      }
                          if (!inserted) {
                                  currentElement.value = newText;
                                  const newCaretPos = caretPos + tagText.length;
                                  currentElement.setSelectionRange(newCaretPos,
        newCaretPos);
                                  currentElement.dispatchEvent(new InputEvent("input",
        {
                                            bubbles: true,
                      cancelable: true,
                      inputType: 'insertText',
                      data: tagText
        }));
                                  currentElement.dispatchEvent(new Event("change",
        {
                                bubbles: true,
          cancelable: true
        }));
      }
                          console.log('Taggle: Textarea updated');
    }
                  hideTagSelector();
  }
          function getCaretPosition(element) {
                  if (!element) {
                          return 0;
    }
                  if (element.selectionStart !== undefined) {
                          return element.selectionStart;
    }
                  if (element.isContentEditable) {
                          const selection = window.getSelection();
                          if (selection.rangeCount > 0) {
                                  const range = selection.getRangeAt(0);
                                  const preCaretRange = range.cloneRange();
                                  preCaretRange.selectNodeContents(element);
                                  preCaretRange.setEnd(range.startContainer, range.startOffset);
                                  const textBeforeCaret = preCaretRange.cloneContents();
                                  const tempDiv = document.createElement('div');
                                  tempDiv.appendChild(textBeforeCaret);
                                  let textContent = tempDiv.innerHTML          .replace(/<div[^>]*>/gi,
        '\n')          .replace(/<br[^>]*>/gi,
        '\n')          .replace(/<p[^>]*>/gi,
        '\n')          .replace(/<\/div>/gi,
        '')          .replace(/<\/p>/gi,
        '')          .replace(/<[^>]*>/g,
        '');
                                  const tempTextDiv = document.createElement('div');
                                  tempTextDiv.innerHTML = textContent;
                                  textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';
                                  textContent = textContent.replace(/\n\n+/g,
        '\n\n');
                                  console.log('Taggle: getCaretPosition debug:',
        {
                                          rawHTML: tempDiv.innerHTML,
                      processedText: JSON.stringify(textContent),
                      length: textContent.length
        });
                                  return textContent.length;
      }
    }
                  return getText(element).length;
  }
          function activeEditable() {
                  if (window.location.hostname === 'web.whatsapp.com') {
                          const whatsappEditor = document.querySelector('#main div[contenteditable="true"]');
                          if (whatsappEditor) return whatsappEditor;
    }
                  const el = document.activeElement;
                  console.log("Taggle: activeEditable() - activeElement:", el);
                  console.log("Taggle: activeEditable() - tagName:", el?.tagName);
                  console.log("Taggle: activeEditable() - isContentEditable:", el?.isContentEditable);
                  console.log("Taggle: activeEditable() - type:", el?.type);
                  if (!el) {
                          console.log("Taggle: activeEditable() - No active element found");
                          return null;
    }
                  if (el.isContentEditable ||        el.tagName === 'TEXTAREA' ||        (el.tagName === 'INPUT' && (el.type || "").toLowerCase() !== "password")) {
                          console.log("Taggle: activeEditable() - Found valid editable element:", el);
                          return el;
    }
                  console.log("Taggle: activeEditable() - Element is not editable");
                  return null;
  }
          function getText(el) {
                  if (!el) return "";
                  if (el.isContentEditable) {
                          let textContent = el.innerHTML        .replace(/<div[^>]*>/gi,
      '\n')        .replace(/<br[^>]*>/gi,
      '\n')        .replace(/<p[^>]*>/gi,
      '\n')        .replace(/<\/div>/gi,
      '')        .replace(/<\/p>/gi,
      '')        .replace(/<[^>]*>/g,
      '');
                          const tempTextDiv = document.createElement('div');
                          tempTextDiv.innerHTML = textContent;
                          textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';
                          textContent = textContent.replace(/\n\n+/g,
      '\n\n');
                          return textContent;
    }
              else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                          return el.value || "";
    }
                  return "";
  }
          function setText(el, text, isSpinner = false) {
                  if (!el) {
                          console.warn("Taggle: setText called with null element");
                          return;
    }
                  console.log("Taggle: setText called", {
                          tagName: el.tagName,
              isContentEditable: el.isContentEditable,
              textLength: text.length,
              isSpinner: isSpinner
    });
                  if (el.isContentEditable) {
                          el.focus();
                          try {
                                  const selection = window.getSelection();
                                  const range = document.createRange();
                                  range.selectNodeContents(el);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                  setTimeout(() => {
                                          const clipboardData = new DataTransfer();
                                          clipboardData.setData('text/plain',
          text);
                                          const pasteEvent = new ClipboardEvent('paste',
          {
                                                  bubbles: true,
                          cancelable: true,
                          clipboardData: clipboardData,
          });
                                          el.dispatchEvent(pasteEvent);
                                          console.log("Taggle: Paste event dispatched successfully");
        }, 10);
                                  if (!isSpinner) {
                                          setTimeout(() => {
                                                  const selection = window.getSelection();
                                                  const range = document.createRange();
                                                  range.selectNodeContents(el);
                                                  range.collapse(false);
                                                    selection.removeAllRanges();
                                                  selection.addRange(range);
          },
          50);
        }
      }
                    catch (error) {
                                  console.error("Taggle: Error setting text in contentEditable:", error);
      }
    }
              else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                          el.value = text;
                          if (!isSpinner) {
                                  el.selectionStart = el.selectionEnd = text.length;
      }
                          el.dispatchEvent(new InputEvent("input",
      {
                          bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
                          el.dispatchEvent(new Event("input",
      {
                          bubbles: true,
        cancelable: true
      }));
                          el.dispatchEvent(new Event("change",
      {
                          bubbles: true,
        cancelable: true
      }));
                          console.log("Taggle: Text set in input/textarea successfully");
    }
  }
          function toast(msg, ms = 2000) {
                  const n = document.createElement("div");
                  n.textContent = msg;
                  Object.assign(n.style,
    {
                          position: "fixed",
      top: "28%",
      left: "50%",
      transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,.85)",
      color: "#fff",
      padding: "8px 10px",
              borderRadius: "8px",
      zIndex: 999999,
      fontFamily: "'Ranade', system-ui",
      fontSize: "12px"
    });
                  document.body.appendChild(n);
                  setTimeout(() => n.remove(),
    ms);
  }
          const SPIN = ["⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏"];
          let floatingSpinner = null;
          function createFloatingSpinner(el) {
                  if (floatingSpinner) {
                          floatingSpinner.remove();
    }
                  floatingSpinner = document.createElement('div');
                  floatingSpinner.style.cssText = `      position: fixed;      top: 50%;      left: 50%;      transform: translate(-50%, -50%);      background: rgba(0, 0, 0, 0.85);      color: #fff;      padding: 12px 16px;      border-radius: 8px;      font-family: 'Ranade', system-ui;      font-size: 18px;      z-index: 999999;      pointer-events: none;      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);    `;
                  document.body.appendChild(floatingSpinner);
                  let i = 0;
                  const id = setInterval(() => {
                          if (floatingSpinner) {
                                  floatingSpinner.textContent = SPIN[i = (i + 1) % SPIN.length];
      }
    },
    90);
                  return () => {
                          clearInterval(id);
                          if (floatingSpinner) {
                                  floatingSpinner.remove();
                                  floatingSpinner = null;
      }
    };
  }
          function startSpinner(el) {
                  if (el.isContentEditable) {
                          return createFloatingSpinner(el);
    }
                  let i = 0;
                  const id = setInterval(() => setText(el,
    SPIN[i = (i + 1) % SPIN.length],
    true),
    90);
                  return () => clearInterval(id);
  }
          function startPartialSpinner(el, beforeText) {
                  if (el.isContentEditable) {
                          return createFloatingSpinner(el);
    }
                  let i = 0;
                  const id = setInterval(() => {
                          const spinnerText = beforeText + SPIN[i = (i + 1) % SPIN.length];
                          setText(el,
      spinnerText,
      true);
    },
    90);
                  return () => clearInterval(id);
  }
          let _progressEl = null,
  _progressTimer = null;
          function progressToast(text) {
                  if (!text) {
                          if (_progressEl) {
                          _progressEl.remove();
                          _progressEl = null;
      }
                          if (_progressTimer) {
                          clearTimeout(_progressTimer);
                          _progressTimer = null;
      }
                          return;
    }
                  if (!_progressEl) {
                          _progressEl = document.createElement("div");
                          Object.assign(_progressEl.style,
      {
                                  position: "fixed",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
                  background: "rgba(20,20,20,.92)",
        color: "#fff",
        padding: "8px 10px",
                  borderRadius: "8px",
        zIndex: 999999,
        fontFamily: "'Ranade', system-ui",
        fontSize: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,.35)"
      });
                          document.body.appendChild(_progressEl);
    }
                  _progressEl.textContent = text;
                  if (_progressTimer) clearTimeout(_progressTimer);
                  _progressTimer = setTimeout(() => progressToast(""),
    2500);
  }
          let isDarkMode = false;
          function getThemeStyles() {
                  if (isDarkMode) {
                          return {
                                  dropdown: {
                                          background: 'rgba(0, 0, 0, 0.98)',
                      border: '1px solid rgba(18, 18, 18, 0.47)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)'
        },
                  tagItem: {
                                          background: '#0f0f0f',
                      borderColor: '#1a1a1a',
                      hoverBackground: '#1a1a1a'
        },
                  text: {
                                          primary: '#ffffff',
                      secondary: '#9ca3af',
                      muted: '#4b5563'
        },
                  footer: {
                                          background: 'rgba(0, 0, 0, 0.9)',
                      borderColor: 'rgba(0, 0, 0, 0.9)'
        }
      };
    }
              else {
                          return {
                                  dropdown: {
                                          background: 'rgba(255, 255, 255, 0.85)',
                      border: 'none',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
        },
                  tagItem: {
                                          background: '#ffffff',
                      borderColor: 'rgba(0, 0, 0, 0.04)',
                      hoverBackground: 'rgba(248, 249, 250, 0.8)'
        },
                  text: {
                                          primary: '#1f2937',
                      secondary: '#6b7280',
                      muted: '#9ca3af'
        },
                  footer: {
                                          background: 'transparent',
                      borderColor: 'transparent'
        }
      };
    }
  }
          function updatePlaceholderColor() {
                  const placeholderColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(128, 128, 128, 0.4)';
                  document.documentElement.style.setProperty('--taggle-placeholder-color',
    placeholderColor);
  }
          function toggleTheme() {
                  isDarkMode = !isDarkMode;
                  console.log('Taggle: Theme toggled, isDarkMode:',
    isDarkMode);
                  localStorage.setItem('taggle-dark-mode',
    isDarkMode.toString());
                  updatePlaceholderColor();
                  const dropdown = document.getElementById('taggle-tag-selector');
                  if (dropdown && dropdown.style.display !== 'none' && currentElement) {
                          if (dropdown.updateTheme) {
                                  dropdown.updateTheme();
      }
                          hideTagSelector();
                          if (currentElement && document.contains(currentElement)) {
                                  setTimeout(() => showTagSelector(currentElement),
        50);
      }
    }
  }
          function initializeTheme() {
                  const savedTheme = localStorage.getItem('taggle-dark-mode');
                  if (savedTheme === 'true') {
                          isDarkMode = true;
    }
                  updatePlaceholderColor();
  }
          initializeTheme();
          document.addEventListener('keydown', (e) => {
                  console.log("Taggle: CAPTURE - Key pressed:", e.key,
    "Code:",
    e.code,
    "Ctrl:",
    e.ctrlKey,
    "Meta:",
    e.metaKey,
    "KeyCode:",
    e.keyCode);
                  if ((e.key === 'q' || e.key === 'Q' || e.code === 'KeyQ') && (e.ctrlKey || e.metaKey)) {
                          console.log("Taggle: CAPTURE - Ctrl+Q detected");
                          const el = activeEditable();
                          console.log("Taggle: CAPTURE - Active element:", el);
                          if (el) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.stopImmediatePropagation();
                                  console.log("Taggle: CAPTURE - Showing tag selector");
                                  showTagSelector(el);
                                  return;
      }
                    else {
                                  console.log("Taggle: CAPTURE - No active editable element found, trying to find any editable element");
                                  const fallbackElement = document.querySelector(`          input[type="text"],          input:not([type]),          input[type="search"],          input[type="email"],          input[type="url"],          textarea,          [contenteditable="true"],          [role="textbox"],          .ql-editor,          .DraftEditor-editorContainer,          .notranslate[contenteditable],          #main div[contenteditable="true"]        `.replace(/\s+/g,
        ' ').trim());
                                  if (fallbackElement) {
                                          console.log("Taggle: CAPTURE - Found fallback editable element:", fallbackElement);
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.stopImmediatePropagation();
                                          fallbackElement.focus();
                                          showTagSelector(fallbackElement);
                                          return;
        }
                          else {
                                          console.log("Taggle: CAPTURE - No editable elements found on page");
                                          toast("Please click on a text input field first, then press Ctrl+Q");
        }
      }
    }
  },
  true);
            document.addEventListener('keydown', (e) => {
                  console.log("Taggle: Key pressed:", e.key,
    "Code:",
    e.code,
    "Ctrl:",
    e.ctrlKey,
    "Meta:",
    e.metaKey,
    "KeyCode:",
    e.keyCode);
                  if ((e.key === 'q' || e.key === 'Q' || e.code === 'KeyQ') && (e.ctrlKey || e.metaKey)) {
                          console.log("Taggle: Ctrl+Q detected");
                          const el = activeEditable();
                          console.log("Taggle: Active element:", el);
                          if (el) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.stopImmediatePropagation();
                                    console.log("Taggle: Showing tag selector");
                                  showTagSelector(el);
                                  return;
      }
                    else {
                                  console.log("Taggle: No active editable element found, trying to find any editable element");
                                  const fallbackElement = document.querySelector(`          input[type="text"],          input:not([type]),          input[type="search"],          input[type="email"],          input[type="url"],          textarea,          [contenteditable="true"],          [role="textbox"],          .ql-editor,          .DraftEditor-editorContainer,          .notranslate[contenteditable],          #main div[contenteditable="true"]        `.replace(/\s+/g,
        ' ').trim());
                                  if (fallbackElement) {
                                          console.log("Taggle: Found fallback editable element:", fallbackElement);
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.stopImmediatePropagation();
                                          fallbackElement.focus();
                                          showTagSelector(fallbackElement);
                                          return;
        }
                          else {
                                          console.log("Taggle: No editable elements found on page");
                                          toast("Please click on a text input field first, then press Ctrl+Q");
        }
      }
    }
                  if (e.key === 'd' && (e.ctrlKey || e.metaKey) && tagSelectorActive) {
                          e.preventDefault();
                          toggleTheme();
                          return;
    }
                  if (tagSelectorActive && tagDropdown && tagDropdown.style.display === 'block') {
                          const items = tagDropdown.querySelectorAll('.taggle-tag-item');
                          if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  selectedTagIndex = (selectedTagIndex + 1) % items.length;
                                  updateTagSelection();
      }
                    else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  selectedTagIndex = (selectedTagIndex - 1 + items.length) % items.length;
                                  updateTagSelection();
      }
                    else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const selectedItem = items[selectedTagIndex];
                                  if (selectedItem) selectTag(selectedItem.dataset.tag);
      }
                    else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  hideTagSelector();
      }
    }
  },
  true);
          document.addEventListener('click', (e) => {
                  if (tagDropdown && !tagDropdown.contains(e.target) && tagSelectorActive) {
                          if (contextPreviewPanel && contextPreviewPanel.contains(e.target)) {
                                  return;
      }
                          if (window.taggleLinkOpening) {
                                  return;
      }
                          hideTagSelector();
    }
  });
          window.addEventListener('focus', () => {
                  if (window.taggleLinkOpening) {
                          return;
    }
  });
          window.addEventListener('blur', () => {
                  if (window.taggleLinkOpening) {
                          return;
    }
  });
          document.addEventListener("keydown", async (e) => {
                  if (e.key !== " " || !(e.ctrlKey || e.metaKey)) return;
                    let el = activeEditable();
                  if (!el) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const original = getText(el);
                  if (!original.trim()) return;
                  const caretPos = getCaretPosition(el);
                  const tagInfo = findTagInText(original,
    caretPos);
                  let finalPromptText = original.trim();
                    let beforeTagText = "";
                  let contextData = null;
                  let hasImages = false;
                  if (tagInfo) {
                          console.log("Taggle: Found @tag in text:", tagInfo);
                          const tag = await findTagByName(tagInfo.tagName);
                          beforeTagText = tagInfo.beforeTag;
                          if (!tag) {
                                  console.log("Taggle: Tag not found:", tagInfo.tagName);
                                  finalPromptText = tagInfo.userPrompt;
      }
                    else {
                                  console.log("Taggle: Found tag:", tag);
                                  contextData = await buildContextData(tag.id);
                                  hasImages = contextData.images.length > 0;
                                  console.log("Taggle: Context text length:", contextData.textBlob.length);
                                  console.log("Taggle: Images found:", contextData.images.length);
                                  console.log("Taggle: Context preview:",
        contextData.textBlob.substring(0,
        200) + "...");
                                  if (!hasImages) {
                                          if (contextData.textBlob.length > 25000 && window.taggleRAG) {
                                                  console.log("Taggle RAG: Large context detected, using semantic search");
                                                  if (!window.taggleRAG.hasApiKey()) {
                                                          console.warn("Taggle RAG: No API key available, falling back to full context");
                                                          finalPromptText = makeFinalPrompt({
                                                                  liveContextText: liveContext ? liveContext.text : null,
                                  contextText: contextData.textBlob,
                                  userPrompt: tagInfo.userPrompt
              });
            }
                                      else {
                                                          try {
                                                                  const contextId = `tag_${tag.id}_context`;
                                                                  await window.taggleRAG.processLargeContext(contextData.textBlob,
                contextId,
                tag.id);
                                                                const ragResults = await window.taggleRAG.searchChunks(tagInfo.userPrompt,
                tag.id,
                3);
                                                                if (ragResults && ragResults.length > 0) {
                                                                        const relevantContext = ragResults.map((result, index) =>                  `[Relevant Context ${index + 1} (similarity: ${result.score.toFixed(2)})]\n${result.chunk.text}`                ).join('\n\n');
                                                                        console.log(`Taggle RAG: Found ${ragResults.length} relevant chunks`);
                                                                        console.log("Taggle RAG: Relevant context preview:",
                  relevantContext.substring(0,
                  300) + "...");
                                                                        finalPromptText = makeFinalPrompt({
                                                                                liveContextText: liveContext ? liveContext.text : null,
                                        contextText: relevantContext,
                                        userPrompt: tagInfo.userPrompt
                  });
                }
                                                  else {
                                                                        console.log("Taggle RAG: No relevant chunks found, falling back to full context");
                                                                        finalPromptText = makeFinalPrompt({
                                                                                liveContextText: liveContext ? liveContext.text : null,
                                        contextText: contextData.textBlob,
                                        userPrompt: tagInfo.userPrompt
                  });
                }
              }
                                            catch (ragError) {
                                                                console.error("Taggle RAG: Search failed, falling back to full context:",
                ragError);
                                                                finalPromptText = makeFinalPrompt({
                                                                        liveContextText: liveContext ? liveContext.text : null,
                                    contextText: contextData.textBlob,
                                    userPrompt: tagInfo.userPrompt
                });
              }
            }
          }
                                else {
                                                  finalPromptText = makeFinalPrompt({
                                                          liveContextText: liveContext ? liveContext.text : null,
                              contextText: contextData.textBlob,
                              userPrompt: tagInfo.userPrompt
            });
          }
                                          console.log("Taggle: Final prompt length:", finalPromptText.length);
                                          console.log("Taggle: Final prompt preview:",
          finalPromptText.substring(0,
          300) + "...");
        }
      }
    }
              else {
                          console.log("Taggle: No @tag syntax detected, using raw text");
    }
                  if (el.isContentEditable) {
                          try {
                                  el.focus();
                                  el.textContent = '';
                                  el.innerText = '';
                                  const selection = window.getSelection();
                                  const range = document.createRange();
                                  range.selectNodeContents(el);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                  const clipboardData = new DataTransfer();
                                  clipboardData.setData('text/plain',
        '');
                                  const pasteEvent = new ClipboardEvent('paste',
        {
                                          bubbles: true,
                      cancelable: true,
                      clipboardData: clipboardData,
        });
                                  el.dispatchEvent(pasteEvent);
                                  el.dispatchEvent(new Event('input',
        {
                                bubbles: true
        }));
                                  el.dispatchEvent(new Event('change',
        {
                                bubbles: true
        }));
                                  console.log("Taggle: Text box cleared for contentEditable");
      }
                    catch (error) {
                                  console.error("Taggle: Error clearing contentEditable:", error);
      }
    }
                  const stopSpin = tagInfo ? startPartialSpinner(el,
    beforeTagText) : startSpinner(el);
                  const capturedLiveContext = liveContext ? liveContext.text : null;
                  clearLiveContext();
                  if (capturedLiveContext) {
                          console.log('Noma: Using Live Context in prompt:',
      capturedLiveContext.substring(0,
      100) + '...');
    }
                  const ctrl = new AbortController();
                  const onEsc = (ev) => {
                    if (ev.key === "Escape") ctrl.abort();
    };
                  window.addEventListener("keydown",
    onEsc,
    {
                    once: true
    });
                  try {
                          let answer;
                          if (hasImages && contextData && contextData.images.length > 0) {
                                  console.log("Taggle: Using multimodal prompt with images");
                                  answer = await runMultimodalPrompt(contextData, tagInfo.userPrompt,
        ctrl.signal);
      }
                    else {
                                  console.log("Taggle: Using text-only prompt");
                                  answer = await runPrompt(finalPromptText, ctrl.signal);
      }
                          stopSpin();
                          if (tagInfo) {
                                  const newText = beforeTagText + answer;
                                  setText(el,
        newText);
                                  console.log("Taggle: Replaced from @tag onwards. Before:",
        beforeTagText,
        "Answer:",
        answer.substring(0,
        100) + "...");
      }
                    else {
                                  setText(el,
        answer);
      }
    }
              catch (err) {
                          stopSpin();
                          setText(el,
      original);
                          if (err?.name === "AbortError") console.log("Taggle: cancelled");
                          else {
                          console.error("[Taggle] Prompt failed:", err);
      }
    }
              finally {
                          window.removeEventListener("keydown",
      onEsc);
    }
  },
  true);
          floatingButton = createFloatingButton();
          document.addEventListener('mouseup',
  handleTextSelection);
          document.addEventListener('touchend',
  handleTextSelection);
          document.addEventListener('mousedown', (e) => {
                  if (!e.target.closest('#noma-floating-button')) {
                          setTimeout(() => {
                                  if (floatingButton && floatingButton.style.display !== 'none') {
                                          floatingButton.style.display = 'none';
        }
      },
      100);
    }
  });
})();