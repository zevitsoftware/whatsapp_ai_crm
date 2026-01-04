const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';
const TEST_USER = {
  name: 'Test Auth User',
  email: `test_${Date.now()}@example.com`, // Unique email per run
  password: 'Password123!',
  companyName: 'Test Corp'
};

async function testAuth() {
  console.log('🔐 Testing Authentication System...');

  try {
    // 1. Register
    console.log(`\n📝 Registering user: ${TEST_USER.email}`);
    const regRes = await axios.post(`${BASE_URL}/register`, TEST_USER);
    console.log('✅ Registration successful!');
    console.log('Token:', regRes.data.token ? 'Present' : 'Missing');

    const token = regRes.data.token;

    // 2. Login (for sanity check, though register returns token)
    console.log('\n🔑 Testing Login...');
    const loginRes = await axios.post(`${BASE_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    console.log('✅ Login successful!');
    
    // 3. Verify Me
    console.log('\n👤 Verifying /me endpoint...');
    const meRes = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ /me verification successful!');
    console.log('User Data:', meRes.data);

    if (meRes.data.email === TEST_USER.email) {
      console.log('\n🎉 AUTHENTICATION SYSTEM IS WORKING PERFECTLY! 🎉');
    } else {
      console.error('\n❌ Data mismatch in /me response');
    }

  } catch (error) {
    console.error('\n❌ Auth Test Failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testAuth();
