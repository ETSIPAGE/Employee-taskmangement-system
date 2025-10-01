# Role API Integration Guide

This document explains how the AWS API Gateway endpoints have been integrated into the Employee Task Management System.

## Integrated Endpoints

The following AWS API Gateway endpoints have been integrated:

1. **Create Roles**: `https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles`
2. **Get Roles**: `https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles`
3. **Edit Roles**: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles`
4. **Edit Roles with ID**: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles/{id}`
5. **Delete Roles**: `https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles`

## API Service Implementation

The endpoints have been integrated into the `apiService.ts` file in the following way:

```typescript
private roleEndpoints = {
  create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
  get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
  edit: 'https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles',
  delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
};
```

## Authentication

If your API requires authentication, you can configure it using:

```typescript
apiService.configureRoleAPIAuth('your-api-key', 'your-bearer-token');
```

## Testing the Integration

To test the integration:

1. Open `test-role-api-integration.html` in your browser
2. Configure your API authentication credentials (if required)
3. Test the API connection
4. Try creating, reading, updating, and deleting roles

## Usage in Components

The Roles Dashboard component automatically uses these endpoints for all role operations:

- Creating new roles
- Fetching existing roles
- Updating role information
- Deleting roles

All operations include proper error handling and fallback to localStorage when the API is unavailable.