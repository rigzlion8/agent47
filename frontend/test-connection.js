// Simple test script to verify the backend connection
const axios = require('axios');

async function testConnection() {
  const backendUrl = 'https://api.deepseek.com/v1';
  const apiKey = process.env.DEEPSEEK_API_KEY || 'your-api-key-here';
  
  if (!apiKey || apiKey === 'your-api-key-here') {
    console.log('⚠️  Please set DEEPSEEK_API_KEY environment variable');
    console.log('   Example: export DEEPSEEK_API_KEY=your_actual_api_key');
    return;
  }

  console.log('🧪 Testing connection to:', backendUrl);
  
  try {
    const response = await axios.post(
      `${backendUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Hello, please respond with "Connection successful!"'
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      console.log('✅ Connection successful!');
      console.log('Response:', response.data.choices[0].message.content);
    } else {
      console.log('❌ Unexpected response format');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.log('❌ Connection failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testConnection();