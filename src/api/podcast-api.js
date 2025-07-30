// Advanced Podcast API for N8N Integration
// Uses Gemini Multi-Speaker TTS for natural Portuguese podcasts

const { generateFileName } = require('./news-to-script');
const GeminiTTSService = require('./gemini-tts');

class PodcastAPI {
  constructor(config) {
    this.ttsService = new GeminiTTSService(config.geminiApiKey || config.googleTTSApiKey);
    this.config = config;
  }

  async generatePodcast(script, options = {}) {
    try {
      if (!script || script.trim() === '') {
        throw new Error('Script is required and cannot be empty');
      }

      console.log('Generating multi-speaker audio with Gemini TTS...');
      
      // Validate script format for multi-speaker TTS
      this.ttsService.validateScript(script);
      
      // Generate audio using Gemini Multi-Speaker TTS
      const audioBase64 = await this.ttsService.generatePodcastAudio(
        script,
        (progress) => {
          console.log(`Audio generation progress: ${progress.progress}%`);
          if (options.progressCallback) {
            options.progressCallback(progress);
          }
        }
      );
      
      
      // Generate filename with correct extension (WAV for Gemini)
      const baseFileName = generateFileName().replace('.mp3', '');
      const audioFormat = this.ttsService.getAudioFormat();
      const fileName = baseFileName + audioFormat.extension;
      
      // Save locally for download URL
      const fs = require('fs');
      const path = require('path');
      
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const filePath = path.join(process.cwd(), 'podcasts', fileName);
      
      
      // Create podcasts directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, audioBuffer);
      
      console.log('Multi-speaker podcast generation completed successfully!');
      
      return {
        success: true,
        audio: {
          base64: audioBase64,
          fileName: fileName,
          downloadUrl: `/download/${fileName}`,
          mimeType: audioFormat.mimeType,
          duration: this.ttsService.estimateDuration(script),
          speakers: ['Lucas (Algenib)', 'Ana (Aoede)'],
          technology: 'Gemini Multi-Speaker TTS'
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating podcast:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }


  estimateDuration(script) {
    // Rough estimation: 150 words per minute for Portuguese
    const wordCount = script.split(/\s+/).length;
    const minutes = Math.round(wordCount / 150);
    return `${minutes} minutos`;
  }
}

// Express.js route handlers
function setupPodcastRoutes(app, config) {
  const podcastAPI = new PodcastAPI(config);

  // Main podcast generation endpoint
  app.post('/api/generate-podcast', async (req, res) => {
    try {
      // Debug: Log what we're receiving
      console.log('=== DEBUG: Received request ===');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('Body type:', typeof req.body);
      console.log('Body keys:', Object.keys(req.body || {}));
      
      // Identify request source
      const userAgent = req.headers['user-agent'] || '';
      const isN8nRequest = userAgent.includes('n8n') || req.headers['x-n8n-webhook'];
      console.log('Request source:', isN8nRequest ? 'N8N' : 'Direct/Local');
      console.log('User-Agent:', userAgent);
      console.log('===============================');
      
      // Handle both JSON and form data
      let script, options = {};
      
      if (req.body.script) {
        script = req.body.script;
        options = req.body.options || {};
      } else if (req.body.data) {
        // Handle JSON string in data field
        const data = JSON.parse(req.body.data);
        script = data.script;
        options = data.options || {};
      }
      
      // Parse options if it's a string
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          options = {};
        }
      }
      
      if (!script) {
        return res.status(400).json({
          success: false,
          error: 'script is required'
        });
      }

      // Set up Server-Sent Events for progress updates
      if (options.enableProgress) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        options.progressCallback = (progress) => {
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
        };
      }

      const result = await podcastAPI.generatePodcast(script, options);
      
      if (options.enableProgress) {
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
        res.end();
      } else {
        res.json(result);
      }

    } catch (error) {
      console.error('API Error:', error);
      
      const errorResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorResponse })}\n\n`);
        res.end();
      } else {
        res.status(500).json(errorResponse);
      }
    }
  });

  // Health check endpoint
  app.get('/api/podcast/health', async (req, res) => {
    try {
      // Test Gemini TTS service
      const ttsHealth = await podcastAPI.ttsService.healthCheck();
      
      res.json({
        status: 'OK',
        service: 'Advanced Podcast Generator API',
        tts: {
          engine: 'Gemini Multi-Speaker TTS',
          status: ttsHealth.status,
          model: ttsHealth.model || 'gemini-2.5-flash-preview-tts',
          speakers: ['Lucas (Algenib)', 'Ana (Aoede)']
        },
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        service: 'Advanced Podcast Generator API',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Download endpoint for local files
  app.get('/download/:filename', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'podcasts', filename);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  console.log('Podcast API routes configured:');
  console.log('  POST /api/generate-podcast');
  console.log('  GET  /api/podcast/health');
  console.log('  GET  /download/:filename');
}

module.exports = {
  PodcastAPI,
  setupPodcastRoutes
};