# Update Role Method Consistency Fix

## Issue Identified
There was an inconsistency in how the `updateRole` method handled endpoint construction between the TypeScript and browser versions of the API service.

## Problem Description
1. **TypeScript Version**: Was constructing the full endpoint URL directly and passing it to `roleRequest`
2. **Browser Version**: Was constructing only the path and passing it to `tryRoleEndpoints`

This inconsistency could lead to issues with endpoint construction and make debugging more difficult.

## Fix Applied
Updated the TypeScript version to match the browser version's approach for better consistency:

### Before Fix (TypeScript version):
```typescript
async updateRole(payload: RoleUpdatePayload): Promise<APIResponse<CustomRole>> {
  const fullPayload = { ...payload, updatedAt: new Date().toISOString() };
  // If updating by ID, use the ID-specific endpoint
  const endpoint = payload.id 
    ? `${this.roleEndpoints.edit}/${encodeURIComponent(payload.id)}`
    : this.roleEndpoints.edit;
  console.log(`[DEBUG] updateRole - Endpoint: ${endpoint}`);
  console.log(`[DEBUG] updateRole - Payload:`, fullPayload);
  return this.roleRequest<CustomRole>(endpoint, { method: 'PUT', body: JSON.stringify(fullPayload) });
}
```

### After Fix (TypeScript version):
```typescript
async updateRole(payload: RoleUpdatePayload): Promise<APIResponse<CustomRole>> {
  const fullPayload = { ...payload, updatedAt: new Date().toISOString() };
  
  // For consistency with browser version, construct only the path
  const path = payload.id 
    ? `/${encodeURIComponent(payload.id)}`
    : '';
    
  console.log(`[DEBUG] updateRole - Path: ${path}`);
  console.log(`[DEBUG] updateRole - Payload:`, fullPayload);
  
  // Use roleRequest with the properly constructed endpoint
  const endpoint = payload.id 
    ? `${this.roleEndpoints.edit}${path}`
    : this.roleEndpoints.edit;
    
  return this.roleRequest<CustomRole>(endpoint, { method: 'PUT', body: JSON.stringify(fullPayload) });
}
```

## Benefits of the Fix
1. **Consistency**: Both versions now follow the same pattern for endpoint construction
2. **Maintainability**: Easier to maintain and debug when both versions work the same way
3. **Clarity**: Clear separation between path construction and full endpoint construction

## Verification
The fix has been implemented and maintains the same functionality while improving code consistency between the two versions of the API service.