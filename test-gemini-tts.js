#!/usr/bin/env node

const GeminiTTSService = require('./src/api/gemini-tts');
const fs = require('fs');
const path = require('path');

async function testGeminiTTS() {
  console.log('🎙️  Testing Gemini TTS Audio Generation...\n');

  try {
    // Use the API key from the server config
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_API_KEY;
    
    // Create TTS service instance
    const ttsService = new GeminiTTSService(apiKey);
    
    // Load test script
    const testScriptPath = path.join(__dirname, 'test-script.json');
    const testData = JSON.parse(fs.readFileSync(testScriptPath, 'utf8'));
    const script = testData.script;
    
    console.log('📝 Test Script:');
    console.log(script);
    console.log('');
    
    // Progress callback to show generation status
    const progressCallback = (progress) => {
      console.log(`[${progress.stage.toUpperCase()}] ${progress.progress}% - ${progress.message}`);
    };
    
    console.log('🚀 Starting audio generation...\n');
    
    // Generate audio
    const startTime = Date.now();
    const audioBase64 = await ttsService.generatePodcastAudio(script, progressCallback);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Audio generated successfully in ${duration} seconds!`);
    
    
    // Get audio format info
    const audioFormat = ttsService.getAudioFormat();
    console.log(`📄 Format: ${audioFormat.mimeType} (${audioFormat.extension})`);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `test_audio_${timestamp}${audioFormat.extension}`;
    const filePath = path.join(__dirname, 'podcasts', filename);
    
    // Save audio to file
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    
    // Ensure podcasts directory exists
    const podcastsDir = path.join(__dirname, 'podcasts');
    if (!fs.existsSync(podcastsDir)) {
      fs.mkdirSync(podcastsDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, audioBuffer);
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n🎵 Audio file saved:`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   Buffer size: ${audioBuffer.length} bytes`);
    
    // Test estimated duration
    const estimatedDuration = ttsService.estimateDuration(script);
    console.log(`   Estimated duration: ${estimatedDuration}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 You can now play the audio file to verify it sounds clear and natural.');
    
    return {
      success: true,
      filePath,
      size: fileSizeMB,
      duration: estimatedDuration,
      generationTime: duration
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    console.error('\nFull error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testGeminiTTS()
    .then((result) => {
      if (result.success) {
        console.log('\n🔍 Test Results Summary:');
        console.log(`✅ Audio generated: ${result.filePath}`);
        console.log(`📊 File size: ${result.size} MB`);
        console.log(`⏱️  Generation time: ${result.generationTime}s`);
        console.log(`🕒 Estimated duration: ${result.duration}`);
        process.exit(0);
      } else {
        console.log('\n❌ Test failed - see error above');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = testGeminiTTS;