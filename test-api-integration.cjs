// Simple test script to verify API integration
const https = require('https');

// Test the new company API endpoint
const url = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com';

console.log('Testing Company API Integration...');
console.log(`URL: ${url}`);

const req = https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Response Data:');
      console.log(JSON.stringify(jsonData, null, 2));
      console.log('✅ API Integration Test Completed Successfully');
    } catch (error) {
      console.log('Response Data (raw):');
      console.log(data);
      console.log('⚠️ Response is not valid JSON');
      console.log('✅ API endpoint is accessible but may need data processing');
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Error: ${error.message}`);
  console.log('Failed to connect to the API endpoint');
});

req.end();