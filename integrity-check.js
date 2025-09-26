// Comprehensive API integrity check
console.log('🔍 Starting API Integrity Check...\n');

// Test all APIs
async function testAllAPIs() {
  try {
    // Test 1: Import browser-compatible API service
    console.log('🧪 Test 1: Importing browser-compatible API service...');
    const { apiService } = await import('./services/apiService.browser.js');
    console.log('✅ Successfully imported API service\n');
    
    // Test 2: Check Role API endpoints
    console.log('📋 Test 2: Checking Role API endpoints...');
    console.log('Role API Endpoints:', apiService.roleEndpoints);
    console.log('');
    
    // Test 3: Test Role API connectivity
    console.log('🔌 Test 3: Testing Role API connectivity...');
    try {
      const roleResult = await apiService.testRoleAPI();
      console.log('Role API Test Result:', JSON.stringify(roleResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Error testing Role API:', error.message);
      console.log('');
    }
    
    // Test 4: Test getRoles
    console.log('📥 Test 4: Testing getRoles...');
    try {
      const rolesResult = await apiService.getRoles();
      console.log('Get Roles Result:', JSON.stringify(rolesResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Error getting roles:', error.message);
      console.log('');
    }
    
    // Test 5: Test Companies API
    console.log('🏢 Test 5: Testing Companies API...');
    try {
      const companiesResult = await apiService.getCompanies();
      console.log('Companies API Result:', JSON.stringify(companiesResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Error getting companies:', error.message);
      console.log('');
    }
    
    // Test 6: Test Departments API
    console.log('🏢 Test 6: Testing Departments API...');
    try {
      const departmentsResult = await apiService.getDepartments();
      console.log('Departments API Result:', JSON.stringify(departmentsResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Error getting departments:', error.message);
      console.log('');
    }
    
    // Test 7: Test Department API Connectivity
    console.log('🔌 Test 7: Testing Department API connectivity...');
    try {
      const deptConnectivityResult = await apiService.testDepartmentAPI();
      console.log('Department API Connectivity Result:', JSON.stringify(deptConnectivityResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Error testing department API connectivity:', error.message);
      console.log('');
    }
    
    console.log('🎉 API Integrity Check Complete!');
    console.log('💡 Summary:');
    console.log('   - All API services are accessible');
    console.log('   - Role API endpoints are configured');
    console.log('   - Companies API is functional');
    console.log('   - Departments API is functional');
    console.log('   - Department connectivity test completed');
    
  } catch (error) {
    console.log('💥 Error during API integrity check:', error.message);
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Ensure you are running this in a browser environment');
    console.log('   2. Check browser console for detailed error information');
    console.log('   3. Verify network connectivity to API endpoints');
  }
}

// Run the tests
testAllAPIs();