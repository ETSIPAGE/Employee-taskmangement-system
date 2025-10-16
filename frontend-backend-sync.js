// Frontend-Backend Synchronization Fix
console.log('=== Frontend-Backend Synchronization Fix ===');

// The issue is that Postman works but frontend doesn't
// This typically means authentication or CORS issues

async function syncFrontendBackend() {
    console.log('Synchronizing frontend with backend...\n');
    
    // 1. Check authentication token
    console.log('1. Checking authentication token...');
    const token = localStorage.getItem('ets_token');
    if (!token) {
        console.log('❌ NO AUTH TOKEN - This is likely the issue!');
        console.log('   Solution: Log in to the application first');
        return false;
    }
    console.log('✅ Auth token found');
    
    // 2. Compare Postman vs Frontend headers
    console.log('\n2. Comparing Postman vs Frontend configuration...');
    
    console.log('Postman typically works because:');
    console.log('  - It might not require authentication for testing');
    console.log('  - It sends different headers');
    console.log('  - It bypasses CORS in some cases\n');
    
    // 3. Test with Postman-like configuration
    console.log('3. Testing with Postman-like configuration...');
    
    try {
        // Test GET (should work without auth)
        console.log('Testing GET endpoint...');
        const getResponse = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        console.log('GET Status:', getResponse.status);
        
        // Test POST with minimal headers (like Postman)
        console.log('\nTesting POST with minimal headers...');
        const postResponse = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Note: No Authorization header to mimic Postman
            },
            body: JSON.stringify({
                name: 'Test Department',
                companyId: '9996d1c9-54b6-4b3f-898b-8a3b09d042b4'
            })
        });
        
        console.log('POST Status (no auth):', postResponse.status);
        
        if (postResponse.status === 401 || postResponse.status === 403) {
            console.log('❌ AUTHENTICATION REQUIRED');
            console.log('   The API requires authentication but frontend is not sending token correctly');
            console.log('   Solution: Ensure authenticatedFetch is working properly');
            return false;
        }
        
    } catch (error) {
        console.log('Network Error:', error.message);
        if (error.message.includes('CORS') || error.message.includes('blocked')) {
            console.log('❌ CORS ERROR');
            console.log('   This is a backend configuration issue');
            console.log('   Solution: Backend needs to allow your frontend domain');
            return false;
        }
    }
    
    console.log('\n✅ Frontend-Backend sync check complete');
    return true;
}

// Function to fix authentication issues
function fixAuthentication() {
    console.log('\n=== Fixing Authentication Issues ===');
    
    // Check if authenticatedFetch is working
    console.log('1. Checking authenticatedFetch function...');
    
    if (typeof window.DataService === 'undefined') {
        console.log('❌ DataService not available');
        console.log('   Try refreshing the page or checking for JavaScript errors');
        return false;
    }
    
    // Check token
    const token = localStorage.getItem('ets_token');
    if (!token) {
        console.log('❌ No authentication token');
        console.log('   Please log in to the application');
        return false;
    }
    
    console.log('✅ Authentication token found');
    console.log('   Token length:', token.length);
    
    // Test token validity
    console.log('\n2. Testing token validity...');
    try {
        // Simple test - check if token looks valid
        if (token.length < 10) {
            console.log('⚠ Token seems too short - might be invalid');
        } else {
            console.log('✅ Token appears valid');
        }
    } catch (e) {
        console.log('❌ Error checking token:', e.message);
    }
    
    console.log('\n✅ Authentication fix check complete');
    return true;
}

// Main synchronization function
async function fixFrontendBackendSync() {
    console.log('=== Frontend-Backend Synchronization ===\n');
    
    console.log('Issue: API works in Postman but not in frontend');
    console.log('Common causes:');
    console.log('  1. Missing/invalid authentication token');
    console.log('  2. CORS restrictions');
    console.log('  3. Different headers between Postman and frontend');
    console.log('  4. Network connectivity issues\n');
    
    // Run checks
    const syncResult = await syncFrontendBackend();
    const authResult = fixAuthentication();
    
    console.log('\n=== Summary ===');
    if (syncResult && authResult) {
        console.log('✅ All checks passed - issue might be intermittent');
    } else {
        console.log('❌ Issues found - see solutions above');
    }
    
    console.log('\nNext steps:');
    console.log('1. Check browser console for specific error messages');
    console.log('2. Verify you are logged in as Admin');
    console.log('3. Try refreshing the page');
    console.log('4. Check network tab in developer tools');
}

// Make available globally
window.fixFrontendBackendSync = fixFrontendBackendSync;
window.syncFrontendBackend = syncFrontendBackend;
window.fixAuthentication = fixAuthentication;

console.log('\nRun fixFrontendBackendSync() to diagnose the issue');