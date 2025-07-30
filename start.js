#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Check if port is available
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
};

// Run command and return promise
const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    log('blue', `Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { 
      stdio: 'inherit', 
      shell: true,
      ...options 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
};

// Main startup function
const startPodcastApp = async () => {
  log('magenta', '🎙️  Starting Podcast Generator...\n');
  
  try {
    // Step 1: Check if build exists
    const fs = require('fs');
    const buildExists = fs.existsSync('./build');
    
    if (!buildExists) {
      log('yellow', '📦 Build directory not found. Creating production build...');
      await runCommand('npm', ['run', 'build']);
      log('green', '✅ Build completed successfully!\n');
    }
    
    // Step 2: Install dependencies if needed
    if (!fs.existsSync('./node_modules')) {
      log('yellow', '📥 Installing dependencies...');
      await runCommand('npm', ['install']);
      log('green', '✅ Dependencies installed!\n');
    }
    
    // Step 3: Check available ports
    log('cyan', '🔍 Checking available ports...');
    const ports = [3000, 3001, 8080, 8000, 3002];
    const availablePorts = [];
    
    for (const port of ports) {
      const isAvailable = await checkPort(port);
      if (isAvailable) {
        availablePorts.push(port);
        log('green', `  ✅ Port ${port} is available`);
      } else {
        log('red', `  ❌ Port ${port} is in use`);
      }
    }
    
    if (availablePorts.length === 0) {
      throw new Error('No available ports found');
    }
    
    console.log('');
    
    // Step 4: Try different startup methods
    const startupMethods = [
      {
        name: 'React Development Server',
        command: 'npm',
        args: ['start'],
        env: { 
          BROWSER: 'none', 
          HOST: '0.0.0.0', 
          PORT: availablePorts[0].toString() 
        }
      },
      {
        name: 'Express Fallback Server',
        command: 'npm',
        args: ['run', 'start:fallback']
      },
      {
        name: 'Static File Server',
        command: 'npm',
        args: ['run', 'serve']
      },
      {
        name: 'Python HTTP Server',
        command: 'npm',
        args: ['run', 'serve:alt']
      }
    ];
    
    for (const method of startupMethods) {
      try {
        log('blue', `🚀 Trying ${method.name}...`);
        
        const options = method.env ? { env: { ...process.env, ...method.env } } : {};
        await runCommand(method.command, method.args, options);
        
        log('green', `✅ ${method.name} started successfully!`);
        break;
        
      } catch (error) {
        log('red', `❌ ${method.name} failed: ${error.message}`);
        if (method === startupMethods[startupMethods.length - 1]) {
          throw new Error('All startup methods failed');
        }
        continue;
      }
    }
    
  } catch (error) {
    log('red', `\n💥 Startup failed: ${error.message}`);
    log('yellow', '\n🔧 Troubleshooting tips:');
    log('cyan', '  • Check if another application is using the ports');
    log('cyan', '  • Verify Node.js and npm are properly installed');
    log('cyan', '  • Try running: npm install && npm run build');
    log('cyan', '  • Check your firewall settings');
    process.exit(1);
  }
};

// Handle interruption gracefully
process.on('SIGINT', () => {
  log('yellow', '\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
startPodcastApp();