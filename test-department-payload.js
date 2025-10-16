// Simple Node.js script to test the department payload format
// Run with: node test-department-payload.js

async function testDepartmentPayload() {
    console.log('Testing Department Payload Format...\n');
    
    // Test POST endpoint with correct payload format
    try {
        console.log('1. Testing POST department with correct payload...');
        const postResponse = await fetch('https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment', {
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
            console.log('   Success: Created department with correct payload');
            console.log('   Response:', JSON.stringify(postData, null, 2));
        } else {
            console.log('   Error:', postResponse.status, await postResponse.text());
        }
    } catch (error) {
        console.log('   Error:', error.message);
    }
    
    console.log('\nPayload testing completed.');
}

// Run the test
testDepartmentPayload();