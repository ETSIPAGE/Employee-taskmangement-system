// Debug script for department operations
// Run this in the browser console to diagnose issues

async function debugDepartmentOperations() {
    console.log('=== Department Operations Debug ===');
    
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
        console.log('This script must be run in a browser environment');
        return;
    }
    
    // Check authentication
    console.log('1. Checking authentication status...');
    const token = localStorage.getItem('ets_token');
    if (token) {
        console.log('✓ Auth token found, length:', token.length);
    } else {
        console.log('✗ No auth token found - this may cause issues with POST/PUT/DELETE operations');
    }
    
    // Try to access the data service
    console.log('\n2. Checking data service availability...');
    if (window.DataService) {
        console.log('✓ DataService is available');
    } else {
        console.log('✗ DataService not found in window scope');
        console.log('Trying to import...');
        try {
            // This won't work in browser console, but shows the intent
            console.log('Note: Direct import not possible in browser console');
        } catch (e) {
            console.log('Import failed:', e.message);
        }
    }
    
    // Test GET departments
    console.log('\n3. Testing GET departments...');
    try {
        const response = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        console.log('GET Response Status:', response.status);
        console.log('GET Response OK:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('GET Success - Data type:', typeof data);
            console.log('GET Data length:', Array.isArray(data) ? data.length : 'Not an array');
            if (Array.isArray(data) && data.length > 0) {
                console.log('First department:', data[0]);
            }
        } else {
            const errorText = await response.text();
            console.log('GET Error Response:', errorText);
        }
    } catch (error) {
        console.log('GET Network Error:', error.message);
    }
    
    // Test POST department (if we have auth)
    console.log('\n4. Testing POST department...');
    if (!token) {
        console.log('Skipping POST test - no auth token');
    } else {
        try {
            const companyId = '9996d1c9-54b6-4b3f-898b-8a3b09d042b4';
            const response = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    name: 'Debug Test Department ' + Date.now(),
                    companyId: companyId
                })
            });
            
            console.log('POST Response Status:', response.status);
            console.log('POST Response OK:', response.ok);
            
            if (response.ok) {
                const data = await response.json();
                console.log('POST Success - Response:', data);
                return data.id || (Array.isArray(data) && data[0]?.id);
            } else {
                const errorText = await response.text();
                console.log('POST Error Response:', errorText);
                console.log('POST Status Text:', response.statusText);
                console.log('POST Headers:', [...response.headers.entries()]);
            }
        } catch (error) {
            console.log('POST Network Error:', error.message);
        }
    }
    
    console.log('\n=== Debug Complete ===');
}

// Make it available globally
window.debugDepartmentOperations = debugDepartmentOperations;
console.log('Debug function ready. Run debugDepartmentOperations() in console.');