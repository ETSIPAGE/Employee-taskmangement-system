# Frontend Role Update Debugging Guide

This guide will help you identify and resolve issues with role updates in the frontend.

## Common Issues and Solutions

### 1. API Authentication Required (403 Forbidden)

**Symptoms**:
- You see a red banner with "⚠️ API Authentication Required (403 Forbidden)"
- Role updates fail with authentication errors

**Solution**:
1. Click the "FIX AUTH NOW!" button in the Roles Dashboard
2. Enter your API Key or Bearer Token in the authentication modal
3. Click "Connect API"
4. Try updating the role again

### 2. Network Connectivity Issues

**Symptoms**:
- Updates fail with network errors
- No response from the API
- Timeout errors

**Solution**:
1. Check your internet connection
2. Verify the API endpoint is accessible:
   ```
   https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod
   ```
3. Check for firewall or proxy issues

### 3. JavaScript Errors

**Symptoms**:
- Nothing happens when clicking "Update Role"
- Console shows JavaScript errors

**Solution**:
1. Open browser DevTools (F12)
2. Go to the Console tab
3. Look for any error messages
4. Report any JavaScript errors for further assistance

## Debugging Steps

### Step 1: Enable Debug Logging

The application includes debug logging that can help identify issues. To see these logs:

1. Open your browser's developer tools (F12)
2. Go to the Console tab
3. Try to update a role
4. Look for messages that start with `[DEBUG]`

### Step 2: Check Network Requests

To see the actual API requests being made:

1. Open browser DevTools (F12)
2. Go to the Network tab
3. Try to update a role
4. Look for requests to:
   ```
   https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod
   ```
5. Check the request payload and response

### Step 3: Verify Form Data

Make sure all required fields are filled out:

1. Role Name (cannot be empty)
2. Role Description (cannot be empty)
3. At least one permission selected

### Step 4: Check API Connection Status

The application shows the API connection status in the UI:

1. Look for indicators in the Roles Dashboard
2. "Connected" status means the API is working
3. "Failed" status means there are connectivity issues
4. "Auth Required" status means authentication is needed

## Expected Behavior

When a role is successfully updated:

1. The role should be updated in the API (if connected)
2. The role should be updated in localStorage (fallback)
3. You should see a success message
4. The role list should refresh with updated information

## Manual Testing

You can manually test the role update functionality using the browser console:

1. Open browser DevTools (F12)
2. Go to the Console tab
3. Run this code to simulate a role update:

```javascript
// This is a simplified version of what happens in the application
async function testRoleUpdate() {
  try {
    // Import the API service
    const { apiService } = await import('./services/apiService');
    
    // Sample role data (replace with actual role ID)
    const updateData = {
      id: 'your-role-id-here',
      name: 'Updated Role Name',
      description: 'Updated role description',
      permissions: ['view_dashboard', 'manage_users'],
      color: 'blue',
      bgColor: 'bg-blue-500'
    };
    
    // Try to update the role
    const result = await apiService.updateRole(updateData);
    console.log('Update result:', result);
    
    if (result.success) {
      console.log('✅ Role updated successfully');
    } else {
      console.log('❌ Role update failed:', result.error);
    }
  } catch (error) {
    console.error('Error updating role:', error);
  }
}

// Run the test
testRoleUpdate();
```

## Contact Support

If you continue to experience issues after following this guide:

1. Take screenshots of any error messages
2. Note the exact steps you took
3. Include browser console output
4. Contact support with this information

## Additional Resources

- [API Service Documentation](./services/apiService.ts)
- [Roles Dashboard Component](./components/dashboard/RolesDashboard.tsx)
- [Authentication Setup Guide](./README-API-SETUP.md)