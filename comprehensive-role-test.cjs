// Comprehensive test for role API functionality
const https = require('https');

console.log('=== Comprehensive Role API Test ===\n');

// Test 1: Check if base Edit-Roles endpoint is accessible
console.log('Test 1: Checking base Edit-Roles endpoint accessibility...');
const baseUrl = 'https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles';

const getReq = https.get(baseUrl, (res) => {
  console.log(`  GET ${baseUrl} - Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log(`  Response: ${JSON.stringify(jsonData)}`);
    } catch (error) {
      console.log(`  Response (raw): ${data}`);
    }
    
    // Test 2: Try a PUT request to the base endpoint
    console.log('\nTest 2: Testing PUT request to base endpoint...');
    testPutRequest(baseUrl, null);
  });
});

getReq.on('error', (error) => {
  console.log(`  GET Error: ${error.message}`);
  
  // Even if GET fails, still test PUT
  console.log('\nTest 2: Testing PUT request to base endpoint...');
  testPutRequest(baseUrl, null);
});

getReq.end();

function testPutRequest(url, roleId) {
  const fullUrl = roleId ? `${url}/${roleId}` : url;
  console.log(`  PUT ${fullUrl}`);
  
  const payload = {
    id: roleId || 'test-id',
    name: 'Test Role',
    description: 'Test role for API integration',
    permissions: ['read', 'write'],
    color: 'indigo',
    bgColor: 'bg-indigo-500',
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
    console.log(`  PUT Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log(`  PUT Response: ${JSON.stringify(jsonData)}`);
      } catch (error) {
        console.log(`  PUT Response (raw): ${data}`);
      }
      
      console.log('\n=== Test Completed ===');
    });
  });
  
  req.on('error', (error) => {
    console.log(`  PUT Error: ${error.message}`);
    console.log('\n=== Test Completed ===');
  });
  
  req.write(postData);
  req.end();
}