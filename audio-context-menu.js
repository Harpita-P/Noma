console.log('Noma Audio: Context menu script loaded');
let rightClickedElement = null;

document.addEventListener('contextmenu', (e) => {
  rightClickedElement = e.target;
  const audioInfo = findAudioElement(e.target);
  
  if (audioInfo) {
    console.log('Noma Audio: Found audio element:', audioInfo);
    chrome.storage.local.set({
      'noma-audio-context': {
        audioUrl: audioInfo.url,
        type: audioInfo.type,
        timestamp: Date.now()
      }
    });
  } else {
    chrome.storage.local.remove('noma-audio-context');
  }
}, true);

function findAudioElement(element) {
  if (!element) return null;
  let current = element;
  
  for (let i = 0; i < 5; i++) {
    if (!current) break;
    
    if (current.tagName === 'AUDIO' || current.tagName === 'VIDEO') {
      return {
        url: current.src || current.currentSrc,
        type: 'element'
      };
    }
    
    if (current.tagName === 'A' && current.href) {
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus', '.webm'];
      if (audioExtensions.some(ext => current.href.toLowerCase().includes(ext))) {
        return {
          url: current.href,
          type: 'link'
        };
      }
    }
    
    const dataUrl = current.getAttribute('data-audio-url') || 
                   current.getAttribute('data-src') || 
                   current.getAttribute('data-audio');
    if (dataUrl) {
      return {
        url: dataUrl,
        type: 'data-attribute'
      };
    }
    
    if (window.location.hostname === 'web.whatsapp.com') {
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
    
    if (window.location.hostname === 'mail.google.com') {
      const link = current.href || current.closest('a')?.href;
      if (link && (link.includes('view=att') || link.includes('&attid='))) {
        const filenameElement = current.querySelector('[data-tooltip]') || 
                               current.closest('[role="listitem"]')?.querySelector('.aV3') || 
                               current.querySelector('.aV3') || 
                               current;
        const filename = filenameElement?.getAttribute('data-tooltip') || 
                        filenameElement?.getAttribute('download') || 
                        filenameElement?.textContent?.trim() || '';
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
    
    if (window.location.hostname.includes('slack.com')) {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAudioContext') {
    chrome.storage.local.get('noma-audio-context', (result) => {
      sendResponse(result['noma-audio-context'] || null);
    });
    return true;
  }
});