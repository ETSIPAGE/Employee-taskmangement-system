// Test script to debug the updateRole method
const https = require('https');

// Test the Edit Roles API endpoint with a PUT request
const baseUrl = 'https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles';

console.log('Testing Edit Roles API Integration with PUT request...');
console.log(`Base URL: ${baseUrl}`);

// Test with a specific role ID
const roleId = 'test-role-id'; // Replace with an actual role ID
const fullUrl = `${baseUrl}/${roleId}`;
console.log(`Full URL: ${fullUrl}`);

// Sample payload
const payload = {
  id: roleId,
  name: 'Test Role Updated',
  description: 'Test role description updated',
  permissions: ['read', 'write'],
  color: 'blue',
  bgColor: 'bg-blue-500',
  updatedAt: new Date().toISOString()
};

const postData = JSON.stringify(payload);

const options = {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(fullUrl, options, (res) => {
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
    
    console.log('✅ Edit Roles API PUT Request Test Completed');
  });
});

req.on('error', (error) => {
  console.log(`❌ Error: ${error.message}`);
  console.log('Failed to connect to the Edit Roles API endpoint');
});

req.write(postData);
req.end();