// Browser Console Role Update Test
// Run this code in your browser's developer console to test role update functionality

console.log('🚀 Starting Role Update Test...');

// Function to test role update
async function testRoleUpdate() {
  try {
    console.log('📥 Importing API service...');
    
    // Dynamically import the API service
    const { apiService } = await import('./services/apiService');
    
    console.log('✅ API service imported successfully');
    
    // Check current API configuration
    console.log('🔧 Current API configuration:');
    console.log('- Create endpoint:', apiService.roleEndpoints.create);
    console.log('- Get endpoint:', apiService.roleEndpoints.get);
    console.log('- Edit endpoint:', apiService.roleEndpoints.edit);
    console.log('- Delete endpoint:', apiService.roleEndpoints.delete);
    
    // Test authentication status
    console.log('🔐 Authentication status:');
    console.log('- API Key:', apiService.apiAuth.apiKey ? 'SET' : 'NOT SET');
    console.log('- Bearer Token:', apiService.apiAuth.bearerToken ? 'SET' : 'NOT SET');
    
    // Create a test role first
    console.log('📝 Creating test role...');
    const createResult = await apiService.createRole({
      name: 'Test Role ' + Date.now(),
      description: 'Temporary test role for debugging',
      permissions: ['view_dashboard'],
      createdBy: 'debug-test'
    });
    
    console.log('Create result:', createResult);
    
    if (createResult.success) {
      const roleId = createResult.data.id;
      console.log('✅ Test role created with ID:', roleId);
      
      // Now try to update the role
      console.log('✏️ Updating test role...');
      const updateResult = await apiService.updateRole({
        id: roleId,
        name: 'Updated Test Role',
        description: 'This role has been updated',
        permissions: ['view_dashboard', 'manage_users'],
        color: 'blue',
        bgColor: 'bg-blue-500'
      });
      
      console.log('Update result:', updateResult);
      
      if (updateResult.success) {
        console.log('✅ Role updated successfully!');
        console.log('📝 Updated role data:', updateResult.data);
      } else {
        console.log('❌ Role update failed');
        console.log('Error:', updateResult.error);
        console.log('Status:', updateResult.status);
        console.log('Endpoint:', updateResult.endpoint);
      }
      
      // Clean up - delete the test role
      console.log('🧹 Cleaning up test role...');
      try {
        const deleteResult = await apiService.deleteRole(roleId);
        console.log('Delete result:', deleteResult);
      } catch (deleteError) {
        console.log('⚠️ Error deleting test role (not critical):', deleteError);
      }
    } else {
      console.log('❌ Failed to create test role');
      console.log('Error:', createResult.error);
      
      // If we can't create a role, let's at least test the update endpoint
      console.log('🔄 Testing update endpoint with dummy data...');
      const updateResult = await apiService.updateRole({
        id: 'test-role-id',
        name: 'Test Update',
        description: 'Test description'
      });
      
      console.log('Dummy update result:', updateResult);
    }
    
  } catch (error) {
    console.error('💥 Error during test:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Function to test API connectivity
async function testApiConnectivity() {
  try {
    console.log('🌐 Testing API connectivity...');
    
    const { apiService } = await import('./services/apiService');
    
    const testResult = await apiService.testRoleAPI();
    console.log('API Test Result:', testResult);
    
    if (testResult.success) {
      console.log('✅ API is accessible');
    } else {
      console.log('❌ API connectivity test failed');
      console.log('Error:', testResult.error);
      console.log('Status:', testResult.status);
    }
  } catch (error) {
    console.error('💥 Error testing API connectivity:', error);
  }
}

// Run the tests
console.log('🧪 Running API connectivity test...');
testApiConnectivity().then(() => {
  console.log('\n🧪 Running role update test...');
  testRoleUpdate().then(() => {
    console.log('\n✅ All tests completed!');
  });
});

console.log('\n📋 To run these tests:');
console.log('1. Open your browser DevTools (F12)');
console.log('2. Go to the Console tab');
console.log('3. Paste this entire code block');
console.log('4. Press Enter to execute');
console.log('5. Check the console output for results');