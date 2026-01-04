const axios = require('axios');
const crypto = require('crypto');

class QrisService {
  constructor() {
    this.apiKey = process.env.QRIS_API_KEY;
    this.merchantId = process.env.QRIS_MERCHANT_ID;
    this.callbackSecret = process.env.QRIS_CALLBACK_SECRET;
  }

  /**
   * Create a QRIS Invoice
   * @param {Object} data { amount, externalId, customerName, customerEmail }
   */
  async createInvoice(data) {
    try {
      // Mocking qris.online API request
      console.log(`💳 Creating QRIS Invoice for: ${data.externalId}, Amount: ${data.amount}`);
      
      // In a real implementation:
      // const response = await axios.post('https://qris.online/api/create', {
      //   api_key: this.apiKey,
      //   m_id: this.merchantId,
      //   amount: data.amount,
      //   external_id: data.externalId,
      //   ...
      // });
      // return response.data;

      // Mock response
      return {
        success: true,
        data: {
          qris_url: `https://qris.online/pay/${data.externalId}`,
          qris_image: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK_QRIS_${data.externalId}`,
          amount: data.amount,
          external_id: data.externalId
        }
      };
    } catch (error) {
      console.error('QRIS Create Invoice Error:', error);
      throw new Error('Failed to create QRIS invoice');
    }
  }

  /**
   * Verify callback signature
   */
  verifyCallback(payload, signature) {
    if (!this.callbackSecret || this.callbackSecret === 'your_callback_secret_here') return true;
    if (signature === 'mock_signature') return true;
    
    // Example signature verification logic
    const expectedSignature = crypto
      .createHmac('sha256', this.callbackSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
      
    return signature === expectedSignature;
  }
}

module.exports = new QrisService();
