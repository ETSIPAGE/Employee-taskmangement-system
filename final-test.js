// Final test script to verify all API connections are working
console.log('🚀 Starting API Connection Tests...\n');

// Test if we can import the browser version of the API service
import('./services/apiService.browser.js')
  .then(({ apiService }) => {
    console.log('✅ Successfully imported API service\n');
    
    // Test Role API connectivity
    console.log('🔍 Testing Role API connectivity...');
    apiService.testRoleAPI()
      .then(result => {
        console.log('✅ Role API Test Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          console.log('\n🎉 All tests passed! The Role API is properly configured.');
          console.log('💡 You can now use the RolesDashboard component to manage roles.');
        } else {
          console.log('\n⚠️ Role API test failed.');
          console.log('🔧 Troubleshooting steps:');
          console.log('   1. Check if the API endpoint is correct');
          console.log('   2. If you received a 403 error, configure authentication');
          console.log('   3. Open configure-api-auth.html in your browser to set up credentials');
        }
      })
      .catch(error => {
        console.log('❌ Error testing Role API:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('   1. Ensure you are running this in a browser environment');
        console.log('   2. Check browser console for detailed error information');
        console.log('   3. Verify network connectivity to the API endpoint');
      });
  })
  .catch(error => {
    console.log('❌ Failed to import API service:', error.message);
    console.log('🔧 Make sure you are running this in a browser environment or with a tool that supports ES modules.');
  });