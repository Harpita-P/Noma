// PDF text extraction for Taggle using local PDF.js
// Manifest V3 compatible implementation

class PDFExtractor {
  static isInitialized = false;
  
  // Initialize PDF.js with local files
  static async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load PDF.js library from local files
      if (typeof window !== 'undefined' && !window.pdfjsLib) {
        // For content script context, load via script tag
        await this.loadPDFJSScript();
      }
      
      // Set worker source to local file
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
        console.log("Taggle: PDF.js worker configured:", window.pdfjsLib.GlobalWorkerOptions.workerSrc);
      }
      
      // Verify initialization
      if (!window.pdfjsLib?.getDocument) {
        throw new Error('PDF.js failed to initialize - check workerSrc URL and MV3 permissions');
      }
      
      this.isInitialized = true;
      console.log("Taggle: PDF.js initialized successfully");
      
    } catch (error) {
      console.error("Taggle: Failed to initialize PDF.js:", error);
      throw error;
    }
  }
  
  // Load PDF.js script dynamically (for content script context)
  static async loadPDFJSScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.pdfjsLib) {
        resolve();
        return;
      }
      
      // Load the PDF loader module
      const script = document.createElement('script');
      script.type = 'module';
      script.src = chrome.runtime.getURL('lib/pdf-loader.js');
      
      const handleLoad = () => {
        console.log("Taggle: PDF.js module loaded");
        resolve();
      };
      
      const handleError = (error) => {
        console.error("Taggle: Failed to load PDF.js module:", error);
        reject(new Error('Failed to load PDF.js module'));
      };
      
      // Listen for the ready event from the module
      window.addEventListener('pdfjs-ready', handleLoad, { once: true });
      script.onerror = handleError;
      
      document.head.appendChild(script);
      
      // Fallback timeout
      setTimeout(() => {
        if (!window.pdfjsLib) {
          window.removeEventListener('pdfjs-ready', handleLoad);
          reject(new Error('PDF.js loading timeout - module may not be compatible'));
        }
      }, 10000); // Increased timeout
    });
  }
  
  // Extract text from PDF file
  static async extractText(file) {
    try {
      await this.initialize();
      
      console.log("Taggle: Starting PDF text extraction for:", file.name);
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = window.pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0 // Reduce console noise
      });
      
      const pdf = await loadingTask.promise;
      console.log("Taggle: PDF loaded, pages:", pdf.numPages);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine text items with spaces
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          }
          
          console.log(`Taggle: Extracted ${pageText.length} characters from page ${pageNum}`);
          
        } catch (pageError) {
          console.warn(`Taggle: Failed to extract text from page ${pageNum}:`, pageError);
          fullText += `\n--- Page ${pageNum} ---\n[Error extracting page content]\n`;
        }
      }
      
      // Clean up the text
      fullText = fullText
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
      
      console.log(`Taggle: PDF extraction complete. Total characters: ${fullText.length}`);
      
      if (!fullText.trim()) {
        throw new Error('No text content found in PDF. This might be a scanned/image-based PDF.');
      }
      
      return fullText;
      
    } catch (error) {
      console.error("Taggle: PDF extraction failed:", error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
  
  // Check if file is a PDF
  static isPDF(file) {
    return file.type === 'application/pdf' || 
           file.name.toLowerCase().endsWith('.pdf');
  }
  
  // Get file size info
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFExtractor;
} else {
  window.PDFExtractor = PDFExtractor;
}
