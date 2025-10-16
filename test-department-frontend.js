// Test script to verify department operations in frontend context
// This script can be run in the browser console of the application

console.log('Testing department operations in frontend context...');

// Function to test department operations
async function testDepartmentOperations() {
    try {
        // Get the data service functions
        // Note: These would need to be imported in the actual application context
        console.log('Checking if dataService is available...');
        
        // Test getting departments
        console.log('1. Testing GET departments...');
        const departments = await window.DataService.getDepartments();
        console.log('Departments:', departments);
        
        // Test creating a department
        console.log('2. Testing CREATE department...');
        // You'll need a valid company ID from your system
        const companyId = 'comp-1'; // Default company ID
        const newDepartment = await window.DataService.createDepartment(
            'Test Department ' + Date.now(), 
            companyId
        );
        console.log('Created department:', newDepartment);
        
        const departmentId = newDepartment.id;
        
        // Test updating the department
        console.log('3. Testing UPDATE department...');
        const updatedDepartment = await window.DataService.updateDepartment(
            departmentId,
            'Updated Test Department',
            companyId
        );
        console.log('Updated department:', updatedDepartment);
        
        // Test deleting the department
        console.log('4. Testing DELETE department...');
        await window.DataService.deleteDepartment(departmentId);
        console.log('Department deleted successfully');
        
        console.log('All frontend tests completed successfully!');
        
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Make the function available in the global scope for testing
window.testDepartmentOperations = testDepartmentOperations;

console.log('Test function is ready. Run testDepartmentOperations() in the console to execute tests.');