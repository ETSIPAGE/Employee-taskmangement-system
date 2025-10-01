// Debug script to identify and fix API connection issues
console.log('🔍 Starting API Connection Debug...\n');

// Test if we can import the browser version of the API service
import('./services/apiService.browser.js')
  .then(async ({ apiService }) => {
    console.log('✅ Successfully imported API service\n');
    
    // Test 1: Check current API endpoints
    console.log('📋 Current Role API Endpoints:');
    console.log(apiService.roleEndpoints);
    console.log('');
    
    // Test 2: Check authentication status
    console.log('🔐 Current Authentication Status:');
    console.log('API Key:', apiService.apiAuth.apiKey ? 'SET' : 'NOT SET');
    console.log('Bearer Token:', apiService.apiAuth.bearerToken ? 'SET' : 'NOT SET');
    console.log('');
    
    // Test 3: Try to load saved credentials
    console.log('💾 Checking for saved credentials...');
    const savedApiKey = localStorage.getItem('role_api_key');
    const savedBearerToken = localStorage.getItem('role_bearer_token');
    
    if (savedApiKey || savedBearerToken) {
      console.log('🔑 Found saved credentials, configuring API service...');
      apiService.configureRoleAPIAuth(savedApiKey || undefined, savedBearerToken || undefined);
    } else {
      console.log('⚠️ No saved credentials found');
    }
    console.log('');
    
    // Test 4: Test Role API connectivity
    console.log('🔍 Testing Role API connectivity...');
    try {
      const result = await apiService.testRoleAPI();
      console.log('✅ Role API Test Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n🎉 API Connection Successful!');
        console.log('💡 The Role API is properly configured and accessible.');
      } else {
        console.log('\n❌ API Connection Failed!');
        console.log('🔧 Troubleshooting steps:');
        console.log('   1. If you received a 403 error, you need to configure authentication');
        console.log('   2. If you received a CORS error, the API server needs CORS configuration');
        console.log('   3. If you received a timeout, check network connectivity');
        
        if (result.error && result.error.includes('403')) {
          console.log('\n🔐 AUTHENTICATION REQUIRED:');
          console.log('   You need to provide either an API Key or Bearer Token');
          console.log('   Open configure-api-auth.html in your browser to set up credentials');
        }
      }
    } catch (error) {
      console.log('💥 Error testing Role API:', error.message);
      console.log('\n🔧 Troubleshooting steps:');
      console.log('   1. Ensure you are running this in a browser environment');
      console.log('   2. Check browser console for detailed error information');
      console.log('   3. Verify network connectivity to the API endpoint');
    }
  })
  .catch(error => {
    console.log('❌ Failed to import API service:', error.message);
    console.log('🔧 Make sure you are running this in a browser environment or with a tool that supports ES modules.');
  });