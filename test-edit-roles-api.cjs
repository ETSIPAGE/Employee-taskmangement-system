// Simple test script to verify Edit Roles API integration
const https = require('https');

// Test the Edit Roles API endpoint (GET request to verify connectivity)
const baseUrl = 'https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles';

console.log('Testing Edit Roles API Integration...');
console.log(`Base URL: ${baseUrl}`);

// First, test connectivity with a GET request (this will likely return 405 if only PUT is supported)
const req = https.get(baseUrl, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Response Data:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('Response Data (raw):');
      console.log(data);
    }
    
    console.log('✅ Edit Roles API Connectivity Test Completed');
  });
});

req.on('error', (error) => {
  console.log(`❌ Error: ${error.message}`);
  console.log('Failed to connect to the Edit Roles API endpoint');
});

req.end();