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

  /**
   * 🔧 Enhanced helper function to transform department data structures
   * Handles: {"name":"ds compain","companyIds":[...],"latest":true}
   */
  private transformDepartmentData(rawData: any): Department {
    console.log('🔧 Transforming department data:', rawData);
    
    // Validate required fields according to project specifications
    if (!rawData || typeof rawData !== 'object') {
      console.error('❌ Invalid department data: not an object:', rawData);
      throw new Error('Invalid department data: not an object');
    }
    
    if (!rawData.name || typeof rawData.name !== 'string') {
      console.error('❌ Invalid department data: missing or invalid name field:', rawData);
      throw new Error('Invalid department data: missing or invalid name field');
    }
    
    // Enhanced ID generation for missing IDs (handles your specific case)
    let departmentId = rawData.id || rawData.ID || rawData.departmentId;
    if (!departmentId) {
      const nameSlug = rawData.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars  
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .substring(0, 20); // Limit length
      departmentId = `dept-${nameSlug}-${Date.now()}`;
      console.warn('⚠️ Generated department ID for missing ID:', departmentId);
    }
    
    // Enhanced validation for companyIds array
    let processedCompanyIds: string[] = [];
    if (Array.isArray(rawData.companyIds)) {
      processedCompanyIds = rawData.companyIds
        .map((id: any) => String(id).trim())
        .filter((id: string) => {
          // Validate UUID format
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          if (!isValidUUID) {
            console.warn('⚠️ Invalid UUID format for company ID:', id);
          }
          return isValidUUID && id.length > 0;
        });
      console.log('📋 Processed company IDs:', processedCompanyIds.length, 'valid out of', rawData.companyIds.length);
    } else {
      console.warn('⚠️ companyIds is not an array or missing:', rawData.companyIds);
    }
    
    const transformed: Department = {
      id: String(departmentId),
      name: String(rawData.name).trim(),
      companyIds: processedCompanyIds,
      timestamp: String(rawData.timestamp || rawData.createdAt || new Date().toISOString())
    };
    
    console.log('✅ Successfully transformed department:', {
      originalName: rawData.name,
      transformedId: transformed.id,
      companyCount: transformed.companyIds.length,
      hasTimestamp: !!transformed.timestamp
    });
    
    return transformed;
  }

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
    const externalUrl = 'https://zywixma6cf.execute-api.ap-south-1.amazonaws.com/prod/';
    
    // Enhanced error handling with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      console.log('🔍 Fetching companies from:', externalUrl);
      
      const response = await fetch(externalUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Company API failed:', response.status, response.statusText);
        return {
          success: false,
          error: `GET ${externalUrl} failed with ${response.status}: ${response.statusText}`,
          status: response.status
        };
      }

      const json = await response.json();
      console.log('📥 Raw company response:', json);
      
      // Handle different response formats
      let items: any[] = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (Array.isArray(json?.items)) {
        items = json.items;
      } else if (Array.isArray(json?.data)) {
        items = json.data;
      } else if (json && typeof json === 'object') {
        // Single company object
        items = [json];
      }
      
      console.log('📋 Extracted items:', items);
      
      // Validate and map items to Company interface
      const mapped: Company[] = items
        .filter((it: any) => it && typeof it === 'object') // Filter out invalid items
        .map((it: any) => {
          const company: Company = {
            id: String(it.id ?? it.ID ?? it.companyId ?? `comp-${Date.now()}-${Math.random()}`),
            name: String(it.name ?? it.companyName ?? 'Unnamed Company'),
            ownerId: String(it.createdBy ?? it.ownerId ?? it.owner ?? 'unknown'),
            createdAt: String(it.createdAt ?? it.timestamp ?? it.created ?? new Date().toISOString()),
          };
          
          console.log('🏢 Mapped company:', company);
          return company;
        });
        
      console.log('✅ Final mapped companies:', mapped);
      return { success: true, data: mapped };
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('💥 Error in getCompanies:', e);
      
      let errorMessage = 'Unknown error';
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          errorMessage = 'Request timeout (15 seconds) - API server may be slow or unavailable';
        } else if (e.message.includes('Failed to fetch')) {
          errorMessage = 'Network connection failed - check internet connectivity and API endpoint';
        } else if (e.message.includes('CORS')) {
          errorMessage = 'CORS policy error - API server configuration issue';
        } else {
          errorMessage = e.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
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
    
    // Enhanced error handling with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      console.log('🔍 Fetching departments from:', endpoint);
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Department API failed:', response.status, response.statusText);
        return {
          success: false,
          error: `GET ${endpoint} failed with ${response.status}: ${response.statusText}`,
          status: response.status,
          endpoint
        };
      }
  
      const json = await response.json();
      console.log('📥 Raw department response:', json);
      
      // Handle different response formats
      let items: any[] = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (Array.isArray(json?.items)) {
        items = json.items;
      } else if (Array.isArray(json?.data)) {
        items = json.data;
      } else if (json && typeof json === 'object') {
        // Single department object
        items = [json];
      }
      
      console.log('📋 Extracted department items:', items);
  
      const mapped: Department[] = items
        .filter((it: any) => it && typeof it === 'object') // Filter out invalid items
        .map((it: any) => {
          try {
            return this.transformDepartmentData(it);
          } catch (error) {
            console.error('❌ Failed to transform department data:', it, 'Error:', error);
            
            // Enhanced fallback for your specific data structure
            if (it.name && Array.isArray(it.companyIds)) {
              console.log('🔄 Attempting enhanced fallback transformation for:', it.name);
              
              const fallback: Department = {
                id: `dept-fallback-${it.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: String(it.name).trim(),
                companyIds: it.companyIds
                  .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
                  .map((id: any) => String(id).trim()),
                timestamp: new Date().toISOString()
              };
              
              console.log('✅ Fallback transformation successful:', fallback);
              return fallback;
            }
            
            console.error('💥 Complete transformation failure - skipping item:', it);
            return null;
          }
        })
        .filter((dept): dept is Department => dept !== null); // Remove null entries

      console.log('✅ Final mapped departments:', mapped);
      return { success: true, data: mapped, endpoint };
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('💥 Error in getDepartments:', e);
      
      let errorMessage = 'Unknown error';
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          errorMessage = 'Request timeout (15 seconds) - API server may be slow or unavailable';
        } else if (e.message.includes('Failed to fetch')) {
          errorMessage = 'Network connection failed - check internet connectivity and API endpoint';
        } else if (e.message.includes('CORS')) {
          errorMessage = 'CORS policy error - API server configuration issue';
        } else {
          errorMessage = e.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        endpoint
      };
    }
  }
  


  /**
 * ✅ Update department using your specific API endpoint
 * Endpoint: https://7jl08vlogd.execute-api.ap-south-1.amazonaws.com/prod/Edit-Department/{id}?latest=1
 * or       https://7jl08vlogd.execute-api.ap-south-1.amazonaws.com/prod/Edit-Department/{id}  (with body.timestamp)
 */
async updateDepartment(payload: {
  id: string;
  name?: string;
  companyIds?: string[];
  timestamp?: string;   // if provided, targets that exact version
  latest?: boolean;     // if true (or no timestamp), will use ?latest=1
}): Promise<APIResponse<any>> {
  const { id, name, companyIds, timestamp } = payload;
  const useLatest = payload.latest ?? !timestamp;

  if (!id) {
    return { success: false, error: 'Missing department id for update' };
  }

  // ⚠️ Make sure the path casing matches your API Gateway route
  const base = `https://7jl08vlogd.execute-api.ap-south-1.amazonaws.com/prod/Edit-Department/${encodeURIComponent(id)}`;

  const qs = new URLSearchParams();
  if (useLatest && !timestamp) qs.set("latest", "1"); // backend expects query param, not body

  const endpoint = qs.toString() ? `${base}?${qs}` : base;

  // Only send fields you actually want to update
  const body: Record<string, any> = {};
  if (typeof name !== 'undefined') body.name = name;
  if (Array.isArray(companyIds)) body.companyIds = companyIds;
  if (timestamp) body.timestamp = timestamp; // exact version update

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: timestamp ? 'PUT' : 'PATCH',  // PUT for exact version, PATCH for latest (both supported by your Lambda)
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Do NOT add Access-Control-Allow-* headers here (server must return those)
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      mode: 'cors',
    });

    clearTimeout(timeoutId);

    const text = await res.text();
    const data = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data?.error || data?.message || text || `Request failed with ${res.status}`,
        endpoint,
      };
    }

    return { success: true, data, status: res.status, endpoint };
  } catch (e) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: e instanceof Error
        ? (e.name === 'AbortError'
            ? 'Request timeout (15s)'
            : e.message)
        : 'Unknown error',
    };
  }
}


  
  

  /**
   * 🧪 Test department API connectivity
   */
  async testDepartmentAPI(): Promise<APIResponse<any>> {
    console.log('🧪 Testing department API connectivity...');
    console.log('🎯 Department base URL:', this.departmentBase);
    
    // First, test if the base endpoint is reachable
    try {
      const testEndpoint = this.departmentBase.replace('/departments', '') + '/health';
      console.log('🚑 Testing health endpoint:', testEndpoint);
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      console.log('📨 Health check response:', response.status, response.statusText);
      
      if (response.ok) {
        return {
          success: true,
          data: { message: 'Department API is reachable', status: response.status },
          endpoint: testEndpoint
        };
      } else {
        return {
          success: false,
          error: `Health check failed: ${response.status} ${response.statusText}`,
          endpoint: testEndpoint
        };
      }
    } catch (e) {
      console.error('💥 Health check failed:', e);
      return {
        success: false,
        error: `Health check error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        endpoint: this.departmentBase
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
