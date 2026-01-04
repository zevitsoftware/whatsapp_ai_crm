const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAuthRateLimit() {
  console.log('🚀 Testing Auth Rate Limiting (5 requests per 15 mins)...');
  
  for (let i = 1; i <= 7; i++) {
    try {
      console.log(`📡 Request #${i}...`);
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'john@example.com',
        password: 'wrongpassword'
      });
      console.log(`✅ Success (Incorrectly?):`, response.status);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`🛑 CORRECTLY BLOCKED (429):`, error.response.data);
        break;
      } else {
        console.log(`❌ Request #${i} failed:`, error.response?.status, error.response?.data || error.message);
      }
    }
  }
}

testAuthRateLimit();
