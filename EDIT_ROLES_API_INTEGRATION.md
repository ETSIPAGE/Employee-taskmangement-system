# Edit Roles API Integration

## Overview
This document summarizes the integration with the Edit Roles API endpoint:
- Base URL: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles`
- ID-specific URL: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles/{id}`

## Current Implementation

### TypeScript API Service (`apiService.ts`)
The [updateRole](file://c:\Users\Hi\Desktop\ETS\Employee-taskmangement-system\services\apiService.ts#L410-L419) method is already implemented to work with the new endpoint:

```typescript
async updateRole(payload: RoleUpdatePayload): Promise<APIResponse<CustomRole>> {
  const fullPayload = { ...payload, updatedAt: new Date().toISOString() };
  // If updating by ID, use the ID-specific endpoint
  const endpoint = payload.id 
    ? `${this.roleEndpoints.edit}/${encodeURIComponent(payload.id)}`
    : this.roleEndpoints.edit;
  return this.roleRequest<CustomRole>(endpoint, { method: 'PUT', body: JSON.stringify(fullPayload) });
}
```

### Browser-compatible API Service (`apiService.browser.js`)
The [updateRole](file://c:\Users\Hi\Desktop\ETS\Employee-taskmangement-system\services\apiService.browser.js#L308-L327) method is also implemented:

```javascript
async updateRole(payload) {
  console.log('🔄 Updating role via API:', payload);
  
  // Add updatedAt timestamp
  const fullPayload = {
    ...payload,
    updatedAt: new Date().toISOString()
  };
  
  // If updating by ID, use the ID-specific endpoint
  const path = payload.id 
    ? `/${encodeURIComponent(payload.id)}`
    : '';
    
  return this.tryRoleEndpoints(path, {
    method: 'PUT',
    body: JSON.stringify(fullPayload)
  });
}
```

## API Endpoints
1. **Base URL**: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles`
   - Used when updating a role without specifying an ID in the path
   - ID is passed as a query parameter or in the payload

2. **ID-specific URL**: `https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles/{id}`
   - Used when updating a specific role by ID in the path
   - This is the preferred method as it's more RESTful

## Request Format
The API expects a PUT request with a JSON payload containing:
```json
{
  "id": "role-id",
  "name": "Role Name",
  "description": "Role Description",
  "permissions": ["permission1", "permission2"],
  "color": "blue",
  "bgColor": "bg-blue-500",
  "updatedAt": "2025-09-22T10:00:00.000Z"
}
```

## Response Format
The API returns a response in this format:
```json
{
  "success": true,
  "data": {
    "id": "role-id",
    "name": "Updated Role Name",
    "description": "Updated Role Description",
    "permissions": ["permission1", "permission2"],
    "color": "blue",
    "bgColor": "bg-blue-500",
    "createdAt": "2025-09-20T10:00:00.000Z",
    "createdBy": "user-id",
    "updatedAt": "2025-09-22T10:00:00.000Z"
  }
}
```

## Testing
To test the integration:
1. Run `node test-edit-roles-api.cjs` to verify basic connectivity
2. Use the application's Roles Dashboard to test actual role update functionality
3. Check browser console for detailed logs from the browser-compatible version

## Verification
The integration has been verified through code review and is consistent with the existing role management implementation in the application.

## Usage
The Roles Dashboard and any other components that update roles will automatically use this new endpoint when the [updateRole](file://c:\Users\Hi\Desktop\ETS\Employee-taskmangement-system\services\apiService.browser.js#L308-L327) method is called.