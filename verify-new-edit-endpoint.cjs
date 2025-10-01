// Test script to verify the new Edit-Roles endpoint configuration
const fs = require('fs');

console.log('🔍 Testing New Edit-Roles Endpoint Configuration');
console.log('==============================================');

// Test 1: Check if the main API service has the new edit endpoint
console.log('\n1. Checking main API service edit endpoint configuration...');
const apiServiceTs = fs.readFileSync('./services/apiService.ts', 'utf8');

const newEditEndpoint = 'https://jf5dlppx9c.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles';
const editEndpointRegex = /edit:\s*'([^']+)'/;
const tsMatch = apiServiceTs.match(editEndpointRegex);

if (tsMatch && tsMatch[1] === newEditEndpoint) {
  console.log('✅ Main API service has the new edit endpoint configured correctly');
  console.log('   Endpoint:', tsMatch[1]);
} else {
  console.log('❌ Main API service does not have the new edit endpoint configured correctly');
  console.log('   Expected:', newEditEndpoint);
  console.log('   Found:', tsMatch ? tsMatch[1] : 'Not found');
}

// Test 2: Check if the browser API service has the new edit endpoint
console.log('\n2. Checking browser API service edit endpoint configuration...');
const apiServiceBrowserJs = fs.readFileSync('./services/apiService.browser.js', 'utf8');

const browserMatch = apiServiceBrowserJs.match(editEndpointRegex);

if (browserMatch && browserMatch[1] === newEditEndpoint) {
  console.log('✅ Browser API service has the new edit endpoint configured correctly');
  console.log('   Endpoint:', browserMatch[1]);
} else {
  console.log('❌ Browser API service does not have the new edit endpoint configured correctly');
  console.log('   Expected:', newEditEndpoint);
  console.log('   Found:', browserMatch ? browserMatch[1] : 'Not found');
}

// Test 3: Verify endpoint construction in updateRole methods
console.log('\n3. Verifying endpoint construction in updateRole methods...');

// Check TypeScript version
const tsEndpointConstruction = /endpoint = payload\.id\s*\?\s*`\$\{this\.roleEndpoints\.edit\}\/\$\{encodeURIComponent\(payload\.id\)\}`\s*:\s*this\.roleEndpoints\.edit;/;
if (apiServiceTs.match(tsEndpointConstruction)) {
  console.log('✅ Main API service updateRole method has correct endpoint construction');
} else {
  console.log('❌ Main API service updateRole method has incorrect endpoint construction');
}

// Check browser version
const browserEndpointConstruction = /endpoint = payload\.id\s*\?\s*`\$\{this\.roleEndpoints\.edit\}\/\$\{encodeURIComponent\(payload\.id\)\}`\s*:\s*this\.roleEndpoints\.edit;/;
if (apiServiceBrowserJs.match(browserEndpointConstruction)) {
  console.log('✅ Browser API service updateRole method has correct endpoint construction');
} else {
  console.log('❌ Browser API service updateRole method has incorrect endpoint construction');
}

if (tsMatch && tsMatch[1] === newEditEndpoint && 
    browserMatch && browserMatch[1] === newEditEndpoint &&
    apiServiceTs.match(tsEndpointConstruction) &&
    apiServiceBrowserJs.match(browserEndpointConstruction)) {
  console.log('\n✅ New Edit-Roles endpoint is correctly configured in both API service versions');
} else {
  console.log('\n❌ New Edit-Roles endpoint configuration has issues');
}

console.log('\n✅ New Edit-Roles Endpoint Configuration Test Completed');