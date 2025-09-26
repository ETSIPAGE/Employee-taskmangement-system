// Browser-compatible version of APIService
// Role interfaces
export class CustomRole {
  constructor() {
    this.id = '';
    this.name = '';
    this.description = '';
    this.permissions = [];
    this.color = '';
    this.bgColor = '';
    this.createdAt = '';
    this.createdBy = '';
    this.updatedAt = '';
  }
}

export class RoleCreatePayload {
  constructor() {
    this.name = '';
    this.description = '';
    this.permissions = [];
    this.color = '';
    this.bgColor = '';
    this.createdBy = '';
  }
}

export class RoleUpdatePayload {
  constructor() {
    this.id = '';
    this.name = '';
    this.description = '';
    this.permissions = [];
    this.color = '';
    this.bgColor = '';
  }
}

export class CompanyCreatePayload {
  constructor() {
    this.name = '';
    this.createdBy = '';
  }
}

export class CompanyCreateResponse {
  constructor() {
    this.id = '';
    this.name = '';
    this.createdBy = '';
    this.createdAt = '';
  }
}

export class APIResponse {
  constructor() {
    this.success = false;
    this.data = undefined;
    this.error = undefined;
    this.status = undefined;
    this.endpoint = undefined;
  }
}

export class APIService {
  constructor() {
    this.baseUrl = 'https://mjtdslnlpl.execute-api.ap-south-1.amazonaws.com';
    this.departmentBase = 'https://jdq9lmtoth.execute-api.ap-south-1.amazonaws.com/departments';
    
    // 🔑 Role API endpoints based on user's AWS API Gateway URLs
    this.roleEndpoints = {
      create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
      get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
      edit: 'https://6ng8j57m7g.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles',
      delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
    };
    
    this.endpoints = ['/prod/companies'];
    
    // Authentication configuration
    this.apiAuth = { apiKey: undefined, bearerToken: undefined };
    
    // Cache for role API availability
    this.roleApiCache = { lastCheck: 0, isAvailable: true };
    this.CACHE_DURATION = 60000; // 1 minute cache
  }

  /**
   * Configure authentication credentials for API requests
   */
  configureRoleAPIAuth(apiKey, bearerToken) {
    console.log('🔑 Configuring Role API authentication...');
    this.apiAuth = { apiKey, bearerToken };
    // Reset cache when auth is configured to allow retrying
    this.roleApiCache = { lastCheck: 0, isAvailable: true };
  }

  /**
   * Enable role API endpoints when a working endpoint is available
   * @param {string} endpoint The working role API endpoint
   */
  enableRoleAPI(endpoint) {
    console.log('✅ Enabling role API with endpoint:', endpoint);
    this.roleEndpoints = [endpoint, ...this.roleEndpoints.filter(e => e !== endpoint)];
    this.roleBaseUrl = endpoint;
    this.roleApiCache = { lastCheck: Date.now(), isAvailable: true };
  }

  /**
   * Helper method to try multiple role API endpoints with enhanced error handling
   */
  async tryRoleEndpoints(path, options) {
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
    
    // Try each endpoint in order
    for (const baseUrl of this.roleEndpoints) {
      const endpoint = `${baseUrl}${path.startsWith('/') ? path : (path ? '/' + path : '')}`;
      
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
        
        const requestOptions = {
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
        };
        
        const response = await fetch(endpoint, {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle successful response
        if (response.ok) {
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text || 'Success' };
          }
          
          console.log(`✅ Role endpoint success: ${endpoint}`);
          
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
          console.warn(`⚠️ Request failed for ${endpoint}: ${response.status}`);
          continue;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
          console.warn(`🚫 CORS/Network error for ${endpoint}: ${errorMessage}`);
        } else if (errorMessage.includes('AbortError')) {
          console.warn(`⏰ Timeout for ${endpoint}`);
        } else {
          console.warn(`⚠️ Error for ${endpoint}: ${errorMessage}`);
        }
        continue;
      }
    }
    
    // Update cache - API is not available
    this.roleApiCache = { lastCheck: now, isAvailable: false };
    
    return {
      success: false,
      error: 'All role API endpoints failed - using localStorage fallback',
      endpoint: 'multiple endpoints tried'
    };
  }

  // ==================== ROLE API METHODS ====================

  /**
   * 🔧 Test role API connectivity
   */
  async testRoleAPI() {
    console.log('🧪 Testing role API connectivity...');
    
    if (this.roleEndpoints.length === 0) {
      return {
        success: false,
        error: 'Role API endpoints not configured. Use apiService.enableRoleAPI("your-endpoint") to configure.',
        endpoint: 'no endpoints'
      };
    }
    
    console.log('🎯 Role endpoints configured:', this.roleEndpoints);
    
    // Try a simple GET request to test connectivity
    return this.tryRoleEndpoints('', {
      method: 'GET'
    });
  }

  /**
   * Create a new custom role
   */
  async createRole(payload) {
    console.log('🎯 Creating role via API:', payload);
    
    // Add timestamp to payload for better tracking
    const fullPayload = {
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return this.tryRoleEndpoints('', {
      method: 'POST',
      body: JSON.stringify(fullPayload)
    });
  }

  /**
   * Get all custom roles
   */
  async getRoles() {
    console.log('🔍 Fetching roles from API');
    
    const result = await this.tryRoleEndpoints('', {
      method: 'GET'
    });
    
    if (result.success && result.data) {
      // Handle different response formats
      let roles = [];
      if (Array.isArray(result.data)) {
        roles = result.data;
      } else if (result.data && typeof result.data === 'object' && 'items' in result.data && Array.isArray(result.data.items)) {
        roles = result.data.items;
      } else if (result.data && typeof result.data === 'object' && 'data' in result.data && Array.isArray(result.data.data)) {
        roles = result.data.data;
      } else if (result.data && typeof result.data === 'object') {
        roles = [result.data];
      }
      
      // Ensure all roles have required fields
      const validatedRoles = roles.map(role => ({
        id: role.id || `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: role.name || 'Unnamed Role',
        description: role.description || 'No description provided',
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        color: role.color || 'indigo',
        bgColor: role.bgColor || 'bg-indigo-500',
        createdAt: role.createdAt || new Date().toISOString(),
        createdBy: role.createdBy || 'system',
        updatedAt: role.updatedAt || role.createdAt || new Date().toISOString()
      }));
      
      console.log('✅ Successfully fetched and validated roles:', validatedRoles);
      return {
        ...result,
        data: validatedRoles
      };
    }
    
    return result;
  }

  /**
   * Update an existing custom role
   */
  async updateRole(payload) {
    console.log('🔄 Updating role via API:', payload);
    
    // Ensure we have an ID for the update operation
    if (!payload.id) {
      return { 
        success: false, 
        error: 'Role ID is required for update operation', 
        endpoint: this.roleEndpoints.edit 
      };
    }
    
    // Add updatedAt timestamp
    const fullPayload = {
      ...payload,
      updatedAt: new Date().toISOString()
    };
    
    // Construct the path with the role ID (since base URL already includes /Edit-Roles)
    const path = `/${encodeURIComponent(payload.id)}`;
      
    console.log(`[DEBUG] updateRole - Path: ${path}`);
    console.log(`[DEBUG] updateRole - Payload:`, fullPayload);
    
    // Use the standard tryRoleEndpoints helper for consistency
    return this.tryRoleEndpoints(path, {
      method: 'PUT',
      body: JSON.stringify(fullPayload)
    });
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId) {
    console.log('🗑️ Deleting role via API:', roleId);
    
    const result = await this.tryRoleEndpoints(`?id=${encodeURIComponent(roleId)}`, {
      method: 'DELETE'
    });
    
    // Handle 204 No Content response for deletes
    if (result.success && (result.status === 204 || result.status === 200)) {
      return {
        ...result,
        data: { message: 'Role deleted successfully', id: roleId }
      };
    }
    
    return result;
  }

  // ==================== COMPANY API METHODS ====================

  /**
   * Get all companies
   */
  async getCompanies() {
    const externalUrl = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(externalUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `GET ${externalUrl} failed with ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = text;
      }

      let items = [];
      if (Array.isArray(json)) items = json;
      else if (json && typeof json === 'object' && 'items' in json && Array.isArray(json.items)) items = json.items;
      else if (json && typeof json === 'object' && 'data' in json && Array.isArray(json.data)) items = json.data;
      else if (json && typeof json === 'object') items = [json];

      const mapped = items
        .filter((it) => it && typeof it === 'object')
        .map((it) => ({
          id: String(it.id ?? it.ID ?? it.companyId ?? `comp-${Date.now()}-${Math.random()}`),
          name: String(it.name ?? it.companyName ?? 'Unnamed Company'),
          ownerId: String(it.createdBy ?? it.ownerId ?? it.owner ?? 'unknown'),
          createdAt: String(it.createdAt ?? it.timestamp ?? it.created ?? new Date().toISOString()),
        }));

      return { success: true, data: mapped };
    } catch (e) {
      clearTimeout(timeoutId);
      let msg = 'Unknown error';
      if (e?.name === 'AbortError') msg = 'Request timeout (15 seconds)';
      else if (e?.message?.includes('Failed to fetch')) msg = 'Network connection failed';
      else if (e?.message?.includes('CORS')) msg = 'CORS policy error';
      else if (e?.message) msg = e.message;
      return { success: false, error: msg };
    }
  }
}

// Export singleton instance
export const apiService = new APIService();