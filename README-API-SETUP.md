// Example of configuring authentication
apiService.configureRoleAPIAuth('your-api-key', 'your-bearer-token');apiService.testCORS().then(result => {
  console.log('CORS Test Result:', result);
});apiService.testCORS().then(result => {
  console.log('CORS Test Result:', result);
});apiService.testCORS().then(result => {
  console.log('CORS Test Result:', result);
});Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorizationprivate async tryRoleEndpoints<T>(path: string, options: RequestInit): Promise<APIResponse<T>> {
  const now = Date.now();

  // If no endpoints configured, immediately return failure
  if (this.roleEndpoints.length === 0) {
    console.log('🚫 Role API endpoints not configured - using localStorage only');
    return {
      success: false,
      error: 'Role API endpoints not configured - using localStorage fallback',
      endpoint: 'no endpoints'
    };
  }

  // Check cache to avoid repeated failed requests
  if (!this.roleApiCache.isAvailable && (now - this.roleApiCache.lastCheck) < this.CACHE_DURATION) {
    console.log('💫 Role API cached as unavailable, using localStorage');
    return {
      success: false,
      error: 'Role API recently failed - using localStorage fallback (cached)',
      endpoint: 'cached failure'
    };
  }

  // Enhanced request methods for better CORS handling
  const requestMethods = [
    {
      name: 'CORS with Auth',
      getOptions: () => ({
        ...options,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.apiAuth.apiKey && { 'x-api-key': this.apiAuth.apiKey }),
          ...(this.apiAuth.bearerToken && { 'Authorization': `Bearer ${this.apiAuth.bearerToken}` }),
          ...options.headers
        }
      })
    },
    {
      name: 'Standard CORS',
      getOptions: () => ({
        ...options,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      })
    },
    {
      name: 'No-CORS Fallback',
      getOptions: () => ({
        ...options,
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  ];

  // Try each endpoint in order
  for (const baseUrl of this.roleEndpoints) {
    const endpoint = `${baseUrl}${path.startsWith('/') ? path : (path ? '/' + path : '')}`;

    // Try each request method
    for (const method of requestMethods) {
      try {
        console.log(`🔍 Trying ${method.name} for: ${endpoint}`);

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

        const requestOptions = method.getOptions();
        const response = await fetch(endpoint, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle successful response
        if (response.ok) {
          const text = await response.text();
          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text || 'Success' };
          }

          console.log(`✅ Role endpoint success with ${method.name}: ${endpoint}`);

          // Update cache - API is available
          this.roleApiCache = { lastCheck: now, isAvailable: true };

          return {
            success: true,
            data,
            status: response.status,
            endpoint
          };
        } else if (response.status === 403) {
          console.warn(`🔐 Authentication required for ${endpoint} (403 Forbidden)`);
          // Don't try other methods for 403, but try next endpoint
          break;
        } else if (response.status === 404) {
          console.log(`🚧 Endpoint exists but roles route not found: ${endpoint}`);
          // Try next method for 404
          continue;
        } else {
          console.warn(`⚠️ ${method.name} failed for ${endpoint}: ${response.status}`);
          continue;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
          console.warn(`🚫 ${method.name} CORS/Network error for ${endpoint}: ${errorMessage}`);
        } else if (errorMessage.includes('AbortError')) {
          console.warn(`⏰ ${method.name} timeout for ${endpoint}`);
        } else {
          console.warn(`⚠️ ${method.name} error for ${endpoint}: ${errorMessage}`);
        }
        continue;
      }
    }
  }

  // Update cache - API is not available
  this.roleApiCache = { lastCheck: now, isAvailable: false };

  return {
    success: false,
    error: 'All role API endpoints and methods failed - using localStorage fallback',
    endpoint: 'multiple endpoints and methods tried'
  };
}apiService.testRoleAPI().then(result => {
  console.log('Role API Test Result:', result);
});apiService.getRoles().then(result => {
  console.log('Get Roles Result:', result);
});# Role API Setup Guide

This guide will help you connect and configure the Role API functionality in your Employee Task Management System.

## API Endpoint

The Role API is configured to use the following endpoint:
```
https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod
```

## Authentication

The API may require authentication. If you receive a 403 Forbidden error, you'll need to configure either:
1. API Key (`x-api-key` header)
2. Bearer Token (`Authorization: Bearer <token>` header)

## Testing API Connection

### Method 1: Using the Browser Test Page

1. Open `test-api-browser.html` in your browser
2. Click "Test Connection" buttons to verify API connectivity
3. If you get a 403 error, proceed to authentication configuration

### Method 2: Using the Authentication Configuration Page

1. Open `configure-api-auth.html` in your browser
2. Enter your API Key or Bearer Token
3. Click "Configure Authentication"
4. The credentials will be saved in localStorage for future use

## Troubleshooting

### 403 Forbidden Error
This indicates that the API requires authentication. You need to provide valid credentials.

### Network/CORS Errors
These may occur if:
1. The API endpoint is incorrect
2. The API server is not properly configured for CORS
3. There are network connectivity issues

### Timeout Errors
If requests are taking too long, the API server might be slow or unresponsive.

## Role API Methods

The following methods are available in the `apiService`:

1. `testRoleAPI()` - Test basic connectivity
2. `getRoles()` - Retrieve all custom roles
3. `createRole(payload)` - Create a new custom role
4. `updateRole(payload)` - Update an existing role
5. `deleteRole(roleId)` - Delete a role

## Local Storage Fallback

If the API is unavailable, the system will automatically fall back to using localStorage for role data persistence.

## Files Overview

- `components/dashboard/RolesDashboard.tsx` - Main UI component for role management
- `services/apiService.ts` - Main API service (Node.js compatible)
- `services/apiService.browser.js` - Browser-compatible API service
- `test-api-browser.html` - Browser-based API testing tool
- `configure-api-auth.html` - Authentication configuration tool

## Usage in RolesDashboard

The RolesDashboard component automatically:
1. Attempts to load roles from the API
2. Falls back to localStorage if API is unavailable
3. Provides UI for creating, editing, and deleting roles
4. Handles authentication prompts when 403 errors occur