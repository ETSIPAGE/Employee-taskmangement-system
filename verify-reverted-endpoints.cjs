// Test script to verify that the endpoints have been reverted to their original configuration
const fs = require('fs');

console.log('🔍 Verifying Reverted Endpoint Configuration');
console.log('==========================================');

// Test 1: Check if the main API service has the original endpoints
console.log('\n1. Checking main API service endpoint configuration...');
const apiServiceTs = fs.readFileSync('./services/apiService.ts', 'utf8');

const originalEndpoints = {
  create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
  get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
  edit: 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles',
  delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
};

let allMainEndpointsCorrect = true;

for (const [key, value] of Object.entries(originalEndpoints)) {
  const regex = new RegExp(`${key}:\\s*'([^']+)`);
  const match = apiServiceTs.match(regex);
  
  if (match && match[1] === value) {
    console.log(`✅ Main API service ${key} endpoint is correct`);
  } else {
    console.log(`❌ Main API service ${key} endpoint is incorrect`);
    console.log(`   Expected: ${value}`);
    console.log(`   Found: ${match ? match[1] : 'Not found'}`);
    allMainEndpointsCorrect = false;
  }
}

// Test 2: Check if the browser API service has the original endpoints
console.log('\n2. Checking browser API service endpoint configuration...');
const apiServiceBrowserJs = fs.readFileSync('./services/apiService.browser.js', 'utf8');

const browserEndpoints = {
  create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
  get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
  edit: 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod',
  delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
};

let allBrowserEndpointsCorrect = true;

for (const [key, value] of Object.entries(browserEndpoints)) {
  const regex = new RegExp(`${key}:\\s*'([^']+)`);
  const match = apiServiceBrowserJs.match(regex);
  
  if (match && match[1] === value) {
    console.log(`✅ Browser API service ${key} endpoint is correct`);
  } else {
    console.log(`❌ Browser API service ${key} endpoint is incorrect`);
    console.log(`   Expected: ${value}`);
    console.log(`   Found: ${match ? match[1] : 'Not found'}`);
    allBrowserEndpointsCorrect = false;
  }
}

// Test 3: Check if the updateRole method has been reverted in both versions
console.log('\n3. Checking updateRole method configuration...');

// Check TypeScript version
const tsUpdateRoleOldPattern = /endpoint = payload\.id\s*\?\s*`\$\{this\.roleEndpoints\.edit\}\/\$\{encodeURIComponent\(payload\.id\)\}`\s*:\s*this\.roleEndpoints\.edit;/;
const tsUpdateRoleNewPattern = /const fullPayload = \{ \.\.\.payload, updatedAt: new Date\(\)\.toISOString\(\) \};/;

if (apiServiceTs.match(tsUpdateRoleOldPattern) && apiServiceTs.match(tsUpdateRoleNewPattern)) {
  console.log('✅ Main API service updateRole method has been reverted');
} else {
  console.log('❌ Main API service updateRole method has not been reverted correctly');
}

// Check browser version
const browserUpdateRoleOldPattern = /endpoint = payload\.id\s*\?\s*`\$\{this\.roleEndpoints\.edit\}\/Edit-Roles\/\$\{encodeURIComponent\(payload\.id\)\}`\s*:\s*`\$\{this\.roleEndpoints\.edit\}\/Edit-Roles`;/;
const browserUpdateRoleNewPattern = /const fullPayload = \{/;

if (apiServiceBrowserJs.match(browserUpdateRoleOldPattern) && apiServiceBrowserJs.match(browserUpdateRoleNewPattern)) {
  console.log('✅ Browser API service updateRole method has been reverted');
} else {
  console.log('❌ Browser API service updateRole method has not been reverted correctly');
}

if (allMainEndpointsCorrect && allBrowserEndpointsCorrect) {
  console.log('\n✅ All endpoints have been successfully reverted to their original configuration');
} else {
  console.log('\n❌ Some endpoints were not reverted correctly');
}

console.log('\n✅ Reverted Endpoint Verification Test Completed');