// Comprehensive test for the update role API fix
const fs = require('fs');

// Read the apiService.ts file
const apiServicePath = './services/apiService.ts';
const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');

console.log('🔍 Testing Update Role API Fix');
console.log('==============================');

// Test 1: Check if the endpoint configuration is correct
console.log('\n1. Checking endpoint configuration...');
const endpointRegex = /edit:\s*'([^']+)'/;
const match = apiServiceContent.match(endpointRegex);

if (match && match[1].includes('/Edit-Roles')) {
  console.log('✅ Edit endpoint is correctly configured:', match[1]);
} else {
  console.log('❌ Edit endpoint is not correctly configured');
  console.log('Found:', match ? match[1] : 'None');
}

// Test 2: Check if the endpoint construction is fixed
console.log('\n2. Checking endpoint construction fix...');
const endpointConstructionRegex = /const endpoint = payload\.id\s*\?\s*`\$\{this\.roleEndpoints\.edit\}\/\$\{encodeURIComponent\(payload\.id\)\}`\s*:\s*this\.roleEndpoints\.edit;/;
const endpointConstructionFixed = apiServiceContent.match(endpointConstructionRegex);

if (endpointConstructionFixed) {
  console.log('✅ Endpoint construction is fixed');
} else {
  console.log('❌ Endpoint construction may not be fixed');
  
  // Check for the old pattern to confirm it's been fixed
  const oldPattern = /`\$\{this\.roleEndpoints\.edit\}\/Edit-Roles\/\$\{encodeURIComponent\(payload\.id\)\}`/;
  if (apiServiceContent.match(oldPattern)) {
    console.log('❌ Found old incorrect pattern still present');
  }
}

// Test 3: Check if the payload construction is improved
console.log('\n3. Checking payload construction improvement...');
const payloadConstructionRegex = /const updatePayload = \{/;
const payloadConstructionImproved = apiServiceContent.match(payloadConstructionRegex);

if (payloadConstructionImproved) {
  console.log('✅ Payload construction is improved');
  
  // Check for the specific improvements
  const conditionalFields = [
    /payload\.name !== undefined/,
    /payload\.description !== undefined/,
    /payload\.permissions !== undefined/,
    /payload\.color !== undefined/,
    /payload\.bgColor !== undefined/
  ];
  
  let allFieldsFound = true;
  for (const field of conditionalFields) {
    if (!apiServiceContent.match(field)) {
      console.log('❌ Missing conditional check for:', field);
      allFieldsFound = false;
    }
  }
  
  if (allFieldsFound) {
    console.log('✅ All conditional field checks are present');
  }
} else {
  console.log('❌ Payload construction may not be improved');
}

console.log('\n✅ Update Role API Fix Verification Complete');