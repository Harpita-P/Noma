class PDFExtractor {
      static isInitialized = false;
      static async initialize() {
            if (this.isInitialized) return;
            try {
                  if (typeof window !== 'undefined' && !window.pdfjsLib) {
                        await this.loadPDFJSScript();
      }
                  if (window.pdfjsLib) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
                        console.log("Noma: PDF.js worker configured:", window.pdfjsLib.GlobalWorkerOptions.workerSrc);
      }
                  if (!window.pdfjsLib?.getDocument) {
                        throw new Error('PDF.js failed to initialize - check workerSrc URL and MV3 permissions');
      }
                  this.isInitialized = true;
                  console.log("Noma: PDF.js initialized successfully");
    }
        catch (error) {
                  console.error("Noma: Failed to initialize PDF.js:", error);
                  throw error;
    }
  }
      static async loadPDFJSScript() {
            return new Promise((resolve, reject) => {
                  if (window.pdfjsLib) {
                        resolve();
                        return;
      }
                  const script = document.createElement('script');
                  script.type = 'module';
                  script.src = chrome.runtime.getURL('lib/pdf-loader.js');
                  const handleLoad = () => {
                        console.log("Noma: PDF.js module loaded");
                        resolve();
      };
                  const handleError = (error) => {
                        console.error("Noma: Failed to load PDF.js module:", error);
                        reject(new Error('Failed to load PDF.js module'));
      };
                  window.addEventListener('pdfjs-ready',
      handleLoad,
      {
                once: true
      });
                  script.onerror = handleError;
                  document.head.appendChild(script);
                  setTimeout(() => {
                        if (!window.pdfjsLib) {
                              window.removeEventListener('pdfjs-ready',
          handleLoad);
                              reject(new Error('PDF.js loading timeout - module may not be compatible'));
        }
      },
      10000);
    });
  }
      static async extractText(file) {
            try {
                  await this.initialize();
                  console.log("Noma: Starting PDF text extraction for:", file.name);
                  const arrayBuffer = await file.arrayBuffer();
                  const loadingTask = window.pdfjsLib.getDocument({
                        data: arrayBuffer,
                  verbosity: 0
      });
                  const pdf = await loadingTask.promise;
                  console.log("Noma: PDF loaded, pages:",
      pdf.numPages);
                  let fullText = '';
                  for (let pageNum = 1;
            pageNum <= pdf.numPages;
            pageNum++) {
                        try {
                              const page = await pdf.getPage(pageNum);
                              const textContent = await page.getTextContent();
                              const pageText = textContent.items            .map(item => item.str)            .join(' ')            .trim();
                              if (pageText) {
                                    fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          }
                              console.log(`Noma: Extracted ${pageText.length} characters from page ${pageNum}`);
        }
                catch (pageError) {
                              console.warn(`Noma: Failed to extract text from page ${pageNum}:`, pageError);
                              fullText += `\n--- Page ${pageNum} ---\n[Error extracting page content]\n`;
        }
      }
                  fullText = fullText        .replace(/\s+/g,
      ' ')
        .replace(/\n\s*\n/g,
      '\n')
        .trim();
                  console.log(`Noma: PDF extraction complete. Total characters: ${fullText.length}`);
                  if (!fullText.trim()) {
                        throw new Error('No text content found in PDF. This might be a scanned/image-based PDF.');
      }
                  return fullText;
    }
        catch (error) {
                  console.error("Noma: PDF extraction failed:", error);
                  throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
      static isPDF(file) {
            return file.type === 'application/pdf' ||          file.name.toLowerCase().endsWith('.pdf');
  }
      static getFileInfo(file) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            return {
                  name: file.name,
              size: file.size,
              sizeFormatted: `${sizeInMB} MB`,
              type: file.type
    };
  }
}
if (typeof module !== 'undefined' && module.exports) {
      module.exports = PDFExtractor;
}
else {
      window.PDFExtractor = PDFExtractor;
}