// Test CORS preflight for department operations
async function testCorsPreflight() {
    console.log('=== CORS Preflight Test ===');
    
    const urls = [
        'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/',
        'https://2e7vbe6btc.execute-api.ap-south-1.amazonaws.com/dev/dpt'
    ];
    
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    for (const url of urls) {
        console.log(`\nTesting ${url}`);
        
        for (const method of methods) {
            try {
                console.log(`  ${method}...`);
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Add a body for POST/PUT to trigger preflight
                    ...(method === 'POST' || method === 'PUT' ? {
                        body: JSON.stringify({ test: 'data' })
                    } : {})
                });
                
                console.log(`    Status: ${response.status}`);
                console.log(`    OK: ${response.ok}`);
                
                // Check CORS headers
                console.log(`    Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
                console.log(`    Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
                console.log(`    Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
                
            } catch (error) {
                console.log(`    Error: ${error.message}`);
            }
        }
    }
    
    console.log('\n=== CORS Test Complete ===');
}

window.testCorsPreflight = testCorsPreflight;
console.log('CORS test function ready. Run testCorsPreflight() in console.');