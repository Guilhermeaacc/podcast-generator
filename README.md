# 🎙️ AI Podcast Generator

A web application that converts text scripts into AI-generated podcasts using Google's Text-to-Speech API.

## Features

- **Script Parsing**: Automatically identifies speakers from formatted text
- **Multiple Voices**: Assigns different voices to different speakers
- **Natural Speech**: Uses SSML formatting for natural-sounding audio with pauses and emphasis
- **Audio Merging**: Combines all speaker segments into a single podcast file
- **Modern UI**: Clean, responsive design with purple/blue gradient
- **Progress Tracking**: Real-time progress indicators during generation
- **Audio Preview**: Built-in player to preview the generated podcast
- **Download**: Save the final podcast as an audio file

## How to Use

### Prerequisites

1. **Google Cloud TTS API Key**: 
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Text-to-Speech API
   - Create an API key with TTS permissions

### Script Format

Format your script like this:
```
[Sarah] Welcome to the podcast! Today we're discussing AI.
[John] That's right, Sarah. Let me explain what machine learning is.
[Sarah] Great explanation! What about neural networks?
```

### Steps

1. **Enter API Key**: Paste your Google TTS API key in the secure input field
2. **Write Script**: Use the format `[Speaker] Text` for each line
3. **Generate**: Click "Generate Podcast" and wait for processing
4. **Preview**: Use the built-in audio player to listen
5. **Download**: Save the final podcast file

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Technical Details

### Supported Features

- **SSML Enhancement**: Automatic addition of pauses, emphasis, and natural speech patterns
- **Voice Assignment**: Alternates between male and female voices for different speakers
- **Currency & Numbers**: Proper pronunciation of monetary values and percentages
- **Audio Merging**: Seamless combination of multiple audio segments
- **Error Handling**: Clear error messages and validation

### Voice Mapping

- First speaker: Female voice (en-US-Neural2-F)
- Second speaker: Male voice (en-US-Neural2-J)
- Third speaker: Female voice (en-US-Neural2-C)
- Fourth speaker: Male voice (en-US-Neural2-D)
- Pattern repeats for additional speakers

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure your Google Cloud TTS API is enabled and the key has proper permissions
2. **CORS Issues**: The app makes direct API calls to Google's TTS service - ensure your API key allows web requests
3. **Audio Playback**: Some browsers may require user interaction before playing audio
4. **Large Scripts**: Very long scripts may take several minutes to process

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Full support (may require user interaction for audio)

## Security Notes

- API keys are stored only in browser memory (not persisted)
- Use the password field type to hide API key input
- Consider implementing server-side API calls for production use

## License

MIT License - feel free to use and modify as needed.
