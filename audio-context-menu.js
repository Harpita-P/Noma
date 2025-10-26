// audio-context-menu.js
// Adds custom context menu support for audio files in Gmail, WhatsApp, etc.

console.log('Noma Audio: Context menu script loaded');

// Track the currently right-clicked element
let rightClickedElement = null;

// Listen for right-clicks
document.addEventListener('contextmenu', (e) => {
  rightClickedElement = e.target;
  
  // Check if the clicked element or its parents contain audio
  const audioInfo = findAudioElement(e.target);
  
  if (audioInfo) {
    console.log('Noma Audio: Found audio element:', audioInfo);
    
    // Store audio info for the background script to access
    chrome.storage.local.set({
      'noma-audio-context': {
        audioUrl: audioInfo.url,
        type: audioInfo.type,
        timestamp: Date.now()
      }
    });
  } else {
    // Clear any previous audio context
    chrome.storage.local.remove('noma-audio-context');
  }
}, true);

// Find audio URL from element or its parents
function findAudioElement(element) {
  if (!element) return null;
  
  // Check up to 5 parent levels
  let current = element;
  for (let i = 0; i < 5; i++) {
    if (!current) break;
    
    // Check for <audio> or <video> elements
    if (current.tagName === 'AUDIO' || current.tagName === 'VIDEO') {
      return {
        url: current.src || current.currentSrc,
        type: 'element'
      };
    }
    
    // Check for links to audio files
    if (current.tagName === 'A' && current.href) {
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus', '.webm'];
      if (audioExtensions.some(ext => current.href.toLowerCase().includes(ext))) {
        return {
          url: current.href,
          type: 'link'
        };
      }
    }
    
    // Check for data attributes (common in messaging apps)
    const dataUrl = current.getAttribute('data-audio-url') || 
                    current.getAttribute('data-src') ||
                    current.getAttribute('data-audio');
    if (dataUrl) {
      return {
        url: dataUrl,
        type: 'data-attribute'
      };
    }
    
    // WhatsApp Web specific
    if (window.location.hostname === 'web.whatsapp.com') {
      // Voice message elements
      if (current.querySelector('audio') || current.closest('[data-testid*="audio"]')) {
        const audioEl = current.querySelector('audio') || current.closest('[data-testid*="audio"]')?.querySelector('audio');
        if (audioEl && audioEl.src) {
          return {
            url: audioEl.src,
            type: 'whatsapp'
          };
        }
      }
    }
    
    // Gmail specific - check for attachment links
    if (window.location.hostname === 'mail.google.com') {
      // Check if this is an attachment link (contains view=att or download params)
      const link = current.href || current.closest('a')?.href;
      if (link && (link.includes('view=att') || link.includes('&attid='))) {
        // Try to get filename from the element or nearby text
        const filenameElement = current.querySelector('[data-tooltip]') || 
                               current.closest('[role="listitem"]')?.querySelector('.aV3') ||
                               current.querySelector('.aV3') ||
                               current;
        
        const filename = filenameElement?.getAttribute('data-tooltip') || 
                        filenameElement?.getAttribute('download') ||
                        filenameElement?.textContent?.trim() || '';
        
        // Check if filename suggests it's an audio file
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus', '.webm'];
        const isAudio = audioExtensions.some(ext => filename.toLowerCase().includes(ext));
        
        if (isAudio) {
          return {
            url: link,
            type: 'gmail-attachment',
            filename: filename
          };
        }
      }
    }
    
    // Slack specific
    if (window.location.hostname.includes('slack.com')) {
      // Audio file previews
      if (current.closest('.c-file__actions') || current.closest('.p-file_audio_container')) {
        const audioEl = current.closest('.p-file_audio_container')?.querySelector('audio');
        if (audioEl && audioEl.src) {
          return {
            url: audioEl.src,
            type: 'slack'
          };
        }
      }
    }
    
    current = current.parentElement;
  }
  
  return null;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAudioContext') {
    chrome.storage.local.get('noma-audio-context', (result) => {
      sendResponse(result['noma-audio-context'] || null);
    });
    return true; // Keep channel open for async response
  }
});
