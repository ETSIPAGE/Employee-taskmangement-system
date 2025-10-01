// Test script to verify Roles API integration
console.log('🧪 Starting Roles API Integration Test...');

// Test the API service functions
async function testRolesAPIIntegration() {
    try {
        console.log('🔄 Importing API service...');
        
        // Dynamically import the API service
        const { apiService } = await import('./services/apiService');
        
        if (!apiService) {
            console.error('❌ Failed to import API service');
            return;
        }
        
        console.log('✅ API service imported successfully');
        
        // Test 1: Check if role endpoints are configured
        console.log('\n🔍 Test 1: Checking role API endpoints configuration');
        if (apiService.roleEndpoints && apiService.roleEndpoints.length > 0) {
            console.log('✅ Role endpoints configured:', apiService.roleEndpoints);
        } else {
            console.error('❌ No role endpoints configured');
            return;
        }
        
        // Test 2: Test role API connectivity
        console.log('\n🔌 Test 2: Testing role API connectivity');
        try {
            const testResult = await apiService.testRoleAPI();
            console.log('📡 Role API test result:', testResult);
            
            if (testResult.success) {
                console.log('✅ Role API connectivity test PASSED');
            } else {
                console.warn('⚠️ Role API connectivity test FAILED:', testResult.error);
            }
        } catch (error) {
            console.error('❌ Error during role API connectivity test:', error.message);
        }
        
        // Test 3: Test authentication configuration
        console.log('\n🔐 Test 3: Testing authentication configuration');
        const savedApiKey = localStorage.getItem('role_api_key');
        const savedBearerToken = localStorage.getItem('role_bearer_token');
        
        if (savedApiKey || savedBearerToken) {
            console.log('✅ Authentication credentials found');
            apiService.configureRoleAPIAuth(
                savedApiKey || undefined,
                savedBearerToken || undefined
            );
        } else {
            console.log('⚠️ No authentication credentials found - using no authentication');
        }
        
        // Test 4: Test get roles
        console.log('\n🔍 Test 4: Testing get roles functionality');
        try {
            const rolesResult = await apiService.getRoles();
            console.log('📥 Get roles result:', rolesResult);
            
            if (rolesResult.success) {
                console.log('✅ Get roles test PASSED');
                console.log(`   Found ${rolesResult.data?.length || 0} roles`);
            } else {
                console.warn('⚠️ Get roles test result indicates failure:', rolesResult.error);
            }
        } catch (error) {
            console.error('❌ Error during get roles test:', error.message);
        }
        
        // Test 5: Test create role (if API is connected)
        console.log('\n➕ Test 5: Testing create role functionality');
        try {
            // Create a test role
            const testRole = {
                name: `Test Role ${Date.now()}`,
                description: 'Test role created via integration test',
                permissions: ['view_dashboard', 'manage_users'],
                color: 'indigo',
                bgColor: 'bg-indigo-500',
                createdBy: 'integration-test'
            };
            
            const createResult = await apiService.createRole(testRole);
            console.log('📤 Create role result:', createResult);
            
            if (createResult.success) {
                console.log('✅ Create role test PASSED');
                // Store the created role ID for later tests
                if (createResult.data?.id) {
                    localStorage.setItem('testRoleId', createResult.data.id);
                    console.log('   Created role ID stored for update/delete tests');
                }
            } else {
                console.warn('⚠️ Create role test result indicates failure:', createResult.error);
            }
        } catch (error) {
            console.error('❌ Error during create role test:', error.message);
        }
        
        // Test 6: Test update role (if we have a created role)
        console.log('\n✏️ Test 6: Testing update role functionality');
        const testRoleId = localStorage.getItem('testRoleId');
        if (testRoleId) {
            try {
                const updatePayload = {
                    id: testRoleId,
                    name: `Updated Test Role ${Date.now()}`,
                    description: 'Test role updated via integration test'
                };
                
                const updateResult = await apiService.updateRole(updatePayload);
                console.log('🔄 Update role result:', updateResult);
                
                if (updateResult.success) {
                    console.log('✅ Update role test PASSED');
                } else {
                    console.warn('⚠️ Update role test result indicates failure:', updateResult.error);
                }
            } catch (error) {
                console.error('❌ Error during update role test:', error.message);
            }
        } else {
            console.log('⏭️  Skipping update role test (no test role ID available)');
        }
        
        // Test 7: Test delete role (if we have a created role)
        console.log('\n🗑️ Test 7: Testing delete role functionality');
        if (testRoleId) {
            try {
                const deleteResult = await apiService.deleteRole(testRoleId);
                console.log('🗑️ Delete role result:', deleteResult);
                
                if (deleteResult.success) {
                    console.log('✅ Delete role test PASSED');
                    // Clean up the stored test role ID
                    localStorage.removeItem('testRoleId');
                } else {
                    console.warn('⚠️ Delete role test result indicates failure:', deleteResult.error);
                }
            } catch (error) {
                console.error('❌ Error during delete role test:', error.message);
            }
        } else {
            console.log('⏭️  Skipping delete role test (no test role ID available)');
        }
        
        console.log('\n🏁 Roles API Integration Test Completed');
        
    } catch (error) {
        console.error('💥 Critical error during API integration test:', error);
    }
}

// Run the test
testRolesAPIIntegration();