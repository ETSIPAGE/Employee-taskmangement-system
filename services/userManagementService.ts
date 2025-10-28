import { User, UserRole } from '../types';
import { getToken } from './authService';
import * as DataService from './dataService';

const EMPLOYEE_CREATE_API_URL = 'https://kdu0cswd65.execute-api.ap-south-1.amazonaws.com/prod/employee';

const buildHeaders = (includeJson = true): Headers => {
  const headers = new Headers();
  if (includeJson) headers.set('Content-Type', 'application/json');
  try {
    const t = getToken?.();
    if (t) headers.set('Authorization', t.startsWith('Bearer ') ? t : `Bearer ${t}`);
  } catch {}
  try {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ets_api_key') : undefined;
    if (apiKey) headers.set('x-api-key', apiKey);
  } catch {}
  return headers;
};

// Local mapper mirroring DataService mapping to keep UI consistent
const mapApiUserToUser = (apiUser: any): User => {
  const id = String(apiUser?.id || apiUser?.userId || apiUser?.pk || apiUser?.PK || `user-${Date.now()}`);
  const email: string = String(apiUser?.email || apiUser?.mail || apiUser?.userEmail || '').trim();
  const derivedNameFromEmail = email ? email.split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'New User';
  const name: string = String(apiUser?.name || apiUser?.fullName || apiUser?.username || derivedNameFromEmail).trim();
  const roleString = (apiUser?.role || apiUser?.userRole || 'employee');
  let role: UserRole;
  if (String(roleString).toUpperCase() === 'HR') role = UserRole.HR;
  else role = (String(roleString).charAt(0).toUpperCase() + String(roleString).slice(1).toLowerCase()) as UserRole;
  if (!Object.values(UserRole).includes(role)) role = UserRole.EMPLOYEE;
  const companyId = String(apiUser?.companyId || apiUser?.company_id || apiUser?.organizationId || 'comp-1').toLowerCase().trim();
  const departmentIds = Array.isArray(apiUser?.departmentIds) ? apiUser.departmentIds.map((d: any) => String(d)) : [];
  return {
    id,
    name,
    email,
    role,
    companyId,
    managerId: apiUser?.managerId || (Array.isArray(apiUser?.managerIds) && apiUser.managerIds.length > 0 ? apiUser.managerIds[0] : undefined),
    departmentIds,
    jobTitle: apiUser?.jobTitle || apiUser?.title || apiUser?.position,
    status: apiUser?.status || 'Offline',
    joinedDate: apiUser?.joinedDate || new Date().toISOString(),
    skills: apiUser?.skills || [],
    stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' },
    rating: apiUser?.rating,
    personalDetails: apiUser?.personalDetails,
    contactNumber: apiUser?.contactNumber,
    address: apiUser?.address,
    familyMembers: apiUser?.familyMembers,
    education: apiUser?.education,
    compensation: apiUser?.compensation,
    documents: apiUser?.documents,
  };
};

const parseApiResponse = async (response: Response) => {
  const raw = await response.text();
  if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText} - ${raw}`);
  if (!raw) return null;
  try {
    const outer = JSON.parse(raw);
    if (outer && typeof outer.body === 'string') {
      try { return JSON.parse(outer.body); } catch { return outer.body; }
    }
    return outer;
  } catch {
    return { body: raw } as any;
  }
};

export const createEmployee = async (payload: {
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  departmentIds?: string[];
  managerIds?: string[];
}): Promise<User> => {
  const body: any = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    companyId: payload.companyId,
    departmentIds: payload.departmentIds || [],
    managerIds: payload.managerIds || [],
  };

  const response = await fetch(EMPLOYEE_CREATE_API_URL, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
    mode: 'cors',
  });

  const data = await parseApiResponse(response);
  const created = (data && (data.user || data.User || data.Item || data.item)) || data;
  return mapApiUserToUser(created);
};

export const updateEmployee = async (
  userId: string,
  updates: Partial<Pick<User, 'name' | 'role' | 'departmentIds' | 'companyId' | 'rating'> & { managerIds?: string[]; managerId?: string }>
): Promise<User> => {
  const updated = await DataService.updateUser(userId, updates);
  // Ensure consumers get fresh data next calls
  DataService.invalidateUsersCache();
  return updated;
};
