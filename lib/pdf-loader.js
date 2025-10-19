// PDF.js loader module for Chrome extension
import * as pdfjsLib from './pdf.min.js';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');

// Export for global access
window.pdfjsLib = pdfjsLib;

// Notify that PDF.js is loaded
window.dispatchEvent(new Event('pdfjs-ready'));

console.log("Taggle: PDF.js module loaded and configured");
