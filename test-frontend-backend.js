// Comprehensive Frontend-Backend Test
console.log('=== Comprehensive Frontend-Backend Test ===');

async function testFrontendBackend() {
    console.log('Testing frontend-backend synchronization...\n');
    
    // 1. Check authentication
    console.log('1. Authentication Check');
    const token = localStorage.getItem('ets_token');
    if (!token) {
        console.log('❌ NO AUTH TOKEN');
        console.log('   Please log in to the application');
        return;
    }
    console.log('✅ Auth token found');
    
    // 2. Test GET (should work without auth issues)
    console.log('\n2. Testing GET endpoint...');
    try {
        const getResponse = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        console.log('GET Status:', getResponse.status);
        if (getResponse.ok) {
            const data = await getResponse.json();
            console.log('GET Success - Departments:', Array.isArray(data) ? data.length : 'Not array');
        } else {
            console.log('GET Error:', getResponse.status, await getResponse.text());
        }
    } catch (error) {
        console.log('GET Network Error:', error.message);
    }
    
    // 3. Test POST with proper auth
    console.log('\n3. Testing POST with authentication...');
    try {
        const postResponse = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                name: 'Frontend Test Department',
                companyId: '9996d1c9-54b6-4b3f-898b-8a3b09d042b4'
            })
        });
        
        console.log('POST Status:', postResponse.status);
        if (postResponse.ok) {
            const data = await postResponse.json();
            console.log('POST Success:', data);
            return data.id || (Array.isArray(data) && data[0]?.id);
        } else {
            const errorText = await postResponse.text();
            console.log('POST Error:', postResponse.status, errorText);
            
            // Common error analysis
            if (postResponse.status === 401) {
                console.log('   ⚠ This suggests an authentication issue');
                console.log('   Solution: Check if token is valid and properly formatted');
            } else if (postResponse.status === 403) {
                console.log('   ⚠ This suggests a permission issue');
                console.log('   Solution: Ensure you have admin privileges');
            }
        }
    } catch (error) {
        console.log('POST Network Error:', error.message);
        if (error.message.includes('CORS')) {
            console.log('   ⚠ CORS Error - Backend needs to allow your domain');
        }
    }
    
    // 4. Test what authenticatedFetch sends
    console.log('\n4. Testing authenticatedFetch behavior...');
    if (typeof window.DataService !== 'undefined' && window.DataService.createDepartment) {
        console.log('✅ DataService.createDepartment function available');
        // We can't easily test this without triggering actual creation
    } else {
        console.log('❌ DataService.createDepartment not available');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('If POST failed, the issue is likely:');
    console.log('1. Invalid authentication token');
    console.log('2. Token not being sent correctly');
    console.log('3. Backend CORS configuration');
    console.log('4. Backend permission settings');
}

// Quick auth check
function quickAuthCheck() {
    console.log('=== Quick Authentication Check ===');
    const token = localStorage.getItem('ets_token');
    
    if (!token) {
        console.log('❌ NO AUTH TOKEN - Log in to the application');
        return false;
    }
    
    console.log('✅ Token found');
    console.log('Token length:', token.length);
    
    // Check if it looks like a JWT
    if (token.includes('.')) {
        console.log('✅ Token appears to be JWT format');
    } else {
        console.log('⚠ Token format may be incorrect');
    }
    
    return true;
}

// Make functions available
window.testFrontendBackend = testFrontendBackend;
window.quickAuthCheck = quickAuthCheck;

console.log('\nRun testFrontendBackend() to test synchronization');
console.log('Run quickAuthCheck() for quick authentication verification');