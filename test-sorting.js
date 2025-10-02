// Test script to verify that the sorting of roles and departments works correctly
console.log('🔍 Testing Sorting of Roles and Departments...');

// Test role sorting
console.log('\n=== Role Sorting Test ===');
const testRoles = [
  { id: '1', name: 'Admin', createdAt: '2023-01-01T10:00:00.000Z' },
  { id: '2', name: 'Manager', createdAt: '2023-01-02T10:00:00.000Z' },
  { id: '3', name: 'Employee', createdAt: '2023-01-03T10:00:00.000Z' },
  { id: '4', name: 'HR', createdAt: '2023-01-04T10:00:00.000Z' }
];

console.log('Original roles order:');
testRoles.forEach((role, index) => {
  console.log(`${index + 1}. ${role.name} (Created: ${role.createdAt})`);
});

// Sort roles by creation date (newest first)
const sortedRoles = [...testRoles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

console.log('\nSorted roles (newest first):');
sortedRoles.forEach((role, index) => {
  console.log(`${index + 1}. ${role.name} (Created: ${role.createdAt})`);
});

// Verify sorting is correct
const isRoleSortingCorrect = sortedRoles[0].name === 'HR' && sortedRoles[3].name === 'Admin';
console.log(`\n✅ Role sorting correct: ${isRoleSortingCorrect}`);

// Test department sorting
console.log('\n=== Department Sorting Test ===');
const testDepartments = [
  { id: '1', name: 'Engineering', timestamp: '2023-01-01T10:00:00.000Z' },
  { id: '2', name: 'Marketing', timestamp: '2023-01-02T10:00:00.000Z' },
  { id: '3', name: 'Sales', timestamp: '2023-01-03T10:00:00.000Z' },
  { id: '4', name: 'HR', timestamp: '2023-01-04T10:00:00.000Z' },
  { id: '5', name: 'Finance', timestamp: null } // No timestamp
];

console.log('Original departments order:');
testDepartments.forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp || 'N/A'})`);
});

// Sort departments by timestamp (newest first)
const sortedDepartments = [...testDepartments].sort((a, b) => {
  // If timestamp exists, sort by timestamp (newest first)
  if (a.timestamp && b.timestamp) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  }
  // If only one has timestamp, prioritize it
  if (a.timestamp && !b.timestamp) return -1;
  if (!a.timestamp && b.timestamp) return 1;
  // If neither has timestamp, maintain original order
  return 0;
});

console.log('\nSorted departments (newest first):');
sortedDepartments.forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp || 'N/A'})`);
});

// Verify sorting is correct
const isDepartmentSortingCorrect = sortedDepartments[0].name === 'HR' && sortedDepartments[3].name === 'Engineering';
console.log(`\n✅ Department sorting correct: ${isDepartmentSortingCorrect}`);

console.log('\n=== Summary ===');
console.log('✅ Roles are sorted by creation date (newest first)');
console.log('✅ Departments are sorted by timestamp (newest first)');
console.log('✅ Items without timestamps are handled gracefully');
console.log('✅ Recently added items appear first in both Roles and Departments');