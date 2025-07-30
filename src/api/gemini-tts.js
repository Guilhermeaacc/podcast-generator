// Gemini Multi-Speaker Text-to-Speech Integration
// Uses Google's advanced Gemini API for natural multi-speaker podcast generation

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// WAV file header creation utility
function createWavHeader(pcmLength, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmLength, 4);
  buffer.write('WAVE', 8);
  
  // Format chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM format chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // Byte rate
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // Data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmLength, 40);
  
  return buffer;
}

class GeminiTTSService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
    this.model = 'gemini-2.5-flash-preview-tts';
  }

  /**
   * Generate multi-speaker podcast audio using Gemini's advanced TTS
   * @param {string} script - The complete podcast script with [Speaker] format
   * @param {function} progressCallback - Optional progress callback
   * @returns {Promise<string>} Base64 encoded audio content
   */
  async generatePodcastAudio(script, progressCallback) {
    try {
      // Validate input parameters
      if (!script || typeof script !== 'string' || script.trim().length === 0) {
        throw new Error('Script is required and must be a non-empty string');
      }

      // Validate script format
      this.validateScript(script);

      // Enhanced debugging for voice assignment
      console.log('=== VOICE ASSIGNMENT DEBUG ===');
      const speakerMatches = script.match(/\[(Lucas|Ana)\]/gi);
      const detectedSpeakers = [...new Set(speakerMatches?.map(match => 
        match.replace(/\[|\]/g, '')
      ) || [])];
      
      console.log('Detected speakers in script:', detectedSpeakers);
      console.log('Voice mapping:');
      console.log('  Lucas → Algenib (female voice)');
      console.log('  Ana → Aoede (male voice)');
      console.log('Script preview:', script.substring(0, 200) + '...');
      console.log('==============================');

      if (progressCallback) {
        progressCallback({
          stage: 'preparing_script',
          progress: 10,
          message: 'Preparing script for multi-speaker TTS...'
        });
      }

      // Convert script format and add Portuguese instructions
      const formattedPrompt = this.formatScriptForGemini(script);

      if (progressCallback) {
        progressCallback({
          stage: 'generating_audio',
          progress: 30,
          message: 'Generating multi-speaker audio with Gemini...'
        });
      }

      // Log the exact request being sent to Google API
      console.log('=== GOOGLE API REQUEST DEBUG ===');
      console.log('Formatted Prompt being sent to Gemini:');
      console.log(formattedPrompt);
      console.log('\nVoice Configuration:');
      const voiceConfigs = [
        {
          speaker: 'Lucas',
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: 'Algenib' // Natural female voice
            }
          }
        },
        {
          speaker: 'Ana',
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: 'Aoede' // Clear male voice
            }
          }
        }
      ];
      console.log(JSON.stringify(voiceConfigs, null, 2));
      console.log('===================================');

      // Generate audio using Gemini's multi-speaker TTS
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ parts: [{ text: formattedPrompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Lucas',
                  voiceConfig: {
                    prebuiltVoiceConfig: { 
                      voiceName: 'Algenib' // Natural female voice
                    }
                  }
                },
                {
                  speaker: 'Ana',
                  voiceConfig: {
                    prebuiltVoiceConfig: { 
                      voiceName: 'Aoede' // Clear male voice
                    }
                  }
                }
              ]
            }
          }
        }
      });

      // Log the API response
      console.log('=== GOOGLE API RESPONSE DEBUG ===');
      console.log('Response received from Gemini API:');
      console.log('Status: SUCCESS');
      console.log('Response structure overview:', {
        hasCandidates: !!response.candidates,
        candidatesCount: response.candidates?.length || 0,
        firstCandidateHasContent: !!response.candidates?.[0]?.content,
        partsCount: response.candidates?.[0]?.content?.parts?.length || 0
      });
      console.log('=====================================');

      if (progressCallback) {
        progressCallback({
          stage: 'processing_audio',
          progress: 80,
          message: 'Processing generated audio...'
        });
      }

      // Debug: Log the full response structure to understand what we're getting
      console.log('=== GEMINI API RESPONSE DEBUG ===');
      console.log('Full response structure:', JSON.stringify(response, null, 2));
      console.log('Number of candidates:', response.candidates?.length);
      console.log('Number of parts in first candidate:', response.candidates?.[0]?.content?.parts?.length);
      
      if (response.candidates?.[0]?.content?.parts) {
        response.candidates[0].content.parts.forEach((part, index) => {
          console.log(`Part ${index}:`, {
            hasInlineData: !!part.inlineData,
            mimeType: part.inlineData?.mimeType,
            dataLength: part.inlineData?.data?.length,
            hasText: !!part.text
          });
        });
      }
      console.log('==================================');

      // Extract base64-encoded raw PCM audio data from Gemini API
      // Handle multiple parts - find the one with audio data (multispeaker track)
      let pcmData = null;
      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.inlineData && part.inlineData.data) {
          console.log(`Found audio data in part ${i}:`, {
            mimeType: part.inlineData.mimeType,
            dataLength: part.inlineData.data.length
          });
          
          // Take the first audio part we find (should be the multispeaker track)
          if (!pcmData) {
            pcmData = part.inlineData.data;
            console.log(`Using audio data from part ${i} as the multispeaker track`);
          }
        }
      }
      
      if (!pcmData) {
        throw new Error('No audio data received from Gemini TTS');
      }
      
      if (progressCallback) {
        progressCallback({
          stage: 'converting',
          progress: 85,
          message: 'Converting raw PCM to WAV format...'
        });
      }
      
      // Decode base64 PCM data from Gemini (raw PCM audio data)
      let pcmBuffer;
      try {
        pcmBuffer = Buffer.from(pcmData, 'base64');
      } catch (error) {
        throw new Error(`Failed to decode PCM data: ${error.message}`);
      }
      
      // Validate PCM buffer
      if (!pcmBuffer || pcmBuffer.length === 0) {
        throw new Error('Received empty PCM data from Gemini TTS');
      }
      
      // Create proper WAV file with headers (24kHz, mono, 16-bit - Gemini's format)
      const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      
      // Return as base64 encoded WAV file
      const audioBase64 = wavBuffer.toString('base64');

      // Debug: Check what we're actually returning
      console.log('=== GEMINI TTS DEBUG ===');
      console.log('PCM buffer length:', pcmBuffer.length);
      console.log('WAV header length:', wavHeader.length);
      console.log('WAV buffer length:', wavBuffer.length);
      console.log('Final base64 length:', audioBase64.length);
      console.log('Base64 starts with:', audioBase64.substring(0, 20));
      console.log('========================');

      if (progressCallback) {
        progressCallback({
          stage: 'completed',
          progress: 100,
          message: 'Podcast audio generated successfully!'
        });
      }

      return audioBase64; // Base64 encoded audio file

    } catch (error) {
      console.error('Error in Gemini TTS generatePodcastAudio:', error);
      throw new Error(`Gemini TTS Error: ${error.message}`);
    }
  }

  /**
   * Format the podcast script for Gemini's multi-speaker TTS
   * Converts [Speaker] format to natural conversation flow
   */
  formatScriptForGemini(script) {
    // Clean up the script - remove any markdown formatting
    let cleanScript = script.replace(/```/g, '').trim();

    // Add Portuguese language and style instructions
    const instructions = `
Generate natural, conversational Portuguese (Brazilian) audio for this podcast conversation between Lucas and Ana. Make sure that the the female voice is Lucas (Algenib) and the male voice is Ana (Aoede).
Make it sound like a professional podcast with:
- Lucas: Warm, engaging female voice with natural intonation
- Ana: Clear, authoritative male voice with journalistic tone
- Fast pace conversation.
- Natural conversational wih fast pace, but with appropriate pauses
- No fluff: get straight to the point, true to our "Skip the Noise" promise.
- Brazilian Portuguese pronunciation
- Professional podcast delivery style

Here's the conversation:

${cleanScript}`;

    return instructions;
  }

  /**
   * Save audio buffer to file (for debugging/testing)
   */
  async saveAudioToFile(audioBase64, filename) {
    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const filePath = path.join(process.cwd(), 'podcasts', filename);
      
      // Create podcasts directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, audioBuffer);
      return filePath;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw error;
    }
  }

  /**
   * Get audio format information - WAV format created from Gemini's raw PCM
   */
  getAudioFormat() {
    return {
      mimeType: 'audio/wav', // WAV format with proper headers
      extension: '.wav'
    };
  }


  /**
   * Estimate duration based on script length
   * More accurate for multi-speaker natural conversation
   */
  estimateDuration(script) {
    // Count words in script (excluding speaker tags)
    const cleanScript = script.replace(/\[[\w\s]+\]/g, '');
    const wordCount = cleanScript.split(/\s+/).filter(word => word.length > 0).length;
    
    // Portuguese conversation: approximately 140-160 words per minute
    const wordsPerMinute = 190;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }

  /**
   * Validate script format for multi-speaker TTS
   */
  validateScript(script) {
    const speakerPattern = /\[(Lucas|Ana)\]/gi;
    const matches = script.match(speakerPattern);
    
    if (!matches || matches.length === 0) {
      throw new Error('Script must contain [Lucas] and/or [Ana] speaker tags');
    }

    // Check if both speakers are present
    const foundSpeakers = [...new Set(matches.map(match => 
      match.replace(/\[|\]/g, '').toLowerCase()
    ))];

    if (foundSpeakers.length === 1) {
      console.warn(`Warning: Only one speaker (${foundSpeakers[0]}) found in script. Multi-speaker TTS works best with both Ana and Lucas.`);
    }

    return true;
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Simple test with minimal script
      const testScript = '[Lucas] Teste de saúde do serviço TTS. [Ana] Sistema funcionando corretamente.';
      
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ parts: [{ text: `Generate Portuguese TTS: ${testScript}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Lucas', 
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } }
                },
                {
                  speaker: 'Ana',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                }
              ]
            }
          }
        }
      });

      return {
        status: 'healthy',
        model: this.model,
        audioGenerated: !!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = GeminiTTSService;