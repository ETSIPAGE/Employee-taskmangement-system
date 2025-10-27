// Diagnostic script to identify department operation errors
console.log('Starting department operation diagnostics...');

async function diagnoseDepartmentOperations() {
    try {
        console.log('1. Checking if user is authenticated...');
        const token = localStorage.getItem('ets_token');
        console.log('Auth token present:', !!token);
        if (token) {
            console.log('Token length:', token.length);
        }
        
        // Test GET departments (this should work without auth in Postman)
        console.log('\n2. Testing GET departments...');
        try {
            const getResponse = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
            console.log('GET Status:', getResponse.status);
            console.log('GET Headers:', [...getResponse.headers.entries()]);
            
            if (getResponse.ok) {
                const getData = await getResponse.json();
                console.log('GET Success - Departments count:', Array.isArray(getData) ? getData.length : 'Not an array');
            } else {
                const errorText = await getResponse.text();
                console.log('GET Error:', errorText);
            }
        } catch (getError) {
            console.log('GET Network Error:', getError.message);
        }
        
        // Test CREATE department (requires auth)
        console.log('\n3. Testing CREATE department...');
        try {
            const companyId = '9996d1c9-54b6-4b3f-898b-8a3b09d042b4'; // From your Postman example
            const createResponse = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': token })
                },
                body: JSON.stringify({
                    name: 'Diagnostic Test Department',
                    companyId: companyId
                })
            });
            
            console.log('CREATE Status:', createResponse.status);
            console.log('CREATE Headers:', [...createResponse.headers.entries()]);
            
            if (createResponse.ok) {
                const createData = await createResponse.json();
                console.log('CREATE Success:', createData);
                return createData.id || (Array.isArray(createData) && createData[0]?.id);
            } else {
                const errorText = await createResponse.text();
                console.log('CREATE Error:', errorText);
                console.log('Error Status Text:', createResponse.statusText);
            }
        } catch (createError) {
            console.log('CREATE Network Error:', createError.message);
        }
        
    } catch (error) {
        console.error('Diagnostics failed with error:', error);
    }
}

// Run diagnostics
diagnoseDepartmentOperations();
console.log('Diagnostics script loaded. Run diagnoseDepartmentOperations() to execute.');