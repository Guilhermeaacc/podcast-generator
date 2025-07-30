// Google Text-to-Speech Integration for Podcast Generation

const https = require('https');

class GoogleTTSService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
  }

  async textToSpeech(text, options = {}) {
    const requestBody = {
      input: {
        text: text
      },
      voice: {
        languageCode: options.languageCode || 'pt-BR',
        name: options.voiceName || 'pt-BR-Chirp3-HD-Gacrux', // Ana - Female Brazilian Portuguese
        ssmlGender: options.ssmlGender || 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
        volumeGainDb: options.volumeGainDb || 0.0,
        sampleRateHertz: options.sampleRateHertz || 24000
      }
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestBody);
      
      const requestOptions = {
        hostname: 'texttospeech.googleapis.com',
        port: 443,
        path: `/v1/text:synthesize?key=${this.apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(requestOptions, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result.audioContent);
            } else {
              reject(new Error(`TTS API Error: ${response.statusCode} - ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse TTS response: ${error.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`TTS Request Error: ${error.message}`));
      });

      request.write(postData);
      request.end();
    });
  }


  async generatePodcastAudio(script, progressCallback) {
    try {
      // Split script by speakers
      const segments = this.parseScriptSegments(script);
      const audioSegments = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (progressCallback) {
          progressCallback({
            stage: 'generating_audio',
            progress: Math.round((i / segments.length) * 100),
            currentSegment: i + 1,
            totalSegments: segments.length
          });
        }

        // Choose voice based on speaker
        const voiceOptions = this.getVoiceForSpeaker(segment.speaker);
        
        try {
          const audioContent = await this.textToSpeech(segment.text, voiceOptions);
          audioSegments.push({
            audio: audioContent,
            speaker: segment.speaker,
            order: i
          });
          
          // Small delay to avoid rate limiting
          if (i < segments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error generating audio for segment ${i + 1}:`, error);
          throw error;
        }
      }

      if (progressCallback) {
        progressCallback({
          stage: 'merging_audio',
          progress: 100,
          message: 'Merging audio segments...'
        });
      }

      // Merge audio segments
      const finalAudio = await this.mergeAudioSegments(audioSegments);
      
      return finalAudio;
    } catch (error) {
      console.error('Error in generatePodcastAudio:', error);
      throw error;
    }
  }


  parseScriptSegments(script) {
    const lines = script.split('\n').filter(line => line.trim());
    const segments = [];
    
    for (const line of lines) {
      const match = line.match(/^\[(\w+)\]\s*(.+)$/);
      if (match) {
        const [, speaker, text] = match;
        segments.push({
          speaker: speaker,
          text: text.trim()
        });
      } else if (line.trim()) {
        // If no speaker tag, assume Host
        segments.push({
          speaker: 'Host',
          text: line.trim()
        });
      }
    }
    
    return segments;
  }

  getVoiceForSpeaker(speaker) {
    const voiceOptions = {
      languageCode: 'pt-BR',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0
    };

    // Map specific speakers to their designated voices
    const speakerLower = speaker.toLowerCase();
    
    if (speakerLower === 'ana' || speakerLower === 'host') {
      return {
        ...voiceOptions,
        voiceName: 'pt-BR-Chirp3-HD-Gacrux', // Ana - Female host
        ssmlGender: 'FEMALE'
      };
    } else if (speakerLower === 'lucas') {
      return {
        ...voiceOptions,
        voiceName: 'pt-BR-Chirp3-HD-Algenib', // Lucas - Male specialist
        ssmlGender: 'MALE'
      };
    } else {
      // Fallback for any other speakers
      return {
        ...voiceOptions,
        voiceName: 'pt-BR-Chirp3-HD-Gacrux', // Default to Ana's voice
        ssmlGender: 'FEMALE'
      };
    }
  }

  async mergeAudioSegments(segments) {
    // For now, we'll concatenate the base64 audio data
    // In a production environment, you'd want to use proper audio processing
    const audioBuffers = segments.map(segment => {
      return Buffer.from(segment.audio, 'base64');
    });

    // Simple concatenation - in production, you'd want proper audio merging
    const mergedBuffer = Buffer.concat(audioBuffers);
    return mergedBuffer.toString('base64');
  }
}

module.exports = GoogleTTSService;