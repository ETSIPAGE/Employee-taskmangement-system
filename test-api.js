// Simple test script to verify API functionality
import { apiService } from './services/apiService';

console.log('Testing API Service...');

// Test role API
apiService.testRoleAPI().then(result => {
  console.log('Role API Test Result:', result);
}).catch(error => {
  console.error('Role API Test Error:', error);
});

// Test CORS configuration
apiService.testCORS().then(result => {
  console.log('CORS Test Result:', result);
}).catch(error => {
  console.error('CORS Test Error:', error);
});