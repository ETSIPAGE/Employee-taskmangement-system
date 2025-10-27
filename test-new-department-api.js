// Simple Node.js script to test the new department API endpoints
// Run with: node test-new-department-api.js

async function testNewDepartmentAPIs() {
    console.log('Testing New Department API Integration...\n');
    
    // Test GET endpoint (using the old endpoint as it wasn't changed)
    try {
        console.log('1. Testing GET departments endpoint...');
        const getResponse = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        console.log('   Status:', getResponse.status);
        
        if (getResponse.ok) {
            const getData = await getResponse.json();
            console.log('   Success: Received department data');
            console.log('   Sample data:', JSON.stringify(getData.items?.slice(0, 2) || getData.slice(0, 2), null, 2));
        } else {
            console.log('   Error:', getResponse.status, await getResponse.text());
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    console.log('\n');
    
    // Test POST endpoint (using the new base URL)
    try {
        console.log('2. Testing POST department endpoint...');
        const postResponse = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Department',
                company_id: 'COMP-123'
            })
        });
        
        console.log('   Status:', postResponse.status);
        
        if (postResponse.ok) {
            const postData = await postResponse.json();
            console.log('   Success: Created department');
            console.log('   Response:', JSON.stringify(postData, null, 2));
        } else {
            console.log('   Error:', postResponse.status, await postResponse.text());
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    console.log('\nAPI testing completed.');
}

// Run the test
testNewDepartmentAPIs();