// Test script to verify the new endpoint configuration
const fs = require('fs');

console.log('🔍 Testing New Endpoint Configuration');
console.log('====================================');

// Test 1: Check if the main API service has the new endpoint
console.log('\n1. Checking main API service endpoint configuration...');
const apiServiceTs = fs.readFileSync('./services/apiService.ts', 'utf8');

const newEndpoint = 'https://jf5dlppx9c.execute-api.ap-south-1.amazonaws.com/prod';
const endpointRegex = /create:\s*'([^']+)'/;
const match = apiServiceTs.match(endpointRegex);

if (match && match[1].includes(newEndpoint)) {
  console.log('✅ Main API service has the new endpoint configured correctly');
  console.log('   Endpoint:', match[1]);
} else {
  console.log('❌ Main API service does not have the new endpoint configured correctly');
  console.log('   Expected to contain:', newEndpoint);
}

// Test 2: Check if the browser API service has the new endpoint
console.log('\n2. Checking browser API service endpoint configuration...');
const apiServiceBrowserJs = fs.readFileSync('./services/apiService.browser.js', 'utf8');

const browserMatch = apiServiceBrowserJs.match(endpointRegex);

if (browserMatch && browserMatch[1].includes(newEndpoint)) {
  console.log('✅ Browser API service has the new endpoint configured correctly');
  console.log('   Endpoint:', browserMatch[1]);
} else {
  console.log('❌ Browser API service does not have the new endpoint configured correctly');
  console.log('   Expected to contain:', newEndpoint);
}

// Test 3: Verify all role endpoints are using the new base URL
console.log('\n3. Verifying all role endpoints use the new base URL...');

const roleEndpoints = ['create', 'get', 'edit', 'delete'];
let allEndpointsCorrect = true;

for (const endpoint of roleEndpoints) {
  const regex = new RegExp(`${endpoint}:\\s*'([^']+)`);
  const tsMatch = apiServiceTs.match(regex);
  const browserMatch = apiServiceBrowserJs.match(regex);
  
  if (tsMatch && tsMatch[1].includes(newEndpoint)) {
    console.log(`✅ Main API service ${endpoint} endpoint is correct`);
  } else {
    console.log(`❌ Main API service ${endpoint} endpoint is incorrect`);
    allEndpointsCorrect = false;
  }
  
  if (browserMatch && browserMatch[1].includes(newEndpoint)) {
    console.log(`✅ Browser API service ${endpoint} endpoint is correct`);
  } else {
    console.log(`❌ Browser API service ${endpoint} endpoint is incorrect`);
    allEndpointsCorrect = false;
  }
}

if (allEndpointsCorrect) {
  console.log('\n✅ All role endpoints are correctly configured with the new base URL');
} else {
  console.log('\n❌ Some role endpoints are not correctly configured');
}

console.log('\n✅ New Endpoint Configuration Test Completed');