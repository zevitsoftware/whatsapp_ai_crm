const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let token;
let packageId;
let transactionId;

async function testSubscription() {
  try {
    console.log('🚀 Starting Subscription Test...');

    // 0. Register (if not exists)
    console.log('\n📝 Registering user...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      });
      console.log('✅ Registered');
    } catch (e) {
      console.log('ℹ️ User might already exist');
    }

    // 1. Login
    console.log('\n🔐 Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'john@example.com',
      password: 'password123'
    });
    token = loginRes.data.token;
    console.log('✅ Logged in');

    // 2. List Packages
    console.log('\n📦 Fetching packages...');
    const packagesRes = await axios.get(`${BASE_URL}/subscriptions/packages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${packagesRes.data.length} packages`);
    packageId = packagesRes.data.find(p => p.type === 'PRO').id;

    // 3. Choose Package
    console.log(`\n💳 Choosing "PRO" package (${packageId})...`);
    const chooseRes = await axios.post(`${BASE_URL}/subscriptions/choose`, {
      packageId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ QRIS Invoice created');
    transactionId = chooseRes.data.transactionId;
    console.log(`📝 Transaction ID: ${transactionId}`);
    console.log(`🔗 QRIS URL: ${chooseRes.data.qrisUrl}`);

    // 4. Check Status (Should be PENDING/FREE)
    console.log('\n⏳ Checking current sub status...');
    const statusRes1 = await axios.get(`${BASE_URL}/subscriptions/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('📊 Current Status:', statusRes1.data);

    // 5. Simulate QRIS Callback (Webhook)
    console.log('\n📡 Simulating QRIS Success Callback...');
    const callbackRes = await axios.post(`${BASE_URL}/subscriptions/callback`, {
      external_id: transactionId,
      status: 'SUCCESS',
      amount: 150000
    }, {
      headers: { 'x-qris-signature': 'mock_signature' } // Service allows mock for dev
    });
    console.log('✅ Callback processed');

    // 6. Final Status Check
    console.log('\n📊 Checking final sub status...');
    const statusRes2 = await axios.get(`${BASE_URL}/subscriptions/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('🌈 NEW Status:', statusRes2.data);
    
    if (statusRes2.data.subscriptionType === 'PRO' && statusRes2.data.subscriptionStatus === 'ACTIVE') {
      console.log('\n✨ TEST PASSED: Subscription activated successfully!');
    } else {
      console.log('\n❌ TEST FAILED: Subscription status not updated correctly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSubscription();
