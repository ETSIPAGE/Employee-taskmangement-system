// Script to verify department endpoints are correctly configured
console.log('Verifying department endpoints...');

const expectedEndpoints = {
    GET: 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/',
    POST: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt',
    PUT: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/{id}',
    DELETE: 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt/{id}'
};

console.log('Expected endpoints configuration:');
console.log(expectedEndpoints);

// Check if we can access the dataService functions
console.log('\nChecking if dataService is accessible...');
if (typeof window.DataService !== 'undefined') {
    console.log('✓ DataService is available');
    
    // Check if the functions exist
    const functions = ['getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment'];
    functions.forEach(func => {
        if (typeof window.DataService[func] === 'function') {
            console.log(`✓ ${func} function exists`);
        } else {
            console.log(`✗ ${func} function missing`);
        }
    });
} else {
    console.log('✗ DataService not found');
}

console.log('\nVerification complete. Check the dataService.ts file to ensure endpoints match expected configuration.');