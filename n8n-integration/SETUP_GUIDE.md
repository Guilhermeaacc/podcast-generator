# N8N Podcast Integration Setup Guide

## Quick Setup (5 minutes)

### 1. Use Your Railway Server
Your podcast server is now hosted on Railway 24/7 at:
**https://podcast-generator-production-6b10.up.railway.app**

No need to start a local server anymore!

### 2. Add Two New Nodes to N8N Workflow

#### Step A: Add Code Node (Script Generator)
1. **Add Code Node** after the "AI Agent" node
2. **Copy the entire code** from `podcast-script-template.js`
3. **Paste it** in the Code Node

#### Step B: Add HTTP Request Node (Audio Generator)
1. **Add HTTP Request node** after the Code node
2. **Configure the HTTP Request node:**

   - **Method:** POST
   - **URL:** `https://podcast-generator-production-6b10.up.railway.app/api/generate-podcast`
   - **Headers:**
     - Content-Type: `application/json`
   - **Body Type:** JSON
   - **JSON Body:**
   ```json
   {
     "script": "{{ $json.script }}",
     "options": {
       "enableProgress": false
     }
   }
   ```

#### Step C: Add WhatsApp Audio Node
1. **Add another Evolution API node** after HTTP Request
2. **Configure for audio message:**
   - **Resource:** messages-api
   - **Message Type:** Audio
   - **Audio Data:** `{{ $json.audio.base64 }}`
   - **Remote JID:** Your subscriber list

### 3. Updated Workflow Structure
```
AI Agent → Code (Script) → HTTP Request (Audio) → WhatsApp Audio → Code (WhatsApp Text) → Loop_Split1
```

### 4. Test the Integration

1. **Run your workflow manually**
2. **Check the Code node output** - you should see:
   ```json
   {
     "script": "[Host] Boa tarde e bem-vindos ao seu resumo diário...",
     "newsCount": 5,
     "timestamp": "2025-07-14T23:00:00.000Z"
   }
   ```

3. **Check the HTTP Request node output** - you should see:
   ```json
   {
     "success": true,
     "audio": {
       "base64": "UklGRiQAAABXQVZF...",
       "fileName": "podcast_14072025_2100.mp3",
       "downloadUrl": "/download/podcast_14072025_2100.mp3",
       "mimeType": "audio/mpeg",
       "duration": "5 minutos"
     }
   }
   ```

4. **WhatsApp Audio Message** - The base64 audio will be sent automatically to subscribers

## Google Drive Integration (Optional)

To upload directly to Google Drive, you need to set up OAuth credentials:

### 1. Get Google Drive API Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Download the credentials JSON

### 2. Set Environment Variables
Create a `.env` file in your podcast-generator folder:
```env
GOOGLE_TTS_API_KEY=AIzaSyB4HYATvK6oKUMi1FvaKSEvYV7qRIxCdWg
GOOGLE_DRIVE_CREDENTIALS={"clientId":"your-client-id","clientSecret":"your-client-secret","refreshToken":"your-refresh-token"}
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

### 3. Get Refresh Token
Run this in your podcast-generator folder:
```bash
node -e "
const readline = require('readline');
const https = require('https');

// Use your client ID and secret
const clientId = 'your-client-id';
const clientSecret = 'your-client-secret';

console.log('Visit this URL:');
console.log(\`https://accounts.google.com/o/oauth2/auth?client_id=\${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/drive.file\`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', (code) => {
  // Exchange code for tokens
  // (Code to get refresh token)
  rl.close();
});
"
```

## Complete Workflow Structure

```
Schedule Trigger (9 AM & 9 PM)
    ↓
AI Agent (Gets news + curates)
    ↓
Code (Creates podcast script) ← NEW NODE
    ↓
HTTP Request (Generates audio) ← NEW NODE
    ↓
WhatsApp Audio (Sends podcast) ← NEW NODE
    ↓
Code (Formats text messages)
    ↓
Loop_Split1 → Output EvoAPI2 → Wait_Split1
```

## What Happens Automatically

1. **9 AM & 9 PM:** Workflow triggers
2. **AI Agent:** Gets 7 news articles, selects best 5
3. **Code Node:** Creates professional podcast script from news
4. **HTTP Request:** Converts script to MP3 audio using Google TTS
5. **WhatsApp Audio:** Sends podcast audio to subscribers
6. **Code Node:** Continues with text messages as before
7. **Result:** Subscribers get BOTH podcast audio AND text messages

## File Locations

- **Local files:** `podcast-generator/podcasts/podcast_DDMMYYYY_HHMM.mp3`
- **Google Drive:** Uploaded to specified folder
- **Download URL:** `https://podcast-generator-production-6b10.up.railway.app/download/podcast_DDMMYYYY_HHMM.mp3`

## Troubleshooting

### Server issues?
Your server runs automatically on Railway 24/7. If there are issues:
- Check Railway dashboard for deployment status
- View logs in Railway dashboard
- Ensure GEMINI_API_KEY is set in Railway environment variables

### HTTP Request timing out?
- Increase timeout to 5 minutes (300000ms)
- Check Railway deployment status

### Audio quality issues?
- Try different Google TTS voices in `src/api/google-tts.js`
- Adjust speaking rate/pitch parameters

### Need help?
- Check server logs: View Railway dashboard logs
- Test API directly: `curl -X POST https://podcast-generator-production-6b10.up.railway.app/api/podcast/health`

## Sample Output

Your podcast will include:
- Professional Portuguese intro
- Natural transitions between news stories
- Each of the 5 curated news articles
- Professional outro with next episode info
- Duration: ~5-10 minutes depending on content