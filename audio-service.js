const AudioService = {
      async transcribeAudio(audioBlob, language = 'en') {
            try {
                  const result = await chrome.storage.local.get('noma-gemini-api-key');
                  const apiKey = result['noma-gemini-api-key'];
                  if (!apiKey) {
                        throw new Error('Gemini API key not found. Please add your API key in the extension options.');
      }
                  const base64Audio = await this.blobToBase64(audioBlob);
                  const mimeType = audioBlob.type || 'audio/mpeg';
                  const requestBody = {
                        contents: [{
                              parts: [
                                    {
                                          text: "Transcribe this audio file. Provide only the transcription text without any additional commentary."
            },
                                    {
                                          inline_data: {
                                                mime_type: mimeType,
                                          data: base64Audio
              }
            }
          ]
        }]
      };
                  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                        method: 'POST',
                  headers: {
                              'Content-Type': 'application/json'
        },
                  body: JSON.stringify(requestBody)
      });
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
                        throw new Error(          `Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`        );
      }
                  const data = await response.json();
                  const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (!transcription) {
                        throw new Error('No transcription returned from Gemini API');
      }
                  return transcription.trim();
    }
        catch (error) {
                  if (error.message.includes('API key not found')) {
                        throw error;
      }
                  if (error.message.includes('401')) {
                        throw new Error(          'Invalid Gemini API key. Please check your API key in the extension options.'        );
      }
                  if (error.message.includes('429')) {
                        throw new Error(          'Gemini API rate limit exceeded. Please try again in a moment.'        );
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