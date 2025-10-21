const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing backend connection...');
    
    // Test the local backend
    const response = await axios.post('http://localhost:3006/api/code/analyze', {
      code: 'console.log("test");',
      language: 'javascript',
      filePath: 'test.js'
    }, {
      timeout: 10000
    });
    
    console.log('Backend response:', response.data);
    console.log('Backend is working correctly!');
  } catch (error) {
    console.error('Backend test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testBackend();