// Test script to verify the update role API fix
import { apiService } from './services/apiService';

async function testUpdateRole() {
  console.log('Testing update role API fix...');
  
  // Test 1: Try to update a role without ID (should fail with our new error message)
  try {
    console.log('\\nTest 1: Updating role without ID');
    const result1 = await apiService.updateRole({
      name: 'Test Role',
      description: 'Test Description'
    });
    console.log('Result:', result1);
    if (result1.error === 'Role ID is required for update operation') {
      console.log('✅ Test 1 PASSED: Correctly rejected update without ID');
    } else {
      console.log('❌ Test 1 FAILED: Should have rejected update without ID');
    }
  } catch (error) {
    console.log('Error:', error);
  }
  
  // Test 2: Try to update a role with ID (should attempt the API call)
  try {
    console.log('\\nTest 2: Updating role with ID');
    const result2 = await apiService.updateRole({
      id: 'test-role-id',
      name: 'Updated Test Role',
      description: 'Updated Description'
    });
    console.log('Result:', result2);
    // This might fail due to network/auth issues, but shouldn't fail due to our fix
    if (result2.error !== 'Role ID is required for update operation') {
      console.log('✅ Test 2 PASSED: Correctly attempted API call with ID');
    } else {
      console.log('❌ Test 2 FAILED: Should have attempted API call with ID');
    }
  } catch (error) {
    console.log('Error:', error);
  }
  
  console.log('\\nTest completed.');
}

// Run the test
testUpdateRole().catch(console.error);