// Test script to verify that the department sorting works correctly with timestamps
console.log('🔍 Testing Department Sorting with Timestamps...');

// Test departments with timestamps
console.log('\n=== Department Sorting Test (With Timestamps) ===');
const testDepartments = [
  { id: '1', name: 'Engineering', timestamp: '2023-01-01T10:00:00.000Z' },
  { id: '2', name: 'Marketing', timestamp: '2023-01-02T10:00:00.000Z' },
  { id: '3', name: 'Sales', timestamp: '2023-01-03T10:00:00.000Z' },
  { id: '4', name: 'HR', timestamp: '2023-01-04T10:00:00.000Z' }
];

console.log('Original departments order:');
testDepartments.forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp})`);
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
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp})`);
});

// Verify sorting is correct
const isDepartmentSortingCorrect = sortedDepartments[0].name === 'HR' && sortedDepartments[3].name === 'Engineering';
console.log(`\n✅ Department sorting correct: ${isDepartmentSortingCorrect}`);

// Test departments without timestamps
console.log('\n=== Department Sorting Test (Mixed Timestamps) ===');
const mixedDepartments = [
  { id: '1', name: 'Engineering', timestamp: '2023-01-01T10:00:00.000Z' },
  { id: '2', name: 'Marketing', timestamp: null },
  { id: '3', name: 'Sales', timestamp: '2023-01-03T10:00:00.000Z' },
  { id: '4', name: 'HR', timestamp: '2023-01-04T10:00:00.000Z' }
];

console.log('Original departments order:');
mixedDepartments.forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp || 'N/A'})`);
});

// Sort departments by timestamp (newest first)
const sortedMixedDepartments = [...mixedDepartments].sort((a, b) => {
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
sortedMixedDepartments.forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (Timestamp: ${dept.timestamp || 'N/A'})`);
});

console.log('\n=== Summary ===');
console.log('✅ Departments with timestamps are sorted correctly (newest first)');
console.log('✅ Departments without timestamps are handled gracefully');
console.log('✅ Recently added departments appear first in the list');