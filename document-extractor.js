// Document text extraction utilities for Taggle
// Supports PDF, DOCX, PPTX, CSV, TXT files using OpenAI API

export class DocumentExtractor {
  
  // Check if OpenAI API key is available
  static async hasOpenAIKey() {
    const result = await chrome.storage.local.get('openai-api-key');
    return !!(result['openai-api-key']);
  }
  
  // Get OpenAI API key
  static async getOpenAIKey() {
    const result = await chrome.storage.local.get('openai-api-key');
    return result['openai-api-key'];
  }
  
  // Main extraction function
  static async extractText(file) {
    const extension = file.name.toLowerCase().split('.').pop();
    
    // Check if we should use OpenAI API for better extraction
    const hasAPIKey = await this.hasOpenAIKey();
    const useOpenAI = hasAPIKey && ['pdf', 'docx', 'pptx'].includes(extension);
    
    if (useOpenAI) {
      try {
        return await this.extractWithOpenAI(file);
      } catch (error) {
        console.warn("OpenAI extraction failed, falling back to basic method:", error);
        // Fall through to basic extraction
      }
    }
    
    switch (extension) {
      case 'txt':
        return await this.extractFromText(file);
      case 'csv':
        return await this.extractFromCSV(file);
      case 'pdf':
        return await this.extractFromPDF(file);
      case 'docx':
        return await this.extractFromDOCX(file);
      case 'pptx':
        return await this.extractFromPPTX(file);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }
  
  // Extract text using OpenAI API
  static async extractWithOpenAI(file) {
    const apiKey = await this.getOpenAIKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'gpt-4o'); // Use GPT-4o for file processing
    formData.append('messages', JSON.stringify([
      {
        role: 'user',
        content: `Please extract all text content from this ${file.name.split('.').pop().toUpperCase()} file. 
        Maintain the structure and formatting as much as possible. 
        If it's a presentation, indicate slide breaks. 
        If it's a document, preserve paragraphs and sections.
        Return only the extracted text content.`
      }
    ]));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    const extractedText = result.choices[0]?.message?.content;
    
    if (!extractedText) {
      throw new Error("No text extracted from OpenAI response");
    }
    
    return `${file.name.split('.').pop().toUpperCase()} Document: ${file.name}\n` +
           `Extracted via OpenAI API\n` +
           '─'.repeat(50) + '\n\n' +
           extractedText;
  }

  // Extract text from plain text files
  static async extractFromText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  // Extract text from CSV files
  static async extractFromCSV(file) {
    const text = await this.extractFromText(file);
    // Convert CSV to readable format
    const lines = text.split('\n');
    const headers = lines[0]?.split(',') || [];
    
    let formatted = `CSV Content (${lines.length} rows):\n\n`;
    formatted += `Headers: ${headers.join(' | ')}\n`;
    formatted += '─'.repeat(50) + '\n';
    
    // Show first few rows as sample
    const sampleRows = lines.slice(1, Math.min(6, lines.length));
    sampleRows.forEach((row, index) => {
      if (row.trim()) {
        formatted += `Row ${index + 1}: ${row}\n`;
      }
    });
    
    if (lines.length > 6) {
      formatted += `\n... and ${lines.length - 6} more rows`;
    }
    
    return formatted;
  }

  // Extract text from PDF files (CSP-compliant method)
  static async extractFromPDF(file) {
    // Use fallback method directly since CSP blocks external scripts
    return await this.extractPDFFallback(file);
  }

  // Fallback PDF extraction (basic metadata only)
  static async extractPDFFallback(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    // Extract basic PDF metadata and any readable text
    let result = `PDF Document: ${file.name}\n`;
    result += `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n`;
    result += '─'.repeat(50) + '\n\n';
    
    // Try to extract some readable text (very basic approach)
    const readableText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only printable ASCII
      .split(/\s+/)
      .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
      .slice(0, 200) // Limit to first 200 words
      .join(' ');
    
    if (readableText.length > 50) {
      result += "Extracted text (partial):\n";
      result += readableText;
      result += "\n\n[Note: This is a basic extraction. For better results, the PDF.js library is recommended.]";
    } else {
      result += "Unable to extract readable text from this PDF.\n";
      result += "The PDF may be image-based or encrypted.\n";
      result += "Consider using OCR tools for image-based PDFs.";
    }
    
    return result;
  }

  // Extract text from DOCX files (basic method)
  static async extractFromDOCX(file) {
    try {
      // DOCX files are ZIP archives, try basic ZIP extraction
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let result = `DOCX Document: ${file.name}\n`;
      result += `Size: ${(file.size / 1024).toFixed(2)} KB\n`;
      result += '─'.repeat(50) + '\n\n';
      
      // Try to find readable text in the binary data
      const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      
      // Extract text that looks like document content
      const readableText = text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Replace non-printable with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .split(' ')
        .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
        .slice(0, 500) // Limit to first 500 words
        .join(' ');
      
      if (readableText.length > 100) {
        result += "Extracted text (partial):\n";
        result += readableText;
        result += "\n\n[Note: This is a basic extraction. Some formatting may be lost.]";
      } else {
        result += "Unable to extract readable text from this DOCX file.\n";
        result += "The document may be complex or encrypted.\n";
        result += "Try converting to TXT format for better results.";
      }
      
      return result;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  // Extract text from PPTX files (basic method)
  static async extractFromPPTX(file) {
    try {
      // PPTX files are ZIP archives, try basic text extraction
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let result = `PPTX Document: ${file.name}\n`;
      result += `Size: ${(file.size / 1024).toFixed(2)} KB\n`;
      result += '─'.repeat(50) + '\n\n';
      
      // Try to find readable text in the binary data
      const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      
      // Extract text that looks like slide content
      const readableText = text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Replace non-printable with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .split(' ')
        .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
        .slice(0, 300) // Limit to first 300 words
        .join(' ');
      
      if (readableText.length > 100) {
        result += "Extracted text (partial):\n";
        result += readableText;
        result += "\n\n[Note: This is a basic extraction. Slide structure may be lost.]";
      } else {
        result += "Unable to extract readable text from this PPTX file.\n";
        result += "The presentation may be image-heavy or encrypted.\n";
        result += "Try exporting slides as text for better results.";
      }
      
      return result;
    } catch (error) {
      throw new Error(`PPTX extraction failed: ${error.message}`);
    }
  }

}
