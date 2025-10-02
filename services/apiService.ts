// api/APIService.ts
import { Company, Department } from '../types';

/* ========================
   Role interfaces
   ======================== */
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

/* ========================
   Companies
   ======================== */
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
    edit: 'https://6ng8j57m7g.execute-api.ap-south-1.amazonaws.com/prod/Edit-Roles',
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
    try {
      const res = await fetch(endpoint, this.withStdHeaders(init));
      const text = await res.text();
      let data: any;
      try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          error: (data && (data.error || data.message)) || `Request failed with ${res.status}`,
          endpoint,
        };
      }
      return { success: true, data, status: res.status, endpoint };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error', endpoint };
    }
  }

  /**
   * Configure authentication credentials for API requests
   */
  configureRoleAPIAuth(apiKey?: string, bearerToken?: string) {
    this.apiAuth = { apiKey, bearerToken };
  }

  /**
   * Test role API connectivity
   */
  async testRoleAPI(): Promise<APIResponse<any>> {
    return this.roleRequest<any>(this.roleEndpoints.get, { method: 'GET' });
  }

  /* ========================
     COMPANIES
     ======================== */
  async createCompany(payload: CompanyCreatePayload): Promise<APIResponse<CompanyCreateResponse>> {
    const allEndpoints = ['/api/companies', ...this.endpoints.map((ep) => `${this.baseUrl}${ep}`)];

    for (const endpoint of allEndpoints) {
      try {
        const response = await fetch(endpoint, this.withStdHeaders({
          method: 'POST',
          body: JSON.stringify(payload),
        }));
        if (response.ok) {
          const result = await response.json();
          return { success: true, data: result, endpoint };
        }
      } catch {/* try next */ }
    }
    return { success: false, error: 'All API endpoints failed' };
  }

  async testAPI(): Promise<APIResponse<CompanyCreateResponse>> {
    const testPayload: CompanyCreatePayload = { name: 'Test Company', createdBy: 'TEST-USER' };
    return this.createCompany(testPayload);
  }

  async getCompanies(): Promise<APIResponse<Company[]>> {
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

      const json = await response.json();
      let items: any[] = [];
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json?.items)) items = json.items;
      else if (Array.isArray(json?.data)) items = json.data;
      else if (json && typeof json === 'object') items = [json];

      const mapped: Company[] = items
        .filter((it: any) => it && typeof it === 'object')
        .map((it: any) => ({
          id: String(it.id ?? it.ID ?? it.companyId ?? `comp-${Date.now()}-${Math.random()}`),
          name: String(it.name ?? it.companyName ?? 'Unnamed Company'),
          ownerId: String(it.createdBy ?? it.ownerId ?? it.owner ?? 'unknown'),
          createdAt: String(it.createdAt ?? it.timestamp ?? it.created ?? new Date().toISOString()),
        }));

      return { success: true, data: mapped };
    } catch (e: any) {
      clearTimeout(timeoutId);
      let msg = 'Unknown error';
      if (e?.name === 'AbortError') msg = 'Request timeout (15 seconds)';
      else if (e?.message?.includes('Failed to fetch')) msg = 'Network connection failed';
      else if (e?.message?.includes('CORS')) msg = 'CORS policy error';
      else if (e?.message) msg = e.message;
      return { success: false, error: msg };
    }
  }

  /* ========================
     DEPARTMENTS
     ======================== */
  private transformDepartmentData(rawData: any): Department {
    if (!rawData || typeof rawData !== 'object') throw new Error('Invalid department data: not an object');
    if (!rawData.name || typeof rawData.name !== 'string') throw new Error('Invalid department data: missing name');

    let departmentId = rawData.id || rawData.ID || rawData.departmentId;
    if (!departmentId) {
      const nameSlug = rawData.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 20);
      departmentId = `dept-${nameSlug}-${Date.now()}`;
    }

    let processedCompanyIds: string[] = [];
    if (Array.isArray(rawData.companyIds)) {
      processedCompanyIds = rawData.companyIds
        .map((id: any) => String(id).trim())
        .filter((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    }

    return {
      id: String(departmentId),
      name: String(rawData.name).trim(),
      companyIds: processedCompanyIds,
      timestamp: String(rawData.timestamp || rawData.createdAt || new Date().toISOString()),
    };
  }

  async createDepartment(payload: { name: string; companyIds: string[] }): Promise<APIResponse<any>> {
    const endpoint = 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment';
    try {
      const response = await fetch(endpoint, this.withStdHeaders({
        method: 'POST',
        body: JSON.stringify(payload),
      }));
      const text = await response.text();
      if (!response.ok) return { success: false, error: text, status: response.status, endpoint };
      let data: any; try { data = JSON.parse(text); } catch { data = text; }
      return { success: true, data, status: response.status, endpoint };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Unknown error', endpoint };
    }
  }

  async getDepartments(): Promise<APIResponse<Department[]>> {
    const endpoint = 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, this.withStdHeaders({ method: 'GET', signal: controller.signal as any }));
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `GET ${endpoint} failed with ${response.status}: ${response.statusText}`, status: response.status, endpoint };
      }

      const json = await response.json();
      let items: any[] = [];
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json?.items)) items = json.items;
      else if (Array.isArray(json?.data)) items = json.data;
      else if (json && typeof json === 'object') items = [json];

      const mapped: Department[] = items
        .filter((it: any) => it && typeof it === 'object')
        .map((it: any) => {
          try { return this.transformDepartmentData(it); }
          catch {
            if (it.name && Array.isArray(it.companyIds)) {
              return {
                id: `dept-fallback-${it.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                name: String(it.name).trim(),
                companyIds: it.companyIds.filter((id: any) => typeof id === 'string' && id.trim()).map((id: any) => String(id).trim()),
                timestamp: new Date().toISOString(),
              };
            }
            return null as any;
          }
        })
        .filter(Boolean);

      return { success: true, data: mapped, endpoint };
    } catch (e: any) {
      clearTimeout(timeoutId);
      let msg = 'Unknown error';
      if (e?.name === 'AbortError') msg = 'Request timeout (15 seconds)';
      else if (e?.message?.includes('Failed to fetch')) msg = 'Network connection failed';
      else if (e?.message?.includes('CORS')) msg = 'CORS policy error';
      else if (e?.message) msg = e.message;
      return { success: false, error: msg, endpoint };
    }
  }

  async updateDepartment(payload: {
    id: string; name?: string; companyIds?: string[]; timestamp?: string; latest?: boolean;
  }): Promise<APIResponse<any>> {
    const { id, name, companyIds, timestamp } = payload;
    const useLatest = payload.latest ?? !timestamp;
    if (!id) return { success: false, error: 'Missing department id for update' };

    const base = `https://7jl08vlogd.execute-api.ap-south-1.amazonaws.com/prod/Edit-Department/${encodeURIComponent(id)}`;
    const qs = new URLSearchParams();
    if (useLatest && !timestamp) qs.set('latest', '1');
    const endpoint = qs.toString() ? `${base}?${qs}` : base;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(endpoint, this.withStdHeaders({
        method: timestamp ? 'PUT' : 'PATCH',
        body: JSON.stringify({
          ...(name !== undefined ? { name } : {}),
          ...(Array.isArray(companyIds) ? { companyIds } : {}),
          ...(timestamp ? { timestamp } : {}),
        }),
        signal: controller.signal as any,
      }));
      clearTimeout(timeoutId);

      const text = await res.text();
      const data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();

      if (!res.ok) {
        return { success: false, status: res.status, error: data?.error || data?.message || text || `Request failed with ${res.status}`, endpoint };
      }
      return { success: true, data, status: res.status, endpoint };
    } catch (e: any) {
      clearTimeout(timeoutId);
      return { success: false, error: e?.name === 'AbortError' ? 'Request timeout (15s)' : e?.message || 'Unknown error' };
    }
  }

  async deleteDepartment(id: string, timestamp: string) {
    const endpoint = `https://8eir95tylc.execute-api.ap-south-1.amazonaws.com/prod/delete-department/${encodeURIComponent(id)}?timestamp=${encodeURIComponent(timestamp)}`;
    const res = await fetch(endpoint, this.withStdHeaders({ method: 'DELETE' }));
    if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
    if (res.status === 204) return { message: 'Department deleted successfully', id };
    return res.json();
  }

  /* ========================
     ROLES 
     ======================== */

  // Create Role (POST to Create-Roles endpoint)
  async createRole(payload: RoleCreatePayload): Promise<APIResponse<CustomRole>> {
    const fullPayload = { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return this.roleRequest<CustomRole>(this.roleEndpoints.create, { method: 'POST', body: JSON.stringify(fullPayload) });
  }

  // List Roles (GET from Get-Roles endpoint)
  async getRoles(): Promise<APIResponse<CustomRole[]>> {
    const res = await this.roleRequest<any>(this.roleEndpoints.get, { method: 'GET' });
    if (!res.success || !res.data) return res as APIResponse<CustomRole[]>;

    const data = res.data as any;
    let roles: any[] = [];
    if (Array.isArray(data)) roles = data;
    else if (Array.isArray(data?.roles)) roles = data.roles;        // your GET lambda returns { roles, nextCursor }
    else if (Array.isArray(data?.items)) roles = data.items;
    else if (Array.isArray(data?.data)) roles = data.data;
    else if (data?.role) roles = [data.role];

    const normalized: CustomRole[] = roles.map((r: any) => ({
      id: r.id ?? `role-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: r.name ?? 'Unnamed Role',
      description: r.description ?? 'No description provided',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      color: r.color ?? 'indigo',
      bgColor: r.bgColor ?? 'bg-indigo-500',
      createdAt: r.createdAt ?? r.timestamp ?? new Date().toISOString(),
      createdBy: r.createdBy ?? 'system',
      updatedAt: r.updatedAt ?? r.timestamp ?? r.createdAt ?? new Date().toISOString(),
    }));

    return { ...res, data: normalized };
  }

  // Get Role by id (GET from Get-Roles endpoint with id parameter)
  async getRoleById(id: string): Promise<APIResponse<CustomRole>> {
    const res = await this.roleRequest<any>(`${this.roleEndpoints.get}?id=${encodeURIComponent(id)}`, { method: 'GET' });
    if (!res.success || !res.data) return res as APIResponse<CustomRole>;
    const role = (res.data as any).role ?? res.data;
    const normalized: CustomRole = {
      id: role.id,
      name: role.name ?? 'Unnamed Role',
      description: role.description ?? 'No description provided',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      color: role.color ?? 'indigo',
      bgColor: role.bgColor ?? 'bg-indigo-500',
      createdAt: role.createdAt ?? role.timestamp ?? new Date().toISOString(),
      createdBy: role.createdBy ?? 'system',
      updatedAt: role.updatedAt ?? role.timestamp ?? role.createdAt ?? new Date().toISOString(),
    };
    return { ...res, data: normalized };
  }

  // Update Role (PUT to Edit-Roles endpoint)
  async updateRole(payload: RoleUpdatePayload): Promise<APIResponse<CustomRole>> {
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
    
    // Construct the endpoint with the role ID
    const endpoint = `${this.roleEndpoints.edit}/${encodeURIComponent(payload.id)}`;
      
    console.log(`[DEBUG] updateRole - Endpoint: ${endpoint}`);
    console.log(`[DEBUG] updateRole - Payload:`, fullPayload);
    return this.roleRequest<CustomRole>(endpoint, { method: 'PUT', body: JSON.stringify(fullPayload) });
  }

  // Delete Role (DELETE to Delete-Roles endpoint)
  async deleteRole(roleId: string): Promise<APIResponse<any>> {
    const endpoint = `${this.roleEndpoints.delete}?id=${encodeURIComponent(roleId)}`;
    const res = await this.roleRequest<any>(endpoint, { method: 'DELETE' });
    if (res.success && (res.status === 204 || res.status === 200)) {
      return { ...res, data: { message: 'Role deleted successfully', id: roleId } };
    }
    return res;
  }
}

export const apiService = new APIService();