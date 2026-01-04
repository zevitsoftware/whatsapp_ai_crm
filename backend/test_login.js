const axios = require('axios');

async function testLogin(email, password) {
  try {
    console.log(`Testing login for: ${email}`);
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: email,
      password: password
    });
    console.log('Login Success!');
    console.log('Status code:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Login Failed!');
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error message:', error.message);
    }
  }
}

// Provided test credentials
const testEmail = 'test_1767404049693@example.com';
const testPass = 'password123';

testLogin(testEmail, testPass);
