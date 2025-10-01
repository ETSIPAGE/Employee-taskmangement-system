// Test script to verify role API endpoints construction
const { apiService } = require('./services/apiService.ts');

// Mock the fetch function to capture calls
const originalFetch = global.fetch;
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify({ success: true }))
}));

// Test the updateRole endpoint construction
async function testUpdateRoleEndpoint() {
  console.log('Testing updateRole endpoint construction...');
  
  try {
    // Test with a role ID
    const testPayload = {
      id: 'test-role-123',
      name: 'Updated Role Name'
    };
    
    await apiService.updateRole(testPayload);
    
    // Check what endpoint was called
    const calledEndpoint = global.fetch.mock.calls[0][0];
    console.log('Called endpoint:', calledEndpoint);
    
    // Expected endpoint should be: https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles/test-role-123
    const expectedBase = 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles/';
    if (calledEndpoint.startsWith(expectedBase)) {
      console.log('✅ Endpoint construction is correct!');
    } else {
      console.log('❌ Endpoint construction is incorrect');
      console.log('Expected to start with:', expectedBase);
    }
    
    // Test without a role ID (should use base endpoint)
    const testPayloadNoId = {
      name: 'New Role Name'
    };
    
    await apiService.updateRole(testPayloadNoId);
    
    // Check what endpoint was called
    const calledEndpointNoId = global.fetch.mock.calls[1][0];
    console.log('Called endpoint (no ID):', calledEndpointNoId);
    
    // Expected endpoint should be: https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles
    const expectedBaseNoId = 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles';
    if (calledEndpointNoId === expectedBaseNoId) {
      console.log('✅ Endpoint construction without ID is correct!');
    } else {
      console.log('❌ Endpoint construction without ID is incorrect');
      console.log('Expected:', expectedBaseNoId);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }
}

// Run the test
testUpdateRoleEndpoint();