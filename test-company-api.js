// Test script to verify the new company API integration
const { apiService } = require('./services/apiService.browser.js');

async function testCompanyAPI() {
    console.log('Testing Company API with new URL...');
    
    try {
        const result = await apiService.getCompanies();
        console.log('API Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ SUCCESS: Company API is working correctly');
            console.log(`✅ Retrieved ${result.data.length} companies`);
        } else {
            console.log('❌ ERROR: API call failed');
            console.log(`❌ Error: ${result.error}`);
        }
    } catch (error) {
        console.log('❌ ERROR: Exception occurred');
        console.log(`❌ Exception: ${error.message}`);
    }
}

testCompanyAPI();