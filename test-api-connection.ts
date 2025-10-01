import { apiService } from './services/apiService';

async function testAPIConnection() {
  console.log('🧪 Testing API connection...');
  
  // Test role API
  try {
    console.log('🔍 Testing Role API...');
    const roleResult = await apiService.testRoleAPI();
    console.log('Role API Test Result:', roleResult);
    
    if (roleResult.success) {
      console.log('✅ Role API connected successfully!');
    } else {
      console.log('❌ Role API connection failed:', roleResult.error);
    }
  } catch (error) {
    console.error('💥 Error testing Role API:', error);
  }
  
  // Test CORS
  try {
    console.log('🔍 Testing CORS configuration...');
    const corsResult = await apiService.testCORS();
    console.log('CORS Test Result:', corsResult);
  } catch (error) {
    console.error('💥 Error testing CORS:', error);
  }
  
  // Test get roles
  try {
    console.log('🔍 Testing getRoles...');
    const rolesResult = await apiService.getRoles();
    console.log('Get Roles Result:', rolesResult);
  } catch (error) {
    console.error('💥 Error getting roles:', error);
  }
}

// Run the test
testAPIConnection();