// Test CORS configuration in API service
const fs = require('fs');

console.log('🔍 Testing CORS Configuration in API Service');
console.log('==========================================');

// Test 1: Check if the main API service has CORS configured
console.log('\n1. Checking main API service CORS configuration...');
const apiServiceTs = fs.readFileSync('./services/apiService.ts', 'utf8');

// Check for mode: 'cors' in withStdHeaders method
const corsInWithStdHeaders = apiServiceTs.includes("mode: 'cors'");
if (corsInWithStdHeaders) {
  console.log('✅ Main API service has CORS configured in withStdHeaders method');
} else {
  console.log('❌ Main API service missing CORS configuration');
}

// Check for mode: 'cors' in getCompanies method
const corsInGetCompanies = apiServiceTs.includes("mode: 'cors',") && apiServiceTs.includes('getCompanies():');
if (corsInGetCompanies) {
  console.log('✅ Main API service has CORS configured in getCompanies method');
} else {
  console.log('❌ Main API service missing CORS configuration in getCompanies method');
}

// Test 2: Check if the browser API service has CORS configured
console.log('\n2. Checking browser API service CORS configuration...');
const apiServiceBrowserJs = fs.readFileSync('./services/apiService.browser.js', 'utf8');

// Check for mode: 'cors' in updateRole method
const corsInBrowserUpdateRole = apiServiceBrowserJs.includes("mode: 'cors'") && apiServiceBrowserJs.includes('updateRole(');
if (corsInBrowserUpdateRole) {
  console.log('✅ Browser API service has CORS configured in updateRole method');
} else {
  console.log('❌ Browser API service missing CORS configuration in updateRole method');
}

// Check for proper endpoint configuration
console.log('\n3. Checking endpoint configurations...');
const editEndpointRegex = /edit:\s*'([^']+)'/g;
const tsMatches = [...apiServiceTs.matchAll(editEndpointRegex)];
const browserMatches = [...apiServiceBrowserJs.matchAll(editEndpointRegex)];

if (tsMatches.length > 0 && tsMatches[0][1].includes('/Edit-Roles')) {
  console.log('✅ Main API service has correct edit endpoint configuration:', tsMatches[0][1]);
} else {
  console.log('❌ Main API service has incorrect edit endpoint configuration');
}

if (browserMatches.length > 0 && browserMatches[0][1].includes('/Edit-Roles')) {
  console.log('✅ Browser API service has correct edit endpoint configuration:', browserMatches[0][1]);
} else {
  console.log('❌ Browser API service has incorrect edit endpoint configuration');
}

// Test 3: Check for proper error handling of CORS errors
console.log('\n4. Checking CORS error handling...');
const corsErrorHandling = apiServiceBrowserJs.includes('CORS policy error');
if (corsErrorHandling) {
  console.log('✅ Browser API service has CORS error handling');
} else {
  console.log('❌ Browser API service missing CORS error handling');
}

console.log('\n✅ CORS Configuration Test Completed');