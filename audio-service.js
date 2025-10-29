const AudioService = {
      async transcribeAudio(audioBlob, language = 'en') {
            try {
                  console.log('Noma Audio: Starting Whisper transcription for audio blob:', {
                        size: audioBlob.size,
                  type: audioBlob.type,
                  language
      });
                  const { whisperApiKey } = await chrome.storage.local.get('whisperApiKey');
                  if (!whisperApiKey) {
                        throw new Error('OpenAI API key not found. Please add your API key in the extension options.');
      }
                  const formData = new FormData();
                  let extension = 'mp3';
                    if (audioBlob.type.includes('m4a') || audioBlob.type.includes('mp4')) {
                        extension = 'm4a';
      }
            else if (audioBlob.type.includes('wav')) {
                        extension = 'wav';
      }
            else if (audioBlob.type.includes('webm')) {
                        extension = 'webm';
      }
            else if (audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3')) {
                        extension = 'mp3';
      }
                  const audioFile = new File([audioBlob],
      `audio.${extension}`,
      {
                type: audioBlob.type
      });
                  formData.append('file',
      audioFile);
                  formData.append('model',
      'whisper-1');
                  formData.append('language',
      language);
                  formData.append('response_format',
      'text');
                  console.log('Noma Audio: Sending to Whisper API...', {
                        fileSize: audioBlob.size,
                  fileType: audioBlob.type,
                  extension: extension
      });
                  let response;
                  try {
                        response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                              method: 'POST',
                      headers: {
                                    'Authorization': `Bearer ${whisperApiKey}`
          },
                      body: formData
        });
      }
            catch (fetchError) {
                        console.error('Noma Audio: Fetch error:', fetchError);
                        throw new Error(`Network error: ${fetchError.message}`);
      }
                  console.log('Noma Audio: Response status:', response.status);
                  if (!response.ok) {
                        let errorData;
                        try {
                              errorData = await response.json();
        }
                catch (e) {
                              errorData = {
                        error: {
                            message: await response.text()
            }
          };
        }
                        console.error('Noma Audio: API error:', errorData);
                        throw new Error(          `Whisper API error (${response.status}): ${errorData.error?.message || response.statusText}`        );
      }
                  let transcription;
                  try {
                        transcription = await response.text();
                        console.log('Noma Audio: Raw response:', transcription);
      }
            catch (textError) {
                        console.error('Noma Audio: Failed to read response text:', textError);
                        throw new Error('Failed to read transcription response');
      }
                  console.log('Noma Audio: Transcription completed:',
      transcription.substring(0,
      100) + '...');
                  return transcription.trim();
    }
        catch (error) {
                  console.error('Noma Audio: Transcription error:', error);
                  if (error.message.includes('API key not found')) {
                        throw error;
      }
                  if (error.message.includes('401')) {
                        throw new Error(          'Invalid OpenAI API key. Please check your API key in the extension options.'        );
      }
                  if (error.message.includes('429')) {
                        throw new Error(          'OpenAI API rate limit exceeded. Please try again in a moment.'        );
      }
                  throw new Error('Transcription failed: ' + error.message);
    }
  },
      async blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
      };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
    });
  },
      async transcribeFromUrl(audioUrl,
  language = 'en') {
            try {
                  console.log('Noma Audio: Fetching audio from URL:', audioUrl);
                  const response = await fetch(audioUrl);
                  if (!response.ok) {
                        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
                  const blob = await response.blob();
                  if (!blob.type.startsWith('audio/')) {
                        throw new Error(`Invalid audio type: ${blob.type}. Expected audio/* MIME type.`);
      }
                  console.log('Noma Audio: Audio fetched successfully:', {
                        size: blob.size,
                  type: blob.type
      });
                  const transcription = await this.transcribeAudio(blob, language);
                  const audioData = await this.blobToBase64(blob);
                  return {
                        transcription,
                  audioData,
                  mimeType: blob.type,
                  size: blob.size
      };
    }
        catch (error) {
                  console.error('Noma Audio: Error transcribing from URL:', error);
                  throw error;
    }
  },
      async checkAvailability() {
            try {
                  if (!window.ai || !window.ai.languageModel) {
                        return {
                              available: false,
                      reason: 'Prompt API is not available. Enable chrome://flags/#prompt-api-for-gemini-nano'
        };
      }
                  const capabilities = await window.ai.languageModel.capabilities();
                  if (capabilities.available === 'no') {
                        return {
                              available: false,
                      reason: 'Prompt API is not available on this device'
        };
      }
                  if (capabilities.available === 'after-download') {
                        return {
                              available: true,
                      reason: 'Model needs to be downloaded first'
        };
      }
                  return {
                available: true
      };
    }
        catch (error) {
                  return {
                        available: false,
                  reason: error.message
      };
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
      module.exports = AudioService;
}