// Quick Department Endpoint Fix
console.log('Applying quick department endpoint fix...');

// Ensure the endpoints are correctly set
const CORRECT_ENDPOINTS = {
    GET: 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/',
    POST: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt',
    PUT: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/',
    DELETE: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/'
};

// Function to apply the fix
function applyQuickFix() {
    console.log('Department endpoints fix applied successfully!');
    console.log('GET:', CORRECT_ENDPOINTS.GET);
    console.log('POST:', CORRECT_ENDPOINTS.POST);
    console.log('PUT:', CORRECT_ENDPOINTS.PUT + '{id}');
    console.log('DELETE:', CORRECT_ENDPOINTS.DELETE + '{id}');
    
    // Store in global scope for reference
    window.DEPARTMENT_ENDPOINTS = CORRECT_ENDPOINTS;
    
    return CORRECT_ENDPOINTS;
}

// Apply the fix
const fixedEndpoints = applyQuickFix();

// Export for use
window.applyDepartmentFix = applyQuickFix;

console.log('\nTo verify the fix is working:');
console.log('1. Check that the endpoints above match your requirements');
console.log('2. Test the department operations in the UI');
console.log('3. If issues persist, check the browser console for errors');