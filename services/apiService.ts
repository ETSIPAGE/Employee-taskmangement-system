// api/APIService.ts
import { Company, Department } from '../types';

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
  private endpoints = ['/prod/companies'];

  async createCompany(payload: CompanyCreatePayload): Promise<APIResponse<CompanyCreateResponse>> {
    const allEndpoints = [
      '/api/companies',
      ...this.endpoints.map(endpoint => `${this.baseUrl}${endpoint}`)
    ];

    for (const endpoint of allEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          return { success: true, data: result, endpoint };
        } else {
          const errorText = await response.text();
          continue;
        }
      } catch (error) {
        continue;
      }
    }

    return {
      success: false,
      error: 'All API endpoints failed'
    };
  }

  async testAPI(): Promise<APIResponse<CompanyCreateResponse>> {
    const testPayload: CompanyCreatePayload = {
      name: 'Test Company',
      createdBy: 'TEST-USER'
    };

    return this.createCompany(testPayload);
  }

  async getCompanies(): Promise<APIResponse<Company[]>> {
    try {
      const externalUrl = 'https://zywixma6cf.execute-api.ap-south-1.amazonaws.com/prod/';
      const response = await fetch(externalUrl, { method: 'GET' });
      if (!response.ok) {
        return {
          success: false,
          error: `GET ${externalUrl} failed with ${response.status}`,
          status: response.status
        };
      }

      const json = await response.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped: Company[] = items.map((it: any) => ({
        id: String(it.id ?? it.ID ?? Date.now()),
        name: String(it.name ?? 'Unnamed Company'),
        ownerId: String(it.createdBy ?? 'unknown'),
        createdAt: String(it.createdAt ?? it.timestamp ?? new Date().toISOString()),
      }));
      return { success: true, data: mapped };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }
  }

  async createDepartment(payload: { name: string; companyIds: string[] }): Promise<APIResponse<any>> {
    const endpoint = 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      if (!response.ok) {
        return { success: false, error: text, status: response.status, endpoint };
      }
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { success: true, data, status: response.status, endpoint };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        endpoint
      };
    }
  }

  async getDepartments(): Promise<APIResponse<Department[]>> {
    const endpoint = 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/';
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        return {
          success: false,
          error: `GET ${endpoint} failed with ${response.status}`,
          status: response.status,
          endpoint
        };
      }
  
      const json = await response.json();
      const items = Array.isArray(json?.items) ? json.items : [];
  
      const mapped: Department[] = items.map((it: any) => ({
        id: String(it.id ?? it.ID ?? Date.now()),
        name: String(it.name ?? 'Unnamed Department'),
        companyIds: Array.isArray(it.companyIds) ? it.companyIds.map((c: any) => String(c)) : [],
        timestamp: String(it.timestamp ?? it.createdAt ?? new Date().toISOString()), // ✅ added
      }));

      //weewweewew
  
      return { success: true, data: mapped, endpoint };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        endpoint
      };
    }
  }
  

  /**
   * ✅ Updated REST-based department updater using /departments/{id}
   */
  async updateDepartment(payload: {
    id: string;
    name?: string;
    companyIds?: string[];
    timestamp?: string;   // exact ISO string if you want a specific version
    latest?: boolean;     // set true to target the most recent version
  }): Promise<APIResponse<any>> {
    const { id, name, companyIds, timestamp } = payload;
    const latest = payload.latest ?? (!timestamp); // default to latest when timestamp is missing
  
    // --- guard rails ---
    if (!id || !id.trim()) {
      return { success: false, error: "Department id is required", endpoint: "" };
    }
    if (typeof name === "undefined" && typeof companyIds === "undefined") {
      return { success: false, error: "Provide at least one field to update (name or companyIds)", endpoint: "" };
    }
  
    // --- build endpoint with query params ---
    const qs = new URLSearchParams();
    if (timestamp) qs.set("timestamp", timestamp);
    else if (latest) qs.set("latest", "1");
  
    const endpoint =
      `${this.departmentBase}/${encodeURIComponent(id)}` +
      (qs.toString() ? `?${qs.toString()}` : "");
  
    // --- request body (include fields + compatibility flags) ---
    const body: Record<string, any> = {};
    if (typeof name !== "undefined") body.name = name;
    if (Array.isArray(companyIds)) body.companyIds = companyIds;
  
    // include these in body as well for older/newer Lambdas
    if (timestamp) body.timestamp = timestamp;
    else if (latest) body.latest = true;
  
    try {
      const response = await fetch(endpoint, {
        method: "PATCH", // your REST method
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const text = await response.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
  
      if (!response.ok) {
        // surface server-provided error message
        const serverMsg = typeof parsed === "object" ? JSON.stringify(parsed) : text;
        return { success: false, error: serverMsg, status: response.status, endpoint };
      }
  
      return { success: true, data: parsed, status: response.status, endpoint };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
        endpoint
      };
    }
  }
  

  async deleteDepartment(id: string, timestamp: string) {
    const endpoint = `https://8eir95tylc.execute-api.ap-south-1.amazonaws.com/prod/delete-department/${encodeURIComponent(
      id
    )}?timestamp=${encodeURIComponent(timestamp)}`;
  
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization header if your API requires it
        },
      });
  
      if (!response.ok) {
        throw new Error(`DELETE failed: ${response.status}`);
      }
  
      // Some APIs return 204 No Content on delete
      if (response.status === 204) {
        return { message: "Department deleted successfully", id };
      }
  
      const json = await response.json();
      return json;
    } catch (error) {
      console.error("Error deleting department:", error);
      throw error;
    }
  }
  
  
}

export const apiService = new APIService();
