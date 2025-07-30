// Google Drive Integration for Podcast File Upload

const https = require('https');
const querystring = require('querystring');

class GoogleDriveService {
  constructor(credentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.refreshToken = credentials.refreshToken;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });

      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.access_token) {
              this.accessToken = result.access_token;
              this.tokenExpiry = Date.now() + (result.expires_in * 1000);
              resolve(this.accessToken);
            } else {
              reject(new Error(`Failed to get access token: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse token response: ${error.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Token request error: ${error.message}`));
      });

      request.write(postData);
      request.end();
    });
  }

  async uploadFile(fileName, audioBase64, folderId = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Create file metadata
      const metadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      };

      // Create multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadataSection = delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata);

      const mediaSection = delimiter +
        'Content-Type: audio/mpeg\r\n\r\n';

      const multipartRequestBody = Buffer.concat([
        Buffer.from(metadataSection, 'utf8'),
        Buffer.from(mediaSection, 'utf8'),
        audioBuffer,
        Buffer.from(close_delim, 'utf8')
      ]);

      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          port: 443,
          path: '/upload/drive/v3/files?uploadType=multipart',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
            'Content-Length': multipartRequestBody.length
          }
        };

        const request = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              if (response.statusCode === 200) {
                const result = JSON.parse(data);
                resolve({
                  fileId: result.id,
                  fileName: result.name,
                  webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
                  downloadLink: `https://drive.google.com/uc?id=${result.id}`
                });
              } else {
                reject(new Error(`Upload failed: ${response.statusCode} - ${data}`));
              }
            } catch (error) {
              reject(new Error(`Failed to parse upload response: ${error.message}`));
            }
          });
        });

        request.on('error', (error) => {
          reject(new Error(`Upload request error: ${error.message}`));
        });

        request.write(multipartRequestBody);
        request.end();
      });
    } catch (error) {
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify(metadata);
        
        const options = {
          hostname: 'www.googleapis.com',
          port: 443,
          path: '/drive/v3/files',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const request = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              if (response.statusCode === 200) {
                const result = JSON.parse(data);
                resolve({
                  folderId: result.id,
                  folderName: result.name
                });
              } else {
                reject(new Error(`Folder creation failed: ${response.statusCode} - ${data}`));
              }
            } catch (error) {
              reject(new Error(`Failed to parse folder response: ${error.message}`));
            }
          });
        });

        request.on('error', (error) => {
          reject(new Error(`Folder creation error: ${error.message}`));
        });

        request.write(postData);
        request.end();
      });
    } catch (error) {
      throw new Error(`Google Drive folder creation failed: ${error.message}`);
    }
  }
}

module.exports = GoogleDriveService;