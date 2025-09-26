// Simple test script to verify API connections
const { apiService } = require('./services/apiService.ts');

console.log('Testing API Connections...');

// Test 1: Test Role API
console.log('\n1. Testing Role API Connection...');
apiService.testRoleAPI().then(result => {
  console.log('Role API Test Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Role API Test Error:', error);
});

// Test 2: Test Companies API
console.log('\n2. Testing Companies API Connection...');
apiService.getCompanies().then(result => {
  console.log('Companies API Test Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Companies API Test Error:', error);
});

// Test 3: Test Departments API
console.log('\n3. Testing Departments API Connection...');
apiService.getDepartments().then(result => {
  console.log('Departments API Test Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Departments API Test Error:', error);
});

// Test 4: Test Department API Connectivity
console.log('\n4. Testing Department API Connectivity...');
apiService.testDepartmentAPI().then(result => {
  console.log('Department API Connectivity Test Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Department API Connectivity Test Error:', error);
});