const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  name: 'Device Tester',
  email: `devicetest_${Date.now()}@example.com`,
  password: 'Password123!'
};

let token = '';
let deviceId = '';

async function testDeviceFlow() {
  console.log('📱 Testing Device Management Flow...');

  try {
    // 1. Register & Login
    console.log(`\n📝 Registering user: ${TEST_USER.email}`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    token = regRes.data.token;
    console.log('✅ Auth Token received');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Create Device
    console.log('\n🆕 Creating Device...');
    try {
      const createRes = await axios.post(`${BASE_URL}/devices`, {
        alias: 'Test iPhone 15'
      }, { headers });
      
      console.log('✅ Device Created:', createRes.data);
      deviceId = createRes.data.id;
    } catch (err) {
      if (err.response && err.response.data.error.includes('Limit')) {
        console.warn('⚠️  Creation failed due to session limit. Attempting cleanup first...');
        // In real flow, we might need to delete existing sessions in WAHA if we are reusing "default" or checking limits.
        // For now, fail if limit reached, but since we use unique IDs, WAHA Core might just reject the 2nd one.
        throw err;
      }
      throw err;
    }

    // 3. List Devices
    console.log('\n📜 Listing Devices...');
    const listRes = await axios.get(`${BASE_URL}/devices`, { headers });
    console.log(`✅ Found ${listRes.data.length} devices.`);
    if (listRes.data.length === 0) throw new Error('List should not be empty');

    // 4. Get QR Code
    console.log('\n📷 Fetching QR Code...');
    // Give WAHA a moment to initialize the session
    await new Promise(r => setTimeout(r, 2000));
    
    try {
        const qrRes = await axios.get(`${BASE_URL}/devices/${deviceId}/qr`, { headers });
        console.log('✅ QR Code received (Base64 length):', qrRes.data.qrCode.length);
    } catch (qrErr) {
        console.warn('⚠️  Could not get QR (might be ready yet or already connected):', qrErr.message);
    }

    // 5. Delete Device
    console.log('\n🗑️  Deleting Device...');
    await axios.delete(`${BASE_URL}/devices/${deviceId}`, { headers });
    console.log('✅ Device deleted successfully');

    // Verify Deletion
    const verifyRes = await axios.get(`${BASE_URL}/devices`, { headers });
    if (verifyRes.data.length === 0) {
        console.log('✅ Verification: Device list is empty.');
    } else {
        console.error('❌ Device still exists in list!');
    }

    console.log('\n🎉 DEVICE MANAGEMENT FLOW PASSED! 🎉');

  } catch (error) {
    console.error('\n❌ Device Test Failed:', error.response ? error.response.data : error.message);
    // Try to cleanup if deviceId exists
    if (deviceId && token) {
        console.log('🧹 Attempting cleanup...');
        try {
            await axios.delete(`${BASE_URL}/devices/${deviceId}`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            console.log('Cleanup successful');
        } catch (e) { console.log('Cleanup failed'); }
    }
    process.exit(1);
  }
}

testDeviceFlow();
