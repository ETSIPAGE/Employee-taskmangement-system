// Comprehensive verification script for authentication flow and endpoint configuration
const fs = require('fs');

console.log('🔍 Verifying Authentication Flow and Endpoint Configuration...\n');

// Test 1: Check API Service Endpoint Configuration
console.log('🧪 Test 1: API Service Endpoint Configuration');
try {
  const apiServiceTs = fs.readFileSync('./Employee-taskmangement-system/services/apiService.ts', 'utf8');
  const apiServiceBrowser = fs.readFileSync('./Employee-taskmangement-system/services/apiService.browser.js', 'utf8');
  
  const endpointsTs = {
    create: apiServiceTs.match(/create:\s*'([^']+)'/)?.[1],
    get: apiServiceTs.match(/get:\s*'([^']+)'/)?.[1],
    edit: apiServiceTs.match(/edit:\s*'([^']+)'/)?.[1],
    delete: apiServiceTs.match(/delete:\s*'([^']+)'/)?.[1]
  };
  
  const endpointsBrowser = {
    create: apiServiceBrowser.match(/create:\s*'([^']+)'/)?.[1],
    get: apiServiceBrowser.match(/get:\s*'([^']+)'/)?.[1],
    edit: apiServiceBrowser.match(/edit:\s*'([^']+)'/)?.[1],
    delete: apiServiceBrowser.match(/delete:\s*'([^']+)'/)?.[1]
  };
  
  console.log('TypeScript Endpoints:', endpointsTs);
  console.log('Browser Endpoints:', endpointsBrowser);
  
  // Verify consistency between versions
  const isConsistent = JSON.stringify(endpointsTs) === JSON.stringify(endpointsBrowser);
  console.log('✅ Endpoint consistency between versions:', isConsistent ? 'PASS' : 'FAIL');
  
  // Verify expected endpoints
  const expectedEndpoints = {
    create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
    get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
    edit: 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod',
    delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
  };
  
  const tsMatches = JSON.stringify(endpointsTs) === JSON.stringify(expectedEndpoints);
  const browserMatches = JSON.stringify(endpointsBrowser) === JSON.stringify(expectedEndpoints);
  
  console.log('✅ TypeScript endpoints match expected:', tsMatches ? 'PASS' : 'FAIL');
  console.log('✅ Browser endpoints match expected:', browserMatches ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.log('❌ Error reading API service files:', error.message);
}

// Test 2: Check Update Role Method Endpoint Construction
console.log('\n🧪 Test 2: Update Role Method Endpoint Construction');
try {
  const apiServiceTs = fs.readFileSync('./Employee-taskmangement-system/services/apiService.ts', 'utf8');
  const apiServiceBrowser = fs.readFileSync('./Employee-taskmangement-system/services/apiService.browser.js', 'utf8');
  
  // Check TypeScript version
  const tsEndpointConstruction = apiServiceTs.includes('`${this.roleEndpoints.edit}/${encodeURIComponent(payload.id)}`');
  console.log('✅ TypeScript endpoint construction:', tsEndpointConstruction ? 'PASS' : 'FAIL');
  
  // Check Browser version
  const browserPathConstruction = apiServiceBrowser.includes('`/${encodeURIComponent(payload.id)}`');
  console.log('✅ Browser path construction:', browserPathConstruction ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.log('❌ Error checking endpoint construction:', error.message);
}

// Test 3: Check Authentication Configuration
console.log('\n🧪 Test 3: Authentication Configuration');
try {
  const apiServiceTs = fs.readFileSync('./Employee-taskmangement-system/services/apiService.ts', 'utf8');
  const apiServiceBrowser = fs.readFileSync('./Employee-taskmangement-system/services/apiService.browser.js', 'utf8');
  
  // Check TypeScript version
  const tsAuthHeaders = apiServiceTs.includes('x-api-key') && apiServiceTs.includes('Authorization');
  console.log('✅ TypeScript authentication headers:', tsAuthHeaders ? 'PASS' : 'FAIL');
  
  // Check Browser version
  const browserAuthHeaders = apiServiceBrowser.includes('x-api-key') && apiServiceBrowser.includes('Authorization');
  console.log('✅ Browser authentication headers:', browserAuthHeaders ? 'PASS' : 'FAIL');
  
  // Check configureRoleAPIAuth method
  const tsAuthMethod = apiServiceTs.includes('configureRoleAPIAuth');
  const browserAuthMethod = apiServiceBrowser.includes('configureRoleAPIAuth');
  console.log('✅ TypeScript auth method:', tsAuthMethod ? 'PASS' : 'FAIL');
  console.log('✅ Browser auth method:', browserAuthMethod ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.log('❌ Error checking authentication configuration:', error.message);
}

// Test 4: Check Error Messages
console.log('\n🧪 Test 4: Error Message Consistency');
try {
  const filesToCheck = [
    './Employee-taskmangement-system/services/apiService.ts',
    './Employee-taskmangement-system/services/apiService.browser.js'
  ];
  
  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    const hasErrorMessage = content.includes('Role ID is required for update operation');
    console.log(`✅ ${file} error message:`, hasErrorMessage ? 'PASS' : 'FAIL');
  }
  
} catch (error) {
  console.log('❌ Error checking error messages:', error.message);
}

// Test 5: Check Documentation Consistency
console.log('\n🧪 Test 5: Documentation Consistency');
try {
  const docFiles = [
    './Employee-taskmangement-system/README-API-SETUP.md',
    './Employee-taskmangement-system/components/dashboard/RolesDashboard.tsx',
    './Employee-taskmangement-system/test-role-api.html'
  ];
  
  // Check that documentation references the correct endpoint
  const correctEndpoint = 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod';
  const incorrectEndpoint = 'https://vkfwz6fl9c.execute-api.ap-south-1.amazonaws.com/prod/ETS-CreatE-Roles';
  
  for (const file of docFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const hasCorrectEndpoint = content.includes(correctEndpoint);
    const hasIncorrectEndpoint = content.includes(incorrectEndpoint);
    
    console.log(`✅ ${file} correct endpoint reference:`, hasCorrectEndpoint && !hasIncorrectEndpoint ? 'PASS' : 'FAIL');
  }
  
} catch (error) {
  console.log('❌ Error checking documentation:', error.message);
}

console.log('\n✅ Verification complete. Check results above.');
console.log('\n📝 Note: This script verifies static code analysis. For runtime verification,');
console.log('   open the application in a browser and check the console output during role updates.');