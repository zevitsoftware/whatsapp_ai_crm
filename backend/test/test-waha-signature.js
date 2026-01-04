const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api';
const SECRET = 'zevitsoft_webhook_secret_123';

async function testWahaWebhookWithSignature() {
  try {
    console.log('🚀 Testing WAHA Webhook with Signature...');

    const payload = {
      event: 'message',
      session: 'default',
      payload: {
        id: '123456',
        from: '628123456789@c.us',
        type: 'chat',
        body: 'Hello check signature'
      }
    };

    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    console.log(`🔍 Signature: ${signature}`);

    const response = await axios.post(`${BASE_URL}/webhooks/waha`, payload, {
      headers: {
        'X-WAHA-Signature': signature
      }
    });

    console.log('✅ Response:', response.data);

    // Test with invalid signature
    console.log('\n❌ Testing with INVALID signature...');
    try {
      await axios.post(`${BASE_URL}/webhooks/waha`, payload, {
        headers: {
          'X-WAHA-Signature': 'invalid'
        }
      });
    } catch (error) {
      console.log('✅ Correctly blocked (401):', error.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testWahaWebhookWithSignature();
