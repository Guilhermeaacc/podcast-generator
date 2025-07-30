#!/usr/bin/env node

const http = require('http');

async function testHttpEndpoint() {
  console.log('🔗 Testing HTTP Endpoint for N8N Integration...\n');

  try {
    // The same script format that user sends from N8N
    const testScript = `[Lucas] Bom dia, Antonio. Hoje é terça-feira, 29 de julho de 2025, e agora são 17:52. Em menos de 6 minutos, você vai entender a diferença entre o mercado imobiliário da Flórida e o do Brasil.

[Ana] Olha, vamos começar por essa da Flórida, então. Sempre ouço falar que é um bom lugar pra investir em imóvel, mas parece que as coisas estão mudando, né?

[Lucas] Exatamente. Deu uma esfriada, sim. O motivo principal é que o banco central americano, o Federal Reserve, manteve as taxas de juros altas.`;

    const postData = JSON.stringify({
      script: testScript
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/generate-podcast',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('📝 Sending script to HTTP endpoint...');
    console.log('Script starts with:', testScript.substring(0, 100) + '...');
    console.log('');

    const req = http.request(options, (res) => {
      console.log(`📡 Response status: ${res.statusCode}`);
      console.log(`📡 Response headers:`, res.headers);

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          
          if (response.success) {
            console.log('\n✅ HTTP Endpoint Test Successful!');
            console.log('📄 Audio generated:');
            console.log(`   File: ${response.audio.fileName}`);
            console.log(`   Format: ${response.audio.mimeType}`);
            console.log(`   Duration: ${response.audio.duration}`);
            console.log(`   Speakers: ${response.audio.speakers.join(', ')}`);
            console.log(`   Technology: ${response.audio.technology}`);
            console.log(`   Base64 length: ${response.audio.base64.length} chars`);
            
            console.log('\n🎉 Voice mapping fix works with HTTP endpoint!');
            console.log('💡 The N8N integration should now work correctly.');
          } else {
            console.log('\n❌ HTTP Endpoint Test Failed:');
            console.log('Error:', response.error);
          }
        } catch (parseError) {
          console.log('\n❌ Failed to parse response:');
          console.log('Raw response:', responseData.substring(0, 500));
          console.log('Parse error:', parseError.message);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ HTTP Request Error:');
      console.error(error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Make sure the server is running:');
        console.log('   npm start');
        console.log('   or');  
        console.log('   node server.js');
      }
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('\n❌ Test setup error:', error);
  }
}

// Run the test
if (require.main === module) {
  testHttpEndpoint();
}

module.exports = testHttpEndpoint;