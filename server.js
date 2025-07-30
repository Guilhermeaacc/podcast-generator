const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupPodcastRoutes } = require('./src/api/podcast-api');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Setup podcast API routes
const podcastConfig = {
  // Support both old Google TTS and new Gemini API keys for backwards compatibility
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_API_KEY || 'AIzaSyB4HYATvK6oKUMi1FvaKSEvYV7qRIxCdWg',
  googleTTSApiKey: process.env.GOOGLE_TTS_API_KEY || 'AIzaSyB4HYATvK6oKUMi1FvaKSEvYV7qRIxCdWg', // Keep for fallback
  googleDriveCredentials: process.env.GOOGLE_DRIVE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS) : null,
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null
};

setupPodcastRoutes(app, podcastConfig);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Express Fallback Server'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Function to find available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
};

// Start server with automatic port detection
const startServer = async () => {
  try {
    // Start with a simple fixed port for debugging
    const port = 3000;
    
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`
🚀 Podcast Generator Server Running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 Local URLs:
   • http://localhost:${port}
   • http://127.0.0.1:${port}
   • http://[::1]:${port}

🌐 Network URL:
   • http://192.168.15.17:${port}

🏥 Health Check:
   • http://localhost:${port}/health

🎙️ Podcast API:
   • POST http://localhost:${port}/api/generate-podcast
   • GET  http://localhost:${port}/api/podcast/health

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    });
    
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();