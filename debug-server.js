const express = require('express');
const app = express();

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Debug Server'
  });
});

// Try different binding approaches
const startServer = async () => {
  const port = 3001;
  
  console.log('Attempting to start server on port', port);
  
  // Try binding to 127.0.0.1 first
  try {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`✅ Server successfully started on http://127.0.0.1:${port}`);
      console.log(`Health check: http://127.0.0.1:${port}/health`);
    });
    
    server.on('error', (err) => {
      console.error('Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();