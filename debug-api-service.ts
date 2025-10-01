// Debug version of the APIService to help identify issues with updateRole
import { Company, Department } from './types';

// ... existing interfaces ...
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  bgColor: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface RoleCreatePayload {
  name: string;
  description?: string;
  permissions: string[];
  color?: string;
  bgColor?: string;
  createdBy?: string;
}

export interface RoleUpdatePayload {
  // Update can be by id OR by name (your backend supports resolving by name)
  id?: string;
  name?: string;          // if provided, backend may treat as newName or resolve by name
  description?: string;
  permissions?: string[];
  color?: string;
  bgColor?: string;
}

export interface CompanyCreatePayload {
  name: string;
  createdBy: string;
}

export interface CompanyCreateResponse {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  endpoint?: string;
}

class APIService {
  private baseUrl = 'https://mjtdslnlpl.execute-api.ap-south-1.amazonaws.com';
  private departmentBase = 'https://jdq9lmtoth.execute-api.ap-south-1.amazonaws.com/departments';

  // 🔑 Role API endpoints based on user's AWS API Gateway URLs
  private roleEndpoints = {
    create: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles',
    get: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles',
    edit: 'https://brwvzy00vf.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles',
    delete: 'https://jjuzlm7x67.execute-api.ap-south-1.amazonaws.com/prod/Delete-Roles'
  };

  private endpoints = ['/prod/companies'];

  // Optional auth headers if needed later
  private apiAuth: { apiKey?: string; bearerToken?: string } = {};

  /* ========================
     Helpers
     ======================== */
  private withStdHeaders(init: RequestInit = {}): RequestInit {
    return {
      mode: 'cors',
      credentials: 'omit',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiAuth.apiKey && { 'x-api-key': this.apiAuth.apiKey }),
        ...(this.apiAuth.bearerToken && { Authorization: `Bearer ${this.apiAuth.bearerToken}` }),
        ...(init.headers || {}),
      },
    };
  }

  // Generic request helper for the Roles API
  private async roleRequest<T>(endpoint: string, init: RequestInit): Promise<APIResponse<T>> {
    console.log(`[DEBUG] Making request to: ${endpoint}`);
    console.log(`[DEBUG] Request options:`, init);
    
    try {
      const res = await fetch(endpoint, this.withStdHeaders(init));
      const text = await res.text();
      console.log(`[DEBUG] Response status: ${res.status}`);
      console.log(`[DEBUG] Response text: ${text}`);
      
      let data: any;
      try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

      if (!res.ok) {
        console.log(`[DEBUG] Request failed with status ${res.status}`);
        return {
          success: false,
          status: res.status,
          error: (data && (data.error || data.message)) || `Request failed with ${res.status}`,
          endpoint,
        };
      }
      console.log(`[DEBUG] Request successful`);
      return { success: true, data, status: res.status, endpoint };
    } catch (e: any) {
      console.log(`[DEBUG] Request error: ${e?.message || 'Network error'}`);
      return { success: false, error: e?.message || 'Network error', endpoint };
    }
  }

  /**
   * Configure authentication credentials for API requests
   */
  configureRoleAPIAuth(apiKey?: string, bearerToken?: string) {
    console.log(`[DEBUG] Configuring API auth - API Key: ${apiKey ? 'SET' : 'NOT SET'}, Bearer Token: ${bearerToken ? 'SET' : 'NOT SET'}`);
    this.apiAuth = { apiKey, bearerToken };
  }

  /**
   * Test role API connectivity
   */
  async testRoleAPI(): Promise<APIResponse<any>> {
    console.log(`[DEBUG] Testing role API connectivity`);
    return this.roleRequest<any>(this.roleEndpoints.get, { method: 'GET' });
  }

  // Update Role (PUT to Edit-Roles endpoint) - DEBUG VERSION
  async updateRole(payload: RoleUpdatePayload): Promise<APIResponse<CustomRole>> {
    console.log(`[DEBUG] updateRole called with payload:`, payload);
    
    const fullPayload = { ...payload, updatedAt: new Date().toISOString() };
    console.log(`[DEBUG] Full payload with timestamp:`, fullPayload);
    
    // If updating by ID, use the ID-specific endpoint
    const endpoint = payload.id 
      ? `${this.roleEndpoints.edit}/${encodeURIComponent(payload.id)}`
      : this.roleEndpoints.edit;
      
    console.log(`[DEBUG] Constructed endpoint: ${endpoint}`);
    
    const result = await this.roleRequest<CustomRole>(endpoint, { method: 'PUT', body: JSON.stringify(fullPayload) });
    console.log(`[DEBUG] updateRole result:`, result);
    
    return result;
  }
}

export const debugApiService = new APIService();