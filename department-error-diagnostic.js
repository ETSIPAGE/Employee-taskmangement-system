// Department Error Diagnostic Tool
console.log('=== Department Error Diagnostic ===');

// Common error patterns and solutions
const COMMON_ERRORS = {
    '401': 'Unauthorized - Check if you are logged in and have a valid token',
    '403': 'Forbidden - Check if your user has permission to perform this action',
    '404': 'Not Found - Check if the endpoint URL is correct',
    '500': 'Internal Server Error - Backend issue, contact administrator',
    'CORS': 'Cross-Origin Resource Sharing error - Backend needs to allow your domain',
    'NETWORK': 'Network error - Check your internet connection',
    'PARSE': 'Response parsing error - Invalid JSON response from server'
};

function diagnoseError(error) {
    console.log('Analyzing error:', error);
    
    // Check for HTTP status codes
    if (error.includes('401')) {
        console.log('❌ AUTHENTICATION ERROR (401)');
        console.log('Problem: Missing or invalid authentication token');
        console.log('Solution:');
        console.log('  1. Log out and log back in to refresh your token');
        console.log('  2. Check if localStorage.getItem("ets_token") returns a value');
        console.log('  3. Verify the token is being sent in API requests');
        return;
    }
    
    if (error.includes('403')) {
        console.log('❌ PERMISSION ERROR (403)');
        console.log('Problem: Insufficient permissions for this operation');
        console.log('Solution:');
        console.log('  1. Ensure you are logged in as an Admin user');
        console.log('  2. Check if your role has department management permissions');
        return;
    }
    
    if (error.includes('404')) {
        console.log('❌ ENDPOINT ERROR (404)');
        console.log('Problem: API endpoint not found');
        console.log('Solution:');
        console.log('  1. Verify the URL is correct:');
        console.log('     POST/PUT/DELETE: https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt');
        console.log('     GET: https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        return;
    }
    
    if (error.includes('CORS') || error.includes('blocked')) {
        console.log('❌ CORS ERROR');
        console.log('Problem: Cross-Origin Resource Sharing blocked');
        console.log('Solution:');
        console.log('  1. This is a backend configuration issue');
        console.log('  2. The API needs to allow requests from your domain');
        console.log('  3. Contact backend team to configure CORS headers');
        return;
    }
    
    console.log('❓ UNKNOWN ERROR');
    console.log('Please provide the exact error message for more specific help');
}

// Function to check current setup
function checkCurrentSetup() {
    console.log('\n=== Current Setup Check ===');
    
    // Check authentication
    const token = localStorage.getItem('ets_token');
    if (token) {
        console.log('✅ Authentication token present');
    } else {
        console.log('❌ NO AUTHENTICATION TOKEN');
        console.log('  You must be logged in to perform department operations');
    }
    
    // Check endpoints
    console.log('\nExpected endpoints:');
    console.log('GET: https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
    console.log('POST: https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt');
    console.log('PUT: https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/{id}');
    console.log('DELETE: https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/{id}');
}

// Main diagnostic function
function runDepartmentDiagnostic() {
    console.log('Department Operations Diagnostic');
    console.log('================================');
    
    checkCurrentSetup();
    
    console.log('\nTo diagnose your specific error:');
    console.log('1. Copy the exact error message from the console');
    console.log('2. Run: diagnoseError("your error message here")');
    console.log('\nExample:');
    console.log('diagnoseError("401 Unauthorized")');
    console.log('diagnoseError("Failed to fetch")');
    console.log('diagnoseError("CORS error")');
}

// Make functions available
window.diagnoseError = diagnoseError;
window.checkDepartmentSetup = checkCurrentSetup;
window.runDepartmentDiagnostic = runDepartmentDiagnostic;

// Run automatically
runDepartmentDiagnostic();