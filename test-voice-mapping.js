#!/usr/bin/env node

const GeminiTTSService = require('./src/api/gemini-tts');
const fs = require('fs');
const path = require('path');

async function testVoiceMapping() {
  console.log('🎙️  Testing Voice Mapping with User\'s Script Format...\n');

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_TTS_API_KEY;
    const ttsService = new GeminiTTSService(apiKey);
    
    // Use the user's exact script format that starts with Lucas
    const testScript = `[Lucas] Bom dia, Antonio. Hoje é terça-feira, 29 de julho de 2025, e agora são 17:52. Em menos de 6 minutos, você vai entender a diferença entre o mercado imobiliário da Flórida e o do Brasil.

[Ana] Olha, vamos começar por essa da Flórida, então. Sempre ouço falar que é um bom lugar pra investir em imóvel, mas parece que as coisas estão mudando, né?

[Lucas] Exatamente. Deu uma esfriada, sim. O motivo principal é que o banco central americano, o Federal Reserve, manteve as taxas de juros altas.`;
    
    console.log('📝 Test Script (starts with Lucas):');
    console.log(testScript);
    console.log('');
    
    // Progress callback
    const progressCallback = (progress) => {
      console.log(`[${progress.stage.toUpperCase()}] ${progress.progress}% - ${progress.message}`);
    };
    
    console.log('🚀 Starting voice mapping test...\n');
    
    // Generate audio
    const startTime = Date.now();
    const audioBase64 = await ttsService.generatePodcastAudio(testScript, progressCallback);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Audio generated in ${duration} seconds!`);
    
    // Save test file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `voice_mapping_test_${timestamp}.wav`;
    const filePath = path.join(__dirname, 'podcasts', filename);
    
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Ensure podcasts directory exists
    const podcastsDir = path.join(__dirname, 'podcasts');
    if (!fs.existsSync(podcastsDir)) {
      fs.mkdirSync(podcastsDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, audioBuffer);
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n🎵 Test audio saved:`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    
    console.log('\n🔍 Voice Mapping Test Results:');
    console.log('   Expected: Lucas (male) should speak first');
    console.log('   Expected: Ana (female) should speak second');
    console.log('   Expected: Lucas (male) should speak third');
    console.log('\n💡 Listen to the audio file to verify voice mapping is correct.');
    
    return {
      success: true,
      filePath,
      size: fileSizeMB
    };
    
  } catch (error) {
    console.error('\n❌ Voice mapping test failed:');
    console.error(error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testVoiceMapping()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Voice mapping test completed!');
        console.log(`📁 Check the generated audio: ${result.filePath}`);
        process.exit(0);
      } else {
        console.log('\n❌ Voice mapping test failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = testVoiceMapping;