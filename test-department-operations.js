// Test script to verify department operations
async function testDepartmentOperations() {
    const baseUrl = 'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt';
    const companyId = '9996d1c9-54b6-4b3f-898b-8a3b09d042b4';
    
    // You'll need to provide a valid token here
    const authToken = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token
    
    console.log('Testing department operations...\n');
    
    try {
        // Test CREATE
        console.log('1. Testing CREATE operation...');
        const createResponse = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({
                name: 'Test Department ' + Date.now(),
                companyId: companyId
            })
        });
        
        console.log('Create Status:', createResponse.status);
        const createData = await createResponse.json();
        console.log('Create Response:', createData);
        
        if (!createResponse.ok) {
            console.log('CREATE failed');
            return;
        }
        
        const departmentId = createData.id || createData[0]?.id;
        console.log('Created department with ID:', departmentId);
        
        // Test UPDATE
        console.log('\n2. Testing UPDATE operation...');
        const updateResponse = await fetch(`${baseUrl}/${departmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            body: JSON.stringify({
                name: 'Updated Test Department',
                companyId: companyId
            })
        });
        
        console.log('Update Status:', updateResponse.status);
        const updateData = await updateResponse.json();
        console.log('Update Response:', updateData);
        
        if (!updateResponse.ok) {
            console.log('UPDATE failed');
            return;
        }
        
        // Test DELETE
        console.log('\n3. Testing DELETE operation...');
        const deleteResponse = await fetch(`${baseUrl}/${departmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authToken
            }
        });
        
        console.log('Delete Status:', deleteResponse.status);
        if (deleteResponse.ok) {
            console.log('DELETE successful');
        } else {
            const deleteError = await deleteResponse.text();
            console.log('Delete Error:', deleteError);
        }
        
        console.log('\nAll tests completed!');
        
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Run the test
testDepartmentOperations();