import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const exampleScript = `[Ana] Bem-vindos ao podcast Tech Talk! Eu sou a Ana, e hoje vamos mergulhar fundo no mundo da inteligência artificial.
[Carlos] Olá pessoal, eu sou o Carlos. Obrigado por se juntarem a nós hoje, Ana. A IA é realmente um tópico fascinante.
[Ana] Absolutamente! Vamos começar com o básico. Carlos, você pode explicar o que é machine learning?
[Carlos] Claro! Machine learning é um subconjunto da IA onde computadores aprendem padrões dos dados sem serem explicitamente programados para cada cenário.
[Ana] Essa é uma excelente explicação. E é incrível como essa tecnologia está transformando indústrias como saúde, finanças e até entretenimento.
[Carlos] Exatamente! Desde recomendações personalizadas em plataformas de streaming até assistência em diagnósticos médicos, a IA está em todos os lugares.
[Ana] Bem, isso encerra o episódio de hoje. Obrigada por nos ouvirem, e nos vemos na próxima!
[Carlos] Não se esqueçam de se inscrever e deixar uma avaliação. Até a próxima!`;

  const parseScript = (scriptText) => {
    const lines = scriptText.split('\n').filter(line => line.trim());
    const speakers = {};
    const segments = [];

    lines.forEach(line => {
      const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (match) {
        const speaker = match[1].trim();
        const text = match[2].trim();
        
        if (!speakers[speaker]) {
          speakers[speaker] = Object.keys(speakers).length;
        }
        
        segments.push({ speaker, text });
      }
    });

    return { speakers, segments };
  };

  const getVoiceForSpeaker = (speakerIndex) => {
    // Enhanced voice configuration with speaking styles for natural conversation
    const voiceConfigs = [
      { 
        voice: 'en-US-Studio-O', // Female - Conversational host
        style: 'conversational',
        description: 'Primary female host - warm, engaging'
      },
      { 
        voice: 'en-US-Studio-Q', // Male - Expert guest
        style: 'newscast',
        description: 'Primary male host - authoritative, clear'
      },
      { 
        voice: 'en-US-Studio-O', // Female - Secondary/guest
        style: 'friendly',
        description: 'Secondary female speaker - enthusiastic'
      },
      { 
        voice: 'en-US-Studio-Q', // Male - Secondary/expert
        style: 'conversational',
        description: 'Secondary male speaker - thoughtful'
      }
    ];
    return voiceConfigs[speakerIndex % voiceConfigs.length].voice;
  };

  // Get speaking style context for SSML enhancement
  const getSpeakingStyle = (speakerIndex) => {
    const styles = ['conversational', 'newscast', 'friendly', 'conversational'];
    return styles[speakerIndex % styles.length];
  };

  const addSSMLFormatting = (text, speakerIndex = 0) => {
    // Studio voice optimized SSML - minimal markup approach
    let formatted = text;
    
    // Structure: Wrap in paragraphs and sentences for Studio voice optimization
    const sentences = formatted.split(/([.!?]+)/).filter(s => s.trim());
    const structuredSentences = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i]?.trim();
      const punctuation = sentences[i + 1] || '';
      if (sentence) {
        structuredSentences.push(`<s>${sentence}${punctuation}</s>`);
      }
    }
    
    // Join sentences with strategic breaks (Studio voice best practice)
    formatted = structuredSentences.join('<break time="400ms"/>');
    
    // Wrap in paragraph tags for proper structure
    formatted = `<p>${formatted}</p>`;
    
    // Minimal emphasis for truly important words only
    formatted = formatted.replace(/\b(important|crucial|key|essential|amazing|incredible)\b/gi, 
      '<emphasis level="moderate">$1</emphasis>');
    
    // Questions get slightly longer pause
    formatted = formatted.replace(/\?<break time="400ms"\/>/g, '?<break time="600ms"/>');
    
    // Numbers and currency (Studio voice supported)
    formatted = formatted.replace(/\b(\d+)\s*%/gi, '<say-as interpret-as="number">$1</say-as> percent');
    formatted = formatted.replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '<say-as interpret-as="currency">$&</say-as>');
    formatted = formatted.replace(/\b(\d+(?:,\d{3})*)\b/g, '<say-as interpret-as="number">$1</say-as>');
    
    // Subtle rate adjustment for different speaker styles (very minimal)
    const speakingStyle = getSpeakingStyle(speakerIndex);
    if (speakingStyle === 'newscast') {
      formatted = `<prosody rate="102%">${formatted}</prosody>`;
    } else {
      formatted = `<prosody rate="98%">${formatted}</prosody>`;
    }
    
    return formatted;
  };

  const synthesizeSpeech = async (text, voice, speakerIndex = 0) => {
    // Studio voices support SSML (except <mark>, <emphasis>, <prosody pitch>, and <lang>)
    const isStudioVoice = voice.includes('Studio');
    const inputData = isStudioVoice 
      ? { ssml: `<speak>${addSSMLFormatting(text, speakerIndex)}</speak>` }
      : { text: text };
    
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: inputData,
        voice: { 
          languageCode: 'en-US', 
          name: voice,
          ssmlGender: voice.includes('Studio-O') ? 'FEMALE' : 'MALE'
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 1.0
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`TTS API error: ${errorMessage}`);
    }

    const data = await response.json();
    return data.audioContent;
  };

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const mergeAudioBuffers = async (audioBuffers, segments = []) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Filter out any invalid buffers and decode them
    const validBuffers = audioBuffers.filter(buffer => buffer && buffer.byteLength > 0);
    if (validBuffers.length === 0) {
      throw new Error('No valid audio buffers to merge');
    }

    const buffers = await Promise.all(
      validBuffers.map(buffer => audioContext.decodeAudioData(buffer.slice()))
    );

    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const numberOfChannels = buffers[0].numberOfChannels;
    const sampleRate = buffers[0].sampleRate;

    // Calculate natural pause lengths between speakers
    const getPauseLength = (currentIndex, nextIndex) => {
      const currentSpeaker = segments[currentIndex]?.speaker;
      const nextSpeaker = segments[nextIndex]?.speaker;
      
      // Same speaker continuing: short pause (0.2s)
      if (currentSpeaker === nextSpeaker) return 0.2;
      
      // Speaker change: medium pause (0.5s)
      if (currentSpeaker !== nextSpeaker) return 0.5;
      
      // Default pause
      return 0.3;
    };

    let totalLengthWithSilence = totalLength;
    for (let i = 0; i < buffers.length - 1; i++) {
      const pauseLength = getPauseLength(i, i + 1);
      totalLengthWithSilence += Math.floor(sampleRate * pauseLength);
    }

    const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLengthWithSilence, sampleRate);

    let offset = 0;
    buffers.forEach((buffer, index) => {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        mergedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
      }
      offset += buffer.length;
      
      // Add natural pause between segments (except after the last one)
      if (index < buffers.length - 1) {
        const pauseLength = getPauseLength(index, index + 1);
        const silenceSamples = Math.floor(sampleRate * pauseLength);
        offset += silenceSamples;
      }
    });

    return mergedBuffer;
  };

  const audioBufferToBlob = async (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const generatePodcast = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Google TTS API key');
      return;
    }

    if (!script.trim()) {
      setError('Please enter a script');
      return;
    }

    setIsGenerating(true);
    setError('');
    setProgress(0);
    setAudioUrl(null);

    try {
      const { speakers, segments } = parseScript(script);
      
      if (segments.length === 0) {
        throw new Error('No valid speaker segments found. Make sure to format like [Speaker] Text');
      }

      setProgress(10);

      const audioBuffers = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const speakerIndex = speakers[segment.speaker];
        const voice = getVoiceForSpeaker(speakerIndex);
        
        setProgress(10 + (i / segments.length) * 70);
        
        const audioContent = await synthesizeSpeech(segment.text, voice, speakerIndex);
        const arrayBuffer = base64ToArrayBuffer(audioContent);
        audioBuffers.push(arrayBuffer);
      }

      setProgress(85);

      const mergedBuffer = await mergeAudioBuffers(audioBuffers, segments);
      const blob = await audioBufferToBlob(mergedBuffer);
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      setProgress(100);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPodcast = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'podcast.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🎙️ AI Podcast Generator</h1>
          <p>Convert your scripts into natural-sounding podcasts using Google's Text-to-Speech</p>
        </header>

        <div className="form-section">
          <div className="input-group">
            <label htmlFor="api-key">Google TTS API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google Cloud TTS API key"
              className="api-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="script">Podcast Script</label>
            <div className="script-controls">
              <button 
                onClick={() => setScript(exampleScript)}
                className="example-btn"
                type="button"
              >
                Load Example Script
              </button>
            </div>
            <textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your script using format: [Speaker] Text..."
              className="script-input"
              rows={15}
            />
          </div>

          <button 
            onClick={generatePodcast}
            disabled={isGenerating}
            className="generate-btn"
          >
            {isGenerating ? 'Generating...' : 'Generate Podcast'}
          </button>

          {isGenerating && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p>{progress}% Complete</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {audioUrl && (
            <div className="audio-section">
              <h3>🎧 Your Podcast is Ready!</h3>
              <audio 
                ref={audioRef}
                controls 
                src={audioUrl}
                className="audio-player"
              />
              <button 
                onClick={downloadPodcast}
                className="download-btn"
              >
                📥 Download Podcast
              </button>
            </div>
          )}
        </div>

        <div className="instructions">
          <h3>📝 How to Use</h3>
          <ol>
            <li>Get a Google Cloud TTS API key from the Google Cloud Console</li>
            <li>Enter your API key in the field above</li>
            <li>Write your script using the format: <code>[Speaker] Text</code></li>
            <li>Each speaker will get a different voice automatically</li>
            <li>Click "Generate Podcast" and wait for the magic!</li>
          </ol>
          
          <h4>💡 Tips for Better Results</h4>
          <ul>
            <li>Use clear speaker names like [Sarah] or [John]</li>
            <li>Write naturally - the AI will add pauses and emphasis</li>
            <li>Keep individual segments reasonable length (1-3 sentences)</li>
            <li>Numbers and currency will be spoken naturally</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;