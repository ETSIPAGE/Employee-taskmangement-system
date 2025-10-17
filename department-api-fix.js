// Comprehensive Department API Fix and Diagnostic Tool
console.log('=== Department API Fix Tool ===');

// 1. First, let's check if the endpoints are correctly configured
const ENDPOINTS = {
    GET: 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/',
    POST: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt',
    PUT: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/',
    DELETE: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/'
};

console.log('Expected endpoints configuration:');
console.table(ENDPOINTS);

// 2. Function to test API endpoints
async function testDepartmentAPI() {
    console.log('\n=== Testing Department API ===');
    
    // Check authentication
    const token = localStorage.getItem('ets_token');
    console.log('Authentication token present:', !!token);
    
    // Test 1: GET departments (should work without auth)
    console.log('\n1. Testing GET departments...');
    try {
        const getResponse = await fetch(ENDPOINTS.GET);
        console.log('GET Status:', getResponse.status);
        console.log('GET OK:', getResponse.ok);
        
        if (getResponse.ok) {
            const data = await getResponse.json();
            console.log('GET Success - Departments count:', Array.isArray(data) ? data.length : 'Not an array');
        } else {
            const errorText = await getResponse.text();
            console.log('GET Error:', errorText);
        }
    } catch (error) {
        console.log('GET Network Error:', error.message);
    }
    
    // Test 2: POST department (requires auth)
    console.log('\n2. Testing POST department...');
    if (!token) {
        console.log('Skipping POST test - no authentication token');
    } else {
        try {
            const testDepartment = {
                name: 'Test Department ' + Date.now(),
                companyId: '9996d1c9-54b6-4b3f-898b-8a3b09d042b4'
            };
            
            const postResponse = await fetch(ENDPOINTS.POST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(testDepartment)
            });
            
            console.log('POST Status:', postResponse.status);
            console.log('POST OK:', postResponse.ok);
            
            if (postResponse.ok) {
                const data = await postResponse.json();
                console.log('POST Success - Created department:', data);
                return data.id || (Array.isArray(data) && data[0]?.id);
            } else {
                const errorText = await postResponse.text();
                console.log('POST Error:', errorText);
                console.log('POST Status Text:', postResponse.statusText);
            }
        } catch (error) {
            console.log('POST Network Error:', error.message);
        }
    }
}

// 3. Function to fix common issues
function fixCommonIssues() {
    console.log('\n=== Fixing Common Issues ===');
    
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
        console.log('✗ localStorage not available');
        return false;
    }
    
    // Check if token exists
    const token = localStorage.getItem('ets_token');
    if (!token) {
        console.log('⚠ No authentication token found - this may cause POST/PUT/DELETE to fail');
        console.log('  Solution: Log in to the application first');
    } else {
        console.log('✓ Authentication token found');
    }
    
    // Check if required functions exist
    const requiredFunctions = ['getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment'];
    let allFunctionsExist = true;
    
    for (const func of requiredFunctions) {
        if (typeof window.DataService?.[func] !== 'function') {
            console.log(`✗ ${func} function missing`);
            allFunctionsExist = false;
        }
    }
    
    if (allFunctionsExist) {
        console.log('✓ All required department functions exist');
    }
    
    return true;
}

// 4. Main fix function
async function fixDepartmentAPI() {
    console.log('=== Running Department API Fix ===');
    
    // Fix common issues
    const issuesFixed = fixCommonIssues();
    
    if (!issuesFixed) {
        console.log('❌ Critical issues found that prevent API operation');
        return;
    }
    
    // Test API endpoints
    await testDepartmentAPI();
    
    console.log('\n=== Fix Process Complete ===');
    console.log('If you encountered errors, check the output above for specific issues');
    console.log('Common solutions:');
    console.log('1. Ensure you are logged in to get an authentication token');
    console.log('2. Check network connectivity');
    console.log('3. Verify the API endpoints are accessible');
}

// Make functions available globally
window.testDepartmentAPI = testDepartmentAPI;
window.fixDepartmentAPI = fixDepartmentAPI;
window.DEPARTMENT_ENDPOINTS = ENDPOINTS;

console.log('\n=== Department API Fix Tool Ready ===');
console.log('Run fixDepartmentAPI() to diagnose and fix issues');
console.log('Run testDepartmentAPI() to test endpoints only');