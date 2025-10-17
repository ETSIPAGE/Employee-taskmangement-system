// Simple Node.js script to test the new department API URL
// Run with: node test-new-department-url.js

async function testNewDepartmentURL() {
    console.log('Testing New Department API URL Integration...\n');
    
    // Test GET endpoint (using the existing endpoint)
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
    
    // Test POST endpoint (using the new endpoint)
    try {
        console.log('2. Testing POST department endpoint...');
        const postResponse = await fetch('https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "name": "Engineering",
                "companyIds": ["9996d1c9-54b6-4b3f-898b-8a3b09d042b4"],
                "createdBy": "1",
                "description": "Handles all software and product development"
            })
        });
        
        console.log('   Status:', postResponse.status);
        
        if (postResponse.ok) {
            const postData = await postResponse.json();
            console.log('   Success: Created department with new URL');
            console.log('   Response:', JSON.stringify(postData, null, 2));
        } else {
            console.log('   Error:', postResponse.status, await postResponse.text());
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    console.log('\nNew URL integration testing completed.');
}

// Run the test
testNewDepartmentURL();