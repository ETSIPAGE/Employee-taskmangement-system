// Debug script to test the updateRole method
const { apiService } = require('./services/apiService.browser.js');

// Configure API authentication (you'll need to provide actual credentials)
// apiService.configureRoleAPIAuth('your-api-key', 'your-bearer-token');

async function debugUpdateRole() {
    console.log('Debugging updateRole method...');
    
    // Sample payload for testing
    const testPayload = {
        id: 'test-role-id',
        name: 'Test Role Updated',
        description: 'Test role description updated',
        permissions: ['read', 'write'],
        color: 'blue',
        bgColor: 'bg-blue-500'
    };
    
    try {
        console.log('Calling updateRole with payload:', testPayload);
        const result = await apiService.updateRole(testPayload);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('Error occurred:', error.message);
        console.log('Error stack:', error.stack);
    }
}

debugUpdateRole();