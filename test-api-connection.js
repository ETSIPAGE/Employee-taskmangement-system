// Simple test script to verify API connections
async function testAPIService() {
  try {
    // Dynamically import the API service
    const { apiService } = await import('./services/apiService.browser.js');
    
    console.log('🧪 Testing API Connections...');
    
    // Test 1: Test Role API
    console.log('\n1. Testing Role API Connection...');
    try {
      const roleResult = await apiService.testRoleAPI();
      console.log('Role API Test Result:', JSON.stringify(roleResult, null, 2));
    } catch (error) {
      console.error('Role API Test Error:', error);
    }
    
    // Test 2: Test getRoles
    console.log('\n2. Testing getRoles...');
    try {
      const rolesResult = await apiService.getRoles();
      console.log('Get Roles Result:', JSON.stringify(rolesResult, null, 2));
    } catch (error) {
      console.error('Get Roles Error:', error);
    }
    
    console.log('\n✅ API Connection Tests Completed');
  } catch (error) {
    console.error('💥 Error importing API service:', error);
  }
}

// Run the tests
testAPIService();