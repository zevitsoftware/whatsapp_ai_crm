const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  name: 'Contact Tester',
  email: `contacttest_${Date.now()}@example.com`,
  password: 'Password123!'
};

let token = '';

async function testContactFlow() {
  console.log('📇 Testing Contact Management Flow...');

  try {
    // 1. Register & Login
    console.log(`\n📝 Registering user: ${TEST_USER.email}`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    token = regRes.data.token;
    console.log('✅ Auth Token received');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Import CSV
    console.log('\n📤 Importing contacts from CSV...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(path.join(__dirname, 'test-contacts.csv')));

    const importRes = await axios.post(`${BASE_URL}/contacts/import`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders()
      }
    });

    console.log('✅ Import Result:', importRes.data);

    // 3. List Contacts
    console.log('\n📜 Listing Contacts...');
    const listRes = await axios.get(`${BASE_URL}/contacts`, { headers });
    console.log(`✅ Found ${listRes.data.total} contacts`);
    console.log('Sample:', listRes.data.contacts.slice(0, 2));

    // 4. Search Contacts
    console.log('\n🔍 Searching for "John"...');
    const searchRes = await axios.get(`${BASE_URL}/contacts?search=John`, { headers });
    console.log(`✅ Found ${searchRes.data.total} matching contacts`);

    // 5. Delete a Contact
    if (listRes.data.contacts.length > 0) {
      const contactId = listRes.data.contacts[0].id;
      console.log(`\n🗑️  Deleting contact ${contactId}...`);
      await axios.delete(`${BASE_URL}/contacts/${contactId}`, { headers });
      console.log('✅ Contact deleted');
    }

    console.log('\n🎉 CONTACT MANAGEMENT FLOW PASSED! 🎉');

  } catch (error) {
    console.error('\n❌ Contact Test Failed:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testContactFlow();
