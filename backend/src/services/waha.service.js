const axios = require('axios');

class WahaService {
  constructor() {
    // Determine Base URL: 
    // If running in Docker, 'waha' service name resolves.
    // If running locally (testing), might need localhost.
    // We trust process.env.WAHA_BASE_URL which defaults to http://waha:3000 in .env
    this.baseUrl = process.env.WAHA_BASE_URL || 'http://waha:3000';
    this.apiKey = process.env.WAHA_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Request Interceptor for logging
    this.client.interceptors.request.use(request => {
      // console.log('Starting Request', request); // Debug only
      return request;
    });
  }

  /**
   * Create (and optionally start) a new WAHA session
   * @param {string} sessionName 
   */
  async createSession(sessionName) {
    try {
      const webhookUrl = process.env.WAHA_WEBHOOK_URL || 'http://backend:3000/webhooks/waha';
      const secret = process.env.WAHA_WEBHOOK_SECRET;
      
      // Append secret to URL for fallback verification
      const finalUrl = secret ? `${webhookUrl}?secret=${secret}` : webhookUrl;

      const response = await this.client.post('/api/sessions', {
        name: sessionName,
        config: {
          proxy: null,
          webhooks: [
            {
              url: finalUrl,
              events: ["*"],
              hmac: secret ? { key: secret } : null
            }
          ],
          noweb: {
            store: {
              enabled: true,
              fullSync: false
            }
          }
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Start an existing session
   * @param {string} sessionName 
   */
  async startExistingSession(sessionName) {
    try {
      const response = await this.client.post(`/api/sessions/${sessionName}/start`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Set Webhooks for a session
   * @param {string} sessionName 
   */
  async setWebhooks(sessionName) {
    try {
      // WAHA Plus / GOWS usually allows updating config or specific webhook endpoint
      // Let's try the most generic way if it's available
      const response = await this.client.post(`/api/sessions/${sessionName}/webhooks`, [
        {
          url: process.env.WAHA_WEBHOOK_URL || 'http://backend:3000/webhooks/waha',
          events: ["*"],
          hmac: process.env.WAHA_WEBHOOK_SECRET ? { key: process.env.WAHA_WEBHOOK_SECRET } : null
        }
      ]);
      return response.data;
    } catch (error) {
       console.warn(`[WahaService] /webhooks endpoint failed (${error.response?.status}), trying config update...`);
       
       // Fallback: Update session config directly
       try {
         const webhookUrl = process.env.WAHA_WEBHOOK_URL || 'http://backend:3000/webhooks/waha';
         const secret = process.env.WAHA_WEBHOOK_SECRET;
         const finalUrl = secret ? `${webhookUrl}?secret=${secret}` : webhookUrl;

         const response = await this.client.patch(`/api/sessions/${sessionName}`, {
           config: {
             webhooks: [
              {
                url: finalUrl,
                events: ["*"],
                hmac: secret ? { key: secret } : null
              }
             ]
           }
         });
         return response.data;
       } catch (patchError) {
         this.handleError(patchError);
       }
    }
  }

  /**
   * Delete a session
   * @param {string} sessionName 
   */
  async deleteSession(sessionName) {
    try {
      const response = await this.client.delete(`/api/sessions/${sessionName}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Already deleted
      }
      this.handleError(error);
    }
  }

  /**
   * Stop/Logout a session
   * @param {string} sessionName 
   */
  async stopSession(sessionName) {
    try {
      const response = await this.client.post(`/api/sessions/${sessionName}/stop`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Already stopped
      }
      this.handleError(error);
    }
  }

  /**
   * Get Session Status (and implicitly QR if scanning)
   * The screenshot endpoint is better for QR.
   */
  async getSession(sessionName) {
    try {
      const response = await this.client.get(`/api/sessions/${sessionName}`);
      return response.data;
    } catch (error) {
       if (error.response && error.response.status === 404) {
        return null;
      }
      this.handleError(error);
    }
  }

  /**
   * Get QR Code
   * Verified: GET /api/{session}/auth/qr?format=image returns binary image
   */
  async getQRCode(sessionName) {
    try {
      const fullUrl = `${this.baseUrl}/api/${sessionName}/auth/qr?format=image`;
      console.log(`[WahaService] Requesting QR: ${fullUrl}`);
      const response = await this.client.get(`/api/${sessionName}/auth/qr`, {
        params: { format: 'image' },
        responseType: 'arraybuffer' 
      });
      
      // Convert buffer to base64 data URI
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error(`Error getting QR for ${sessionName}:`, error.response?.data?.toString() || error.message);
      return null;
    }
  }
  
  /**
   * Get All Sessions
   */
  async getSessions() {
    try {
      const response = await this.client.get('/api/sessions');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Send Text Message
   */
  async sendText(sessionName, params) {
    // params: { chatId, text, replyTo }
    try {
      const response = await this.client.post('/api/sendText', {
        session: sessionName,
        chatId: params.chatId,
        text: params.text,
        reply_to: params.replyTo
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Set Chat Seen status
   */
  async sendSeen(sessionName, chatId) {
    try {
      await this.client.post('/api/sendSeen', {
        session: sessionName,
        chatId: chatId
      });
    } catch (error) {
      console.warn(`[WahaService] Failed to sendSeen: ${error.message}`);
    }
  }

  /**
   * Start typing indicator
   */
  async startTyping(sessionName, chatId) {
    try {
      await this.client.post('/api/startTyping', {
        session: sessionName,
        chatId: chatId
      });
    } catch (error) {
      console.warn(`[WahaService] Failed to startTyping: ${error.message}`);
    }
  }

  /**
   * Stop typing indicator
   */
  async stopTyping(sessionName, chatId) {
    try {
      await this.client.post('/api/stopTyping', {
        session: sessionName,
        chatId: chatId
      });
    } catch (error) {
      console.warn(`[WahaService] Failed to stopTyping: ${error.message}`);
    }
  }
  
  /**
   * Check if WAHA is alive
   */
  async healthCheck() {
    try {
      await this.client.get('/api/server/status'); // or similar endpoint
      return true;
    } catch (error) {
      return false;
    }
  }

  handleError(error) {
    const msg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[WahaService Error]: ${msg}`);
    throw new Error(`WAHA Error: ${msg}`);
  }
}

module.exports = new WahaService();
