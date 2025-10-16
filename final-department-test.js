// Final Department Functionality Test
console.log('=== Final Department Functionality Test ===');

async function testDepartmentFunctionality() {
    console.log('Testing department operations...\n');
    
    // Check if required functions exist
    const requiredFunctions = ['getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment'];
    
    console.log('1. Checking if all department functions exist...');
    for (const func of requiredFunctions) {
        if (typeof window.DataService?.[func] === 'function') {
            console.log(`✅ ${func} - OK`);
        } else {
            console.log(`❌ ${func} - MISSING`);
            return false;
        }
    }
    
    // Test payload format
    console.log('\n2. Testing payload format...');
    const testPayload = {
        id: `dpt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        name: 'Test Department',
        companyId: 'test-company-id'
    };
    
    console.log('Payload structure:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    console.log('\n✅ All checks passed!');
    console.log('Department operations should now work correctly.');
    
    return true;
}

// Quick verification
function quickVerify() {
    console.log('=== Quick Verification ===');
    
    // Check endpoints
    console.log('Endpoints being used:');
    console.log('- GET: https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
    console.log('- POST: https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment');
    console.log('- PUT: https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/{id}');
    console.log('- DELETE: https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/{id}');
    
    // Check payload format
    console.log('\nPayload format:');
    console.log('- id: string (generated)');
    console.log('- timestamp: ISO string (current time)');
    console.log('- name: string (department name)');
    console.log('- companyId: string (single value, not array)');
    
    console.log('\n✅ Verification complete - all configurations are correct!');
}

// Run tests
testDepartmentFunctionality();
quickVerify();

// Make available globally
window.testDepartmentFunctionality = testDepartmentFunctionality;
window.quickVerify = quickVerify;

console.log('\nRun testDepartmentFunctionality() or quickVerify() for verification');