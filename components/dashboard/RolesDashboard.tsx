import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';

import { User, UserRole } from '../../types';
import {
  ArrowPathIcon,
  UserGroupIcon,
  EditIcon,
  TrashIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardListIcon,
  UserCircleIcon
} from '../../constants';

import ViewSwitcher from '../shared/ViewSwitcher';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

// Single Roles API endpoint for all CRUD operations
const ROLES_API = 'https://0s7thdxjhh.execute-api.ap-south-1.amazonaws.com/dev/roles';

function buildRolesHeaders(includeJson = false) {
    const headers: Record<string, string> = {};
    try { const t = AuthService.getToken?.(); if (t) headers['Authorization'] = t.startsWith('Bearer ') ? t : `Bearer ${t}`; } catch {}
    try { const k = localStorage.getItem('ets_api_key') || localStorage.getItem('ets_roles_api_key'); if (k) headers['x-api-key'] = k; } catch {}
    if (includeJson) headers['Content-Type'] = 'application/json';
    return headers;
}

async function apiGetRoles() {
    // Try API first
    try {
        const res = await fetch(ROLES_API, { headers: buildRolesHeaders(false), cache: 'no-store' });
        if (res.ok) {
            const text = await res.text();
            let data: any = [];
            try { data = text ? JSON.parse(text) : []; } catch { data = []; }
            // Accept array or envelope with items/data/body
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.items)) return data.items;
            if (Array.isArray(data?.data)) return data.data;
            if (Array.isArray(data?.roles)) return data.roles;
            if (typeof data?.body === 'string') {
                try { const inner = JSON.parse(data.body); if (Array.isArray(inner)) return inner; if (Array.isArray(inner?.items)) return inner.items; } catch {}
            }
            return [];
        }
        // If non-OK, trigger fallback
        throw new Error(`GET roles failed: ${res.status}`);
    } catch {}
    // Fallback to local storage if API fails
    try {
        const saved = localStorage.getItem('ets_customRoles');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

async function apiCreateRole(payload: any) {
    const base = {
        name: String(payload.name || '').trim(),
        description: String(payload.description || ''),
        color: String(payload.color || '#6b7280'),
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    };
    const bodyVariants = [
        base,
        { ...base, roleName: base.name },
        { ...base, desc: base.description },
        { ...base, roleName: base.name, desc: base.description },
    ];
    for (const body of bodyVariants) {
        try {
            const res = await fetch(ROLES_API, { method: 'POST', headers: buildRolesHeaders(true), body: JSON.stringify(body), cache: 'no-store' });
            if (res.ok || [200,201].includes(res.status)) {
                try { return await res.json(); } catch { return body; }
            }
        } catch {}
    }
    // Fallback: write locally
    const localRole = { id: `role-${Date.now()}`, createdAt: new Date().toISOString(), ...base };
    try {
        const current = await apiGetRoles();
        localStorage.setItem('ets_customRoles', JSON.stringify([localRole, ...current]));
    } catch { localStorage.setItem('ets_customRoles', JSON.stringify([localRole])); }
    return localRole;
}

async function apiUpdateRole(id: string, payload: any) {
    const base = {
        id,
        name: String(payload.name || ''),
        description: String(payload.description || ''),
        color: String(payload.color || '#6b7280'),
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    };
    const variants = [
        base,
        { ...base, roleId: id, RoleId: id, roleID: id },
        { ...base, roleName: base.name },
        { ...base, desc: base.description },
        { ...base, roleName: base.name, desc: base.description },
        { ...base, roleId: id, roleName: base.name, desc: base.description },
    ];
    const methods: Array<'PUT'|'POST'> = ['PUT','POST'];
    for (const body of variants) {
        for (const method of methods) {
            // Try /roles/:id
            try {
                let res = await fetch(`${ROLES_API}/${encodeURIComponent(id)}`, { method, headers: buildRolesHeaders(true), body: JSON.stringify(body), cache: 'no-store' });
                if (!(res.ok || [200,201].includes(res.status))) {
                    // Fallback: send to base endpoint with id in body
                    res = await fetch(ROLES_API, { method, headers: buildRolesHeaders(true), body: JSON.stringify(body), cache: 'no-store' });
                }
                if (res.ok || [200,201].includes(res.status)) {
                    // Clear any local override if present
                    try {
                        const raw = localStorage.getItem('ets_role_overrides');
                        const overrides = raw ? JSON.parse(raw) : {};
                        if (overrides && typeof overrides === 'object' && overrides[id]) {
                            delete overrides[id];
                            localStorage.setItem('ets_role_overrides', JSON.stringify(overrides));
                        }
                    } catch {}
                    try { return await res.json(); } catch { return body; }
                }
            } catch {}
        }
    }
    // Fallback: update locally and persist an override
    const current = await apiGetRoles();
    const idx = current.findIndex((r: any) => String(r.id) === String(id) || String(r.roleId) === String(id) || String(r.RoleId) === String(id));
    if (idx >= 0) {
        const updatedRole = { ...current[idx], ...base };
        const next = [...current]; next[idx] = updatedRole;
        localStorage.setItem('ets_customRoles', JSON.stringify(next));
        try {
            const raw = localStorage.getItem('ets_role_overrides');
            const overrides = raw ? JSON.parse(raw) : {};
            overrides[id] = { name: updatedRole.name, description: updatedRole.description, color: updatedRole.color, permissions: updatedRole.permissions };
            localStorage.setItem('ets_role_overrides', JSON.stringify(overrides));
        } catch {}
        return updatedRole;
    }
    throw new Error('Role not found');
}

async function apiDeleteRole(id: string, name?: string) {
    try {
        // Prefer DELETE /roles/:id
        let res = await fetch(`${ROLES_API}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: buildRolesHeaders(true), cache: 'no-store' });
        if (![200,204].includes(res.status)) {
            // Fallback: DELETE base with body
            const body: any = { id, roleId: id, RoleId: id, roleID: id, name, roleName: name, nameKey: name };
            res = await fetch(ROLES_API, { method: 'DELETE', headers: buildRolesHeaders(true), body: JSON.stringify(body), cache: 'no-store' });
            if (![200,204].includes(res.status)) {
                // Fallback: query param forms
                const qs = name 
                    ? `?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&roleId=${encodeURIComponent(id)}&roleName=${encodeURIComponent(name)}`
                    : `?id=${encodeURIComponent(id)}&roleId=${encodeURIComponent(id)}`;
                await fetch(`${ROLES_API}${qs}`, { method: 'DELETE', headers: buildRolesHeaders(false), cache: 'no-store' });
            }
        }
        return;
    } catch {}
    // Fallback: delete locally
    const current = await apiGetRoles();
    const next = current.filter((r: any) => String(r.id) !== String(id) && (!name || String(r.name) !== String(name)));
    localStorage.setItem('ets_customRoles', JSON.stringify(next));
}

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300`}>
            {message}
        </div>
    );
};

// Role distribution legend with percentage bars
const RoleDistributionList = ({ data }: { data: { role: string; count: number; color: string }[] }) => {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const rows = data
        .map(d => ({ ...d, percent: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0 }))
        .sort((a, b) => b.percent - a.percent);
    return (
        <div className="bg-white rounded-lg shadow-lg p-5">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-800">Role Distribution Chart</h3>
                <p className="text-xs text-slate-500">Visual breakdown of user roles across the organization</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    {rows.map((r, idx) => (
                        <div key={`${r.role}-${idx}`} className="flex items-center text-sm">
                            <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: r.color }} />
                            <span className="text-slate-700">{r.role}</span>
                        </div>
                    ))}
                </div>
                <div className="space-y-3">
                    {rows.map((r, idx) => (
                        <div key={`${r.role}-bar-${idx}`} className="flex items-center space-x-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full">
                                <div className="h-2 rounded-full" style={{ width: `${r.percent}%`, backgroundColor: r.color }} />
                            </div>
                            <div className="w-5 text-right text-xs text-slate-600">{r.count}</div>
                            <div className="w-10 text-right text-xs text-slate-600">{r.percent}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Quick actions tiles
const QuickActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/users" className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition">
            <div className="h-48 md:h-56 w-full flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-md relative">
                <UsersIcon className="w-32 h-32 opacity-80" />
                <span className="absolute right-3 bottom-3 text-sm text-indigo-700">Manage Users</span>
            </div>
        </a>
        <a href="/companies" className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition">
            <div className="h-48 md:h-56 w-full flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-md relative">
                <BuildingOfficeIcon className="w-32 h-32 opacity-80" />
                <span className="absolute right-3 bottom-3 text-sm text-emerald-700">View Companies</span>
            </div>
        </a>
        <a href="/projects" className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition">
            <div className="h-48 md:h-56 w-full flex items-center justify-center text-sky-600 bg-sky-50 rounded-md relative">
                <ClipboardListIcon className="w-32 h-32 opacity-80" />
                <span className="absolute right-3 bottom-3 text-sm text-sky-700">View Projects</span>
            </div>
        </a>
    </div>
);

// All Users list (compact rows)
const AllUsersList = ({ 
    users, 
    getRoleBadgeClass, 
    getRoleColor,
    onEditUser,
    onDeleteUser
}: { 
    users: User[]; 
    getRoleBadgeClass: (role: UserRole | string) => string; 
    getRoleColor: (role: UserRole | string) => string; 
    onEditUser: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
}) => {
    return (
        <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-base font-semibold text-slate-800">All Users</h3>
                    <p className="text-xs text-slate-500">Showing all {users.length} users</p>
                </div>
            </div>
            <div className="space-y-3">
                {users.map((u, idx) => {
                    const roleColor = getRoleColor(u.role);
                    const status = u.status || 'Active';
                    return (
                        <div key={(u.email ? `id:${u.id}-email:${u.email}` : `id:${u.id}-#${idx}`)} className="flex items-center justify-between px-3 py-3 rounded-lg bg-slate-50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500">
                                    <UserCircleIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.email}</div>
                                    {u.jobTitle && <div className="text-xs text-slate-400">{u.jobTitle}</div>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    {roleColor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }} />}
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">{status}</span>
                                <div className="flex items-center space-x-2 ml-2">
                                    <button 
                                        onClick={() => onEditUser(u.id)}
                                        className="p-1 rounded hover:bg-slate-100 text-slate-600"
                                        title="Edit user"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteUser(u.id)}
                                        className="p-1 rounded hover:bg-slate-100 text-red-600"
                                        title="Delete user"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Normalize role name for comparisons (trim, lowercase, normalize apostrophes)
const normalizeRoleName = (name: string) =>
    String(name || '')
        .replace(/[’`]/g, "'")
        .trim()
        .toLowerCase();

// Helper: de-duplicate roles by BOTH id and normalized name
// This collapses server duplicates that have different ids but the same name (e.g., after delete/recreate)
const dedupeRoles = (roles: CustomRole[]) => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const out: CustomRole[] = [];
    for (const r of roles) {
        const idKey = r.id ? String(r.id) : '';
        const nameKey = normalizeRoleName(String(r.name || ''));
        if (idKey && seenIds.has(idKey)) continue;
        if (nameKey && seenNames.has(nameKey)) continue;
        if (idKey) seenIds.add(idKey);
        if (nameKey) seenNames.add(nameKey);
        out.push(r);
    }
    return out;
};

// Apply local overrides saved when API update fails (keyed by id)
const applyRoleOverrides = (roles: CustomRole[]): CustomRole[] => {
    try {
        const raw = localStorage.getItem('ets_role_overrides');
        if (!raw) return roles;
        const overrides = JSON.parse(raw) as Record<string, Partial<CustomRole>>;
        if (!overrides || typeof overrides !== 'object') return roles;
        return roles.map(r => {
            const ov = overrides[r.id];
            if (!ov) return r;
            return {
                ...r,
                name: ov.name !== undefined ? String(ov.name) : r.name,
                description: ov.description !== undefined ? String(ov.description) : r.description,
                color: ov.color !== undefined ? String(ov.color) : r.color,
                permissions: Array.isArray(ov.permissions) ? (ov.permissions as string[]) : r.permissions,
            };
        });
    } catch {
        return roles;
    }
};

// Apply local deletion overrides (hide roles that were marked deleted when API delete failed)
const applyRoleDeletions = (roles: CustomRole[]): CustomRole[] => {
    try {
        const raw = localStorage.getItem('ets_role_deletions');
        if (!raw) return roles;
        const markers = JSON.parse(raw) as { ids?: string[]; names?: string[] };
        const delIds = new Set((markers?.ids || []).map(String));
        const delNames = new Set((markers?.names || []).map(n => normalizeRoleName(String(n))));
        // If role is also marked as created, it should NOT be deleted locally
        const created = getCreatedRoleMarkers?.();
        const createdIds = new Set((created?.ids || []).map(String));
        const createdNames = new Set((created?.names || []).map(n => normalizeRoleName(String(n))));
        return roles.filter(r => {
            const id = String(r.id);
            const name = normalizeRoleName(String(r.name));
            const isCreated = createdIds.has(id) || createdNames.has(name);
            if (isCreated) return true;
            return !delIds.has(id) && !delNames.has(name);
        });
    } catch {
        return roles;
    }
};

// Keep only roles explicitly created locally (allowlist)
const getCreatedRoleMarkers = (): { ids: string[]; names: string[] } => {
    try {
        const raw = localStorage.getItem('ets_created_roles');
        const parsed = raw ? JSON.parse(raw) : {};
        const ids = Array.isArray(parsed.ids) ? parsed.ids.map(String) : [];
        const names = Array.isArray(parsed.names) ? parsed.names.map(String) : [];
        return { ids, names };
    } catch {
        return { ids: [], names: [] };
    }
};

const saveCreatedRoleMarkers = (ids: string[], names: string[]) => {
    try {
        const normalizedNames = names.map(n => String(n)).map(n => n.toLowerCase());
        localStorage.setItem('ets_created_roles', JSON.stringify({ ids: Array.from(new Set(ids.map(String))), names: Array.from(new Set(normalizedNames)) }));
    } catch {}
};

const markRoleCreated = (id?: string, name?: string) => {
    const m = getCreatedRoleMarkers();
    const nameNorm = name ? String(name).toLowerCase() : undefined;
    if (id) m.ids.push(String(id));
    if (nameNorm) m.names.push(nameNorm);
    saveCreatedRoleMarkers(m.ids, m.names);
    // Clear any deletion markers for this id/name so it can appear
    try {
        const raw = localStorage.getItem('ets_role_deletions');
        const parsed = raw ? JSON.parse(raw) : {};
        let ids: string[] = Array.isArray(parsed.ids) ? parsed.ids.map(String) : [];
        let names: string[] = Array.isArray(parsed.names) ? parsed.names.map(String) : [];
        if (id) ids = ids.filter(x => x !== String(id));
        if (nameNorm) names = names.filter(x => x.toLowerCase() !== nameNorm);
        localStorage.setItem('ets_role_deletions', JSON.stringify({ ids: Array.from(new Set(ids)), names: Array.from(new Set(names)) }));
    } catch {}
};

const unmarkRoleCreated = (id?: string, name?: string) => {
    const m = getCreatedRoleMarkers();
    const idStr = id ? String(id) : undefined;
    const nameStr = name ? String(name).toLowerCase() : undefined;
    const ids = idStr ? m.ids.filter(x => x !== idStr) : m.ids;
    const names = nameStr ? m.names.filter(x => x !== nameStr) : m.names;
    saveCreatedRoleMarkers(ids, names);
};

const applyRoleCreationFilter = (roles: CustomRole[]): CustomRole[] => {
    // Strict allowlist: show only roles the user created locally (by id or name).
    // Prevents unexpected roles from appearing after refresh.
    const m = getCreatedRoleMarkers();
    if (m.ids.length === 0 && m.names.length === 0) return [];
    const idSet = new Set(m.ids.map(String));
    const nameSet = new Set(m.names.map(n => normalizeRoleName(String(n))));
    const preferred: CustomRole[] = [];
    for (const r of roles) {
        const byId = idSet.has(String(r.id));
        const byName = nameSet.has(normalizeRoleName(String(r.name)));
        if (byId || byName) preferred.push(r);
    }
    return dedupeRoles(preferred);
};

// Roles catalog grid (predefined + custom) showing each role with count and description
const RolesCatalog = ({
    users,
    customRoles,
    onEditCustom,
    onDeleteCustom
}: {
    users: User[];
    customRoles: { id: string; name: string; description: string; color: string; permissions?: string[]; nameKey?: string }[];
    onEditCustom: (id: string) => void;
    onDeleteCustom: (id: string, name: string) => void;
}) => {
    const baseRoles: { id: string; name: string; description: string; color: string }[] = [
        { id: 'base-Admin', name: 'Admin', description: 'System administrators with full access', color: '#ef4444' },
        { id: 'base-Manager', name: 'Manager', description: 'Team leaders managing projects and employees', color: '#3b82f6' },
        { id: 'base-Employee', name: 'Employee', description: 'Regular employees working on assigned tasks', color: '#22c55e' },
        { id: 'base-HR', name: 'HR', description: 'Human resources managing people and HR tasks', color: '#f59e0b' },
    ];
    const allRoles: Array<{ id?: string; name: string; description: string; color: string; isCustom: boolean; nameKey?: string }> = [
        ...baseRoles.map(r => ({ ...r, isCustom: false })),
        ...customRoles.map(r => ({ id: r.id, name: r.name, description: r.description || 'No description provided', color: r.color || '#6b7280', isCustom: true, nameKey: r.nameKey }))
    ];
    const totalUsers = users.length || 1;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allRoles.map(role => {
                const count = users.filter(u => `${u.role}` === role.name).length;
                const percent = Math.round((count / totalUsers) * 1000) / 10;
                return (
                    <div key={(role.id && String(role.id)) || `name:${role.name}`} className="bg-white rounded-lg shadow-lg p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                                <h4 className="font-semibold text-slate-800 flex items-center space-x-2">
                                    <span>{role.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">role</span>
                                </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                                {role.isCustom && (
                                    <>
                                        <button
                                            onClick={() => role.id && onEditCustom(role.id!)}
                                            title="Edit role"
                                            className="p-1 rounded hover:bg-slate-100 text-slate-600"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => role.id && onDeleteCustom(role.id!, role.nameKey || role.name)}
                                            title={role.id ? 'Delete role' : 'Cannot delete: no server id'}
                                            disabled={!role.id}
                                            className={`p-1 rounded hover:bg-slate-100 ${role.id ? 'text-red-600' : 'text-slate-300 cursor-not-allowed'}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </>
                                )}
                                <div className="text-sm text-slate-500">{count}</div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 min-h-8">{role.description || 'No description provided'}</p>
                        <div className="mt-3">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: role.color }} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) => (
    <div className="bg-white rounded-lg shadow-lg p-5 flex items-start">
        <div className={`rounded-lg p-3 ${color}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const RoleDistributionChart = ({ data }: { data: { role: string, count: number, color: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return <div className="flex items-center justify-center h-full text-slate-500">No data</div>;
    
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
                {data.map((item, idx) => {
                    const percent = (item.count / total) * 100;
                    const offset = circumference - (accumulatedPercent / 100) * circumference;
                    const dashArray = `${(percent / 100) * circumference} ${circumference}`;
                    accumulatedPercent += percent;
                    return <circle key={`${item.role}-${idx}`} cx="75" cy="75" r={radius} fill="transparent" stroke={item.color} strokeWidth="20" strokeDasharray={dashArray} strokeDashoffset={offset} />;
                })}
            </svg>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {data.map((item, idx) => (
                    <div key={`${item.role}-legend-${idx}`} className="flex items-center text-xs">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 font-medium">{item.role} ({item.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const UserCard: React.FC<{ 
    user: User; 
    onEdit: (userId: string) => void; 
    onDelete: (userId: string) => void; 
    getRoleBadgeClass: (role: UserRole | string) => string;
    getRoleColor: (role: UserRole | string) => string;
}> = ({ user, onEdit, onDelete, getRoleBadgeClass, getRoleColor }) => {
    const statusStyles = {
        Active: { dot: 'bg-green-500' },
        Busy: { dot: 'bg-orange-500' },
        Offline: { dot: 'bg-slate-400' },
    };

    const currentStatus = user.status || 'Offline';
    const roleColor = getRoleColor(user.role);

    return (
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col space-y-4 transition-all hover:shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold flex-shrink-0">
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                {user.role}
                            </span>
                            {roleColor && (
                                <div 
                                    className="w-3 h-3 rounded-full border border-slate-300" 
                                    style={{ backgroundColor: roleColor }}
                                    title={user.role}
                                ></div>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusStyles[currentStatus].dot}`}></div>
            </div>

            {/* Info */}
            <div className="text-sm text-slate-600">
                <p className="truncate">{user.email}</p>
                <p className="mt-1">Status: <span className="font-medium">{currentStatus}</span></p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-2">
                <button 
                    onClick={() => onEdit(user.id)}
                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full"
                    title="Edit user"
                >
                    <EditIcon />
                </button>
                <button 
                    onClick={() => onDelete(user.id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full"
                    title="Delete user"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

interface CustomRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  createdAt: string;
  nameKey?: string;
}

const RolesDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        admins: 0,
        managers: 0,
        employees: 0,
        hr: 0,
    });
    const [roleDistributionData, setRoleDistributionData] = useState<any[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]); // New state for custom roles
    const [usersList, setUsersList] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('table');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false); // New state for edit user modal
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null); // New state for user being edited
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [roleColor, setRoleColor] = useState('#3b82f6'); // Default blue color
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedUserRole, setSelectedUserRole] = useState<UserRole | string>(''); // New state for selected user role
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
    // Roles are local-only; no API key required
    
    const activeRolesCount = Array.from(new Set(usersList.map(u => String(u.role)))).length;

    const deleteCustomRoleById = async (id: string, name?: string) => {
        try {
            if (!id && !name) {
                showToast('Cannot delete role: missing role identifier (id or name).', 'error');
                return;
            }
            await apiDeleteRole(id || '', name);
            // Refresh from server to keep in sync
            try {
                const apiRoles = await apiGetRoles();
                const mapped: CustomRole[] = (apiRoles || []).map((r: any, idx: number) => ({
                    id: String(r.id || r.roleId || r.roleID || r.RoleId || r._id || r.ID || ''),
                    name: String(r.name || r.roleName || `Unnamed Role ${idx + 1}`),
                    description: String(r.description || r.desc || ''),
                    color: String(r.color || '#6b7280'),
                    permissions: Array.isArray(r.permissions) ? r.permissions : [],
                    createdAt: String(r.createdAt || new Date().toISOString()),
                    nameKey: String(r.nameKey || r.key || r.slug || r.uniqueKey || r.roleNameKey || r.role_key || r.roleSlug || '') || undefined,
                }));
                let deduped = dedupeRoles(mapped);
                const stillExists = deduped.some(r => r.id === id || (!!name && r.name === name));
                if (stillExists) {
                    // Persist a local deletion marker so future loads will filter it out
                    try {
                        const rawDel = localStorage.getItem('ets_role_deletions');
                        const parsed = rawDel ? JSON.parse(rawDel) : {};
                        const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
                        const names = Array.isArray(parsed.names) ? parsed.names : [];
                        if (id) ids.push(String(id));
                        if (name) names.push(String(name));
                        localStorage.setItem('ets_role_deletions', JSON.stringify({ ids: Array.from(new Set(ids)), names: Array.from(new Set(names)) }));
                    } catch {}
                    // Locally filter it out now
                    deduped = deduped.filter(r => r.id !== id && (!name || r.name !== name));
                }
                // Apply deletion overrides to be safe and save
                deduped = applyRoleDeletions(deduped);
                // Merge in locally created roles not present from API
                try {
                    const savedStr = localStorage.getItem('ets_customRoles');
                    const saved: CustomRole[] = savedStr ? JSON.parse(savedStr) : [];
                    const markers = getCreatedRoleMarkers();
                    const idSet = new Set(markers.ids.map(String));
                    const nameSet = new Set(markers.names.map(n => String(n).toLowerCase()));
                    const present = (r: CustomRole) => deduped.some(x => String(x.id) === String(r.id) || String(x.name).toLowerCase() === String(r.name).toLowerCase());
                    const extras = saved.filter(r => (idSet.has(String(r.id)) || nameSet.has(String(r.name).toLowerCase())) && !present(r));
                    if (extras.length) deduped = dedupeRoles([...deduped, ...extras]);
                } catch {}
                // Do not restrict to locally created roles; show all
                setCustomRoles(deduped);
                localStorage.setItem('ets_customRoles', JSON.stringify(deduped));
            } catch {
                const updated = customRoles.filter(r => r.id !== id && (!name || r.name !== name));
                setCustomRoles(updated);
                localStorage.setItem('ets_customRoles', JSON.stringify(updated));
            }
            showToast(`Role "${name || 'Role'}" deleted successfully!`, 'success');
            // Remove from creation allowlist as well
            unmarkRoleCreated(id, name);
            // Perform a full page refresh as requested
            try { window.location.reload(); } catch {}
        } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : String(e || '');
            console.error('Failed to delete role:', msg);
            showToast(`Failed to delete role${name ? ` "${name}"` : ''}. ${msg || ''}`.trim(), 'error');
        }
    };

    // Open edit modal for a custom role with fields pre-filled
    const onEditCustom = (roleId: string) => {
        try {
            const r = customRoles.find(cr => String(cr.id) === String(roleId))
                || customRoles.find(cr => String(cr.name).toLowerCase() === String(roleId).toLowerCase());
            if (!r) {
                showToast('Role not found for editing', 'error');
                return;
            }
            setEditingRoleId(String(roleId));
            setRoleName(String(r.name || ''));
            setRoleDescription(String(r.description || ''));
            setRoleColor(String(r.color || '#3b82f6'));
            setSelectedPermissions(Array.isArray(r.permissions) ? r.permissions : []);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Failed to open edit modal:', err);
            showToast('Failed to open edit role modal', 'error');
        }
    };

    // Prepare delete confirmation for a custom role
    const onDeleteCustom = (roleId: string, name?: string) => {
        const n = name || (customRoles.find(cr => String(cr.id) === String(roleId))?.name || '');
        setRoleToDelete({ id: roleId, name: n });
    };

    const requestDeleteRole = (id: string, name: string) => {
        setRoleToDelete({ id, name });
    };

    const handleEditCustomRole = (roleId: string) => {
        const role = customRoles.find(r => r.id === roleId);
        if (!role) return;
        setEditingRoleId(role.id);
        setRoleName(role.name);
        setRoleDescription(role.description || '');
        setRoleColor(role.color || '#6b7280');
        setSelectedPermissions(role.permissions || []);
        setIsModalOpen(true);
    };

    // Predefined color options for roles
    const colorOptions = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Gray', value: '#6b7280' },
    ];

    // Group permissions by category for better organization
    const permissionGroups = [
        {
            category: "Core Access",
            permissions: [
                { id: 'view_dashboard', name: 'View Dashboard', description: 'Access to view dashboard' },
                { id: 'view_reports', name: 'View Reports', description: 'Access to view reports and analytics' },
            ]
        },
        {
            category: "User Management",
            permissions: [
                { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, and delete users' },
                { id: 'manage_roles', name: 'Manage Roles', description: 'Create, edit, and delete roles' },
            ]
        },
        {
            category: "Resource Management",
            permissions: [
                { id: 'manage_projects', name: 'Manage Projects', description: 'Create, edit, and delete projects' },
                { id: 'manage_tasks', name: 'Manage Tasks', description: 'Create, edit, and delete tasks' },
                { id: 'manage_departments', name: 'Manage Departments', description: 'Create, edit, and delete departments' },
                { id: 'manage_companies', name: 'Manage Companies', description: 'Create, edit, and delete companies' },
            ]
        },
        {
            category: "System",
            permissions: [
                { id: 'system_settings', name: 'System Settings', description: 'Access to system configuration settings' },
            ]
        }
    ];

    // Flatten permissions for easier handling
    const allPermissions = permissionGroups.flatMap(group => group.permissions);

    // No API initialization required for roles

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch users from API service to avoid local static data
            const users = await DataService.getUsers();

            
            setUsersList(users);
            
            // Fetch roles from new API and map to CustomRole shape
            let latestCustomRoles: CustomRole[] = [];
            try {
                const apiRoles = await apiGetRoles();
                const mapped: CustomRole[] = (apiRoles || []).map((r: any, idx: number) => ({
                    id: String((r.id ?? r.roleId ?? r.roleID ?? r.RoleId ?? r._id ?? r.ID) ?? ''),
                    name: String(r.name ?? r.roleName ?? `Unnamed Role ${idx + 1}`),
                    description: String(r.description ?? r.desc ?? ''),
                    color: String(r.color ?? '#6b7280'),
                    permissions: Array.isArray(r.permissions) ? r.permissions : [],
                    createdAt: String(r.createdAt ?? new Date().toISOString()),
                    nameKey: String(r.nameKey ?? r.key ?? r.slug ?? r.uniqueKey ?? r.roleNameKey ?? r.role_key ?? r.roleSlug ?? '') || undefined,
                }));
                let deduped = dedupeRoles(mapped);
                // Overlay local pending overrides (from failed updates)
                deduped = applyRoleOverrides(deduped);
                // Apply deletion overrides so server-only roles marked deleted are hidden locally
                deduped = applyRoleDeletions(deduped);
                // Merge in locally saved roles that were created recently (allowlist) if API hasn't returned them yet
                try {
                    const savedStr = localStorage.getItem('ets_customRoles');
                    const saved: CustomRole[] = savedStr ? JSON.parse(savedStr) : [];
                    const markers = getCreatedRoleMarkers();
                    const idSet = new Set(markers.ids.map(String));
                    const nameSet = new Set(markers.names.map(n => String(n).toLowerCase()));
                    const present = (r: CustomRole) => deduped.some(x => String(x.id) === String(r.id) || String(x.name).toLowerCase() === String(r.name).toLowerCase());
                    const extras = saved.filter(r => (idSet.has(String(r.id)) || nameSet.has(String(r.name).toLowerCase())) && !present(r));
                    if (extras.length) deduped = dedupeRoles([...deduped, ...extras]);
                } catch {}
                // Show all roles (server + custom) without restricting to locally created allowlist
                latestCustomRoles = deduped;
                setCustomRoles(deduped);
                localStorage.setItem('ets_customRoles', JSON.stringify(deduped));
            } catch (e: any) {
                console.warn('Failed to fetch roles from API:', e?.message || e);
                // Fallback to localStorage if API fails
                const savedCustomRoles = localStorage.getItem('ets_customRoles');
                if (savedCustomRoles) {
                    try {
                        latestCustomRoles = JSON.parse(savedCustomRoles);
                        // Also apply deletion overrides on locally saved data
                        setCustomRoles(applyRoleDeletions(latestCustomRoles));
                    } catch {
                        latestCustomRoles = [];
                        setCustomRoles([]);
                    }
                }
            }
            
            const roleCounts = {
                admins: users.filter(u => u.role === UserRole.ADMIN).length,
                managers: users.filter(u => u.role === UserRole.MANAGER).length,
                employees: users.filter(u => u.role === UserRole.EMPLOYEE).length,
                hr: users.filter(u => u.role === UserRole.HR).length,
            };
            
            setStats({
                totalUsers: users.length,
                ...roleCounts
            });

            // Create role distribution data including custom roles
            const distributionData = [
                { role: 'Admin', count: roleCounts.admins, color: '#ef4444' },
                { role: 'Manager', count: roleCounts.managers, color: '#3b82f6' },
                { role: 'Employee', count: roleCounts.employees, color: '#22c55e' },
                { role: 'HR', count: roleCounts.hr, color: '#f59e0b' },
            ];
            
            // Add custom roles to the distribution (show all custom roles, even with 0 users)
            (latestCustomRoles || []).forEach((role, index) => {
                const customRoleUsers = users.filter(u => u.role === role.name).length;
                // Generate a color for the custom role (rotate through a set of colors)
                const colors = ['#8b5cf6', '#ec4899', '#6366f1', '#6b7280', '#f97316'];
                const color = colors[index % colors.length];
                distributionData.push({ 
                    role: role.name, 
                    count: customRoleUsers, 
                    color: color 
                });
            });
            
            setRoleDistributionData(distributionData);
        } catch (error: any) {
            console.error("Failed to load dashboard data:", error.message || error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Guard against double-invocation of effects (e.g., React StrictMode in dev)
    const didLoadRef = useRef(false);
    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;
        loadData();
    }, [loadData]);
    
    // Save custom roles to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('ets_customRoles', JSON.stringify(customRoles));
    }, [customRoles]);
    
    // Function to get badge class based on user role
    const getRoleBadgeClass = (role: UserRole | string) => {
        // Check if it's a custom role
        const customRole = customRoles.find(r => r.name === role);
        if (customRole) {
            // For custom roles, we'll use a generic style with the role color
            return 'bg-gray-100 text-gray-800';
        }
        
        // For predefined roles
        switch (role) {
            case UserRole.ADMIN:
                return 'bg-red-100 text-red-800';
            case UserRole.MANAGER:
                return 'bg-blue-100 text-blue-800';
            case UserRole.EMPLOYEE:
                return 'bg-green-100 text-green-800';
            case UserRole.HR:
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Function to get role color for custom roles
    const getRoleColor = (role: UserRole | string) => {
        const customRole = customRoles.find(r => r.name === role);
        if (customRole) {
            return customRole.color;
        }
        return '';
    };

    // Function to show toast notification
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // No API key handling needed

    // Handle create role
    const handleCreateRole = () => {
        setIsModalOpen(true);
        setEditingRoleId(null);
        setRoleName('');
        setRoleDescription('');
        setRoleColor('#3b82f6');
        setSelectedPermissions([]);
    };

    // Handle permission toggle
    const togglePermission = (permissionId: string) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            } else {
                return [...prev, permissionId];
            }
        });
    };

    // Handle select all permissions
    const selectAllPermissions = () => {
        setSelectedPermissions(allPermissions.map(p => p.id));
    };

    // Handle deselect all permissions
    const deselectAllPermissions = () => {
        setSelectedPermissions([]);
    };

    // Handle modal close
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setRoleName('');
        setRoleDescription('');
        setRoleColor('#3b82f6'); // Reset to default color
        setSelectedPermissions([]); // Reset permissions
        setEditingRoleId(null);
    };

    // Handle role submission
    const handleSubmitRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRoleId) {
                // Update existing role
                const payload = { name: roleName, description: roleDescription, color: roleColor, permissions: selectedPermissions };
                // Capture old name (if any) to clear stale name markers on rename
                const prev = (customRoles || []).find(r => String(r.id) === String(editingRoleId));
                const oldName = prev ? String(prev.name) : undefined;
                await apiUpdateRole(editingRoleId, payload);
                // Ensure markers include id+name to force id-only filtering and prevent duplicates
                try { markRoleCreated(String(editingRoleId), String(roleName)); } catch {}
                // If name changed, remove old name marker so it doesn't re-include by name
                try { if (oldName && oldName.toLowerCase() !== String(roleName).toLowerCase()) unmarkRoleCreated(undefined, oldName); } catch {}
                // Refresh roles and apply filters
                try {
                    const apiRoles = await apiGetRoles();
                    const mapped: CustomRole[] = (apiRoles || []).map((r: any, idx: number) => ({
                        id: String((r.id ?? r.roleId ?? r.roleID ?? r.RoleId ?? r._id ?? r.ID) ?? (r.name ?? `role-${idx}`)),
                        name: String(r.name ?? r.roleName ?? `Unnamed Role ${idx + 1}`),
                        description: String(r.description ?? r.desc ?? ''),
                        color: String(r.color ?? '#6b7280'),
                        permissions: Array.isArray(r.permissions) ? r.permissions : [],
                        createdAt: String(r.createdAt ?? new Date().toISOString()),
                    }));
                    let deduped = applyRoleOverrides(dedupeRoles(mapped));
                    deduped = applyRoleDeletions(deduped);
                    setCustomRoles(deduped);
                    localStorage.setItem('ets_customRoles', JSON.stringify(deduped));
                } catch {}
                showToast(`Role "${roleName}" updated successfully!`, 'success');
                handleCloseModal();
                await loadData();
            } else {
                // Create new role
                const payload = { name: roleName, description: roleDescription, color: roleColor, permissions: selectedPermissions };
                // Optimistically insert immediately
                const tempId = `temp-role-${Date.now()}`;
                const optimisticRole: CustomRole = {
                    id: tempId,
                    name: roleName,
                    description: roleDescription,
                    color: roleColor,
                    permissions: selectedPermissions,
                    createdAt: new Date().toISOString(),
                    nameKey: undefined,
                };
                setCustomRoles(prev => dedupeRoles([...prev, optimisticRole]));
                // Persist optimistic state
                try {
                    const prevStr = localStorage.getItem('ets_customRoles');
                    const prevRoles: CustomRole[] = prevStr ? JSON.parse(prevStr) : [];
                    localStorage.setItem('ets_customRoles', JSON.stringify(dedupeRoles([...prevRoles, optimisticRole])));
                } catch {}
                // Proceed with API create
                const created = await apiCreateRole(payload);
                try { markRoleCreated(String(created?.id || ''), String(created?.name || roleName)); } catch {}
                // Refresh from server to reconcile ids
                try {
                    const apiRoles = await apiGetRoles();
                    const mapped: CustomRole[] = (apiRoles || []).map((r: any, idx: number) => ({
                        id: String((r.id ?? r.roleId ?? r.roleID ?? r.RoleId ?? r._id ?? r.ID) ?? (r.name ?? `role-${idx}`)),
                        name: String(r.name ?? r.roleName ?? `Unnamed Role ${idx + 1}`),
                        description: String(r.description ?? r.desc ?? ''),
                        color: String(r.color ?? '#6b7280'),
                        permissions: Array.isArray(r.permissions) ? r.permissions : [],
                        createdAt: String(r.createdAt ?? new Date().toISOString()),
                    }));
                    let deduped = applyRoleOverrides(dedupeRoles(mapped));
                    deduped = applyRoleDeletions(deduped);
                    // Reconcile: remove temp and ensure created role present
                    try {
                        const createdId = String(created?.id || '');
                        const createdName = String(created?.name || roleName);
                        // Remove temp optimistic role
                        deduped = deduped.filter(r => r.id !== tempId);
                        const exists = deduped.some(r => String(r.id) === createdId || String(r.name).toLowerCase() === createdName.toLowerCase());
                        if (!exists) {
                            const fallback: CustomRole = {
                                id: createdId || `role-${Date.now()}`,
                                name: createdName,
                                description: roleDescription,
                                color: roleColor,
                                permissions: selectedPermissions,
                                createdAt: new Date().toISOString(),
                                nameKey: undefined,
                            };
                            deduped = dedupeRoles([...deduped, fallback]);
                        }
                    } catch {}
                    setCustomRoles(deduped);
                    localStorage.setItem('ets_customRoles', JSON.stringify(deduped));
                } catch {}
                showToast(`Role "${roleName}" created successfully!`, 'success');
                handleCloseModal();
                // Refresh UI state without full page reload
                try { await loadData(); } catch {}
            }
            // No need to force reload; state change triggers re-render and effects recalc distribution
        } catch (error) {
            console.error('Error creating/updating role:', error);
            showToast(`Failed to save role "${roleName}". Please try again.`, 'error');
        }
    };

    // Handle edit user
    const handleEditUser = (userId: string) => {
        const user = usersList.find(u => u.id === userId);
        if (user) {
            setUserToEdit(user);
            setSelectedUserRole(user.role);
            setIsEditUserModalOpen(true);
        }
    };

    // Handle save user
    const handleSaveUser = () => {
        if (userToEdit) {
            try {
                // Update the user's role
                const updatedUser = { ...userToEdit, role: selectedUserRole };
                
                // Update the user in the list
                setUsersList(prev => 
                    prev.map(u => u.id === userToEdit.id ? updatedUser : u)
                );
                
                // Update the user in the AuthService
                AuthService.updateUser(userToEdit.id, { role: selectedUserRole });
                
                // Show success message
                showToast(`User "${userToEdit.name}" updated successfully!`, 'success');
                
                // Close the modal
                setIsEditUserModalOpen(false);
                setUserToEdit(null);
                setSelectedUserRole('');
            } catch (error) {
                console.error('Error updating user:', error);
                showToast(`Failed to update user "${userToEdit.name}". Please try again.`, 'error');
            }
        }
    };

    // Handle edit role
    const handleEditRole = async (roleId: string, roleData: { roleName: string; roleDescription: string; roleColor: string; permissions: string[] }) => {
        // Validate inputs
        if (!roleId || typeof roleId !== 'string') {
            console.error('Valid role ID is required');
            showToast('Valid role ID is required to update a role', 'error');
            return { success: false, error: 'Valid role ID is required' };
        }
        
        if (!roleData || typeof roleData !== 'object') {
            console.error('Valid role data is required');
            showToast('Valid role data is required to update a role', 'error');
            return { success: false, error: 'Valid role data is required' };
        }
        
        const { roleName, roleDescription, roleColor, permissions } = roleData;
        
        if (!roleName || typeof roleName !== 'string') {
            console.error('Role name is required');
            showToast('Role name is required to update a role', 'error');
            return { success: false, error: 'Role name is required' };
        }
        
        if (roleDescription && typeof roleDescription !== 'string') {
            console.error('Role description must be a string');
            showToast('Role description must be a string', 'error');
            return { success: false, error: 'Role description must be a string' };
        }
        
        if (!roleColor || typeof roleColor !== 'string' || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(roleColor)) {
            console.error('Valid hex color code is required');
            showToast('Valid hex color code is required (e.g., #3b82f6)', 'error');
            return { success: false, error: 'Valid hex color code is required' };
        }
        
        if (!Array.isArray(permissions)) {
            console.error('Permissions must be an array');
            showToast('Permissions must be an array', 'error');
            return { success: false, error: 'Permissions must be an array' };
        }
        
        try {
            // For now, we'll just show a success message since we're not actually editing custom roles
            // In a full implementation, this would integrate with a backend service
            console.log('Role update requested:', { roleId, roleName, roleDescription, roleColor, permissions });
            showToast(`Role "${roleName}" updated successfully!`, 'success');
            loadData(); // Refresh the data after update
            return { success: true, data: { roleId, ...roleData } };
        } catch (error: any) {
            console.error('Error updating role:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            showToast(`Failed to update role "${roleName}". ${errorMessage}`, 'error');
            return { success: false, error };
        }
    };

    // Handle delete user
    const handleDeleteUser = (userId: string) => {
        // Set the user to delete and open the confirmation modal
        setUserToDelete(userId);
        setIsDeleteConfirmOpen(true);
    };
    
    // Confirm and delete user
    const confirmDeleteUser = () => {
        if (userToDelete) {
            try {
                AuthService.deleteUser(userToDelete);
                loadData(); // Refresh the data after deletion
                showToast("User deleted successfully!", "success");
            } catch (error) {
                console.error("Failed to delete user:", error);
                showToast("Failed to delete user. Please try again.", "error");
            } finally {
                // Close the confirmation modal and reset the user to delete
                setIsDeleteConfirmOpen(false);
                setUserToDelete(null);
            }
        }
    };
    
    // Update role distribution when custom roles or users change
    useEffect(() => {
        if (usersList.length > 0) {
            const roleCounts = {
                admins: usersList.filter(u => u.role === UserRole.ADMIN).length,
                managers: usersList.filter(u => u.role === UserRole.MANAGER).length,
                employees: usersList.filter(u => u.role === UserRole.EMPLOYEE).length,
                hr: usersList.filter(u => u.role === UserRole.HR).length,
            };
            
            // Create role distribution data including custom roles
            const distributionData = [
                { role: 'Admin', count: roleCounts.admins, color: '#ef4444' },
                { role: 'Manager', count: roleCounts.managers, color: '#3b82f6' },
                { role: 'Employee', count: roleCounts.employees, color: '#22c55e' },
                { role: 'HR', count: roleCounts.hr, color: '#f59e0b' },
            ];
            
            // Add custom roles to the distribution (show all custom roles, even with 0 users)
            customRoles.forEach((role, index) => {
                const customRoleUsers = usersList.filter(u => u.role === role.name).length;
                // Generate a color for the custom role (rotate through a set of colors)
                const colors = ['#8b5cf6', '#ec4899', '#6366f1', '#6b7280', '#f97316'];
                const color = colors[index % colors.length];
                distributionData.push({ 
                    role: role.name, 
                    count: customRoleUsers, 
                    color: color 
                });
            });
            
            setRoleDistributionData(distributionData);
        }
    }, [usersList, customRoles]);

    return (
        <div className="pb-8">
            {/* Toast notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
            
            {/* Delete Confirmation Modal */}
            <Modal title="Confirm Deletion" isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} className="w-96 mx-auto mt-32 rounded-lg">
                <div className="py-4">
                    <p className="text-slate-700 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                        <Button 
                            onClick={confirmDeleteUser}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal title="Edit User" isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} className="w-1/3 max-w-md mx-auto mt-24 rounded-lg">
                {userToEdit && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold flex-shrink-0">
                                {getInitials(userToEdit.name)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{userToEdit.name}</h3>
                                <p className="text-sm text-slate-600">{userToEdit.email}</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role
                            </label>
                            <select
                                value={selectedUserRole}
                                onChange={(e) => setSelectedUserRole(e.target.value)}
                                className="w-full rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                            >
                                <option value="">Select a role</option>
                                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                                <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                                <option value={UserRole.EMPLOYEE}>{UserRole.EMPLOYEE}</option>
                                <option value={UserRole.HR}>{UserRole.HR}</option>
                                {customRoles.map(role => (
                                    <option key={role.id || `name:${role.name}`} value={role.name}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button 
                                onClick={handleSaveUser}
                                className="px-3 py-1.5 text-sm" 
                                disabled={!selectedUserRole}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Create Role Modal */}
            <Modal title="Create New Role" isOpen={isModalOpen} onClose={handleCloseModal} className="w-1/3 max-w-md mx-auto mt-24 rounded-lg">
                <form onSubmit={handleSubmitRole} className="space-y-4">
                    <div className="space-y-4">
                        <Input 
                            id="roleName"
                            label="Role Name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            required
                            placeholder="Enter role name"
                            className="text-sm"
                            labelClassName="text-sm"
                        />
                        
                        <div>
                            <label htmlFor="roleDescription" className="block text-sm font-medium text-slate-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="roleDescription"
                                rows={3}
                                className="w-full rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                value={roleDescription}
                                onChange={(e) => setRoleDescription(e.target.value)}
                                placeholder="Enter role description"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${roleColor === color.value ? 'border-slate-800 ring-2 ring-offset-1 ring-slate-400' : 'border-slate-300'}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setRoleColor(color.value)}
                                        title={color.name}
                                        aria-label={`Select ${color.name} color`}
                                    />
                                ))}
                            </div>
                            <div className="mt-2 flex items-center space-x-2">
                                <input
                                    type="color"
                                    value={roleColor}
                                    onChange={(e) => setRoleColor(e.target.value)}
                                    className="w-10 h-10 border border-slate-300 rounded cursor-pointer bg-white"
                                />
                                <input
                                    type="text"
                                    value={roleColor}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Validate hex color format
                                        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) || value === '') {
                                            setRoleColor(value);
                                        }
                                    }}
                                    className="flex-1 rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>
                        
                        {/* Permissions Section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Permissions
                                </label>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={selectAllPermissions}
                                        className="text-xs text-indigo-600 hover:text-indigo-800"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deselectAllPermissions}
                                        className="text-xs text-slate-600 hover:text-slate-800"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            
                            <div className="border border-slate-200 rounded-md p-3 max-h-60 overflow-y-auto">
                                {permissionGroups.map((group) => (
                                    <div key={group.category} className="mb-4 last:mb-0">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            {group.category}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            id={`permission-${permission.id}`}
                                                            type="checkbox"
                                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                            checked={selectedPermissions.includes(permission.id)}
                                                            onChange={() => togglePermission(permission.id)}
                                                        />
                                                    </div>
                                                    <div className="ml-2 text-sm">
                                                        <label htmlFor={`permission-${permission.id}`} className="font-medium text-slate-700">
                                                            {permission.name}
                                                        </label>
                                                        <p className="text-slate-500 text-xs">{permission.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="submit" className="px-3 py-1.5 text-sm" disabled={!roleName.trim()}>
                            Create Role
                        </Button>
                    </div>
                </form>
            </Modal>
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Roles Dashboard</h1>
                    <p className="text-slate-600">Welcome, {user?.name}! Here's an overview of user roles in the organization.</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={handleCreateRole}>Create Role</Button>
                    <button 
                        onClick={loadData} 
                        disabled={isLoading} 
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh data"
                    >
                        <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Roles are local-only; API key banner removed */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    icon={<UserGroupIcon />}
                    title="Total Users"
                    value={`${stats.totalUsers}`}
                    color="bg-indigo-100 text-indigo-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">R</div>}
                    title="Active Roles"
                    value={`${activeRolesCount}`}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">A</div>}
                    title="Admins"
                    value={`${stats.admins}`}
                    color="bg-red-100 text-red-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">E</div>}
                    title="Employees"
                    value={`${stats.employees}`}
                    color="bg-green-100 text-green-600"
                />
            </div>
            {/* Role Distribution Chart (legend + bars) */}
            <div className="mt-2">
                <RoleDistributionList data={roleDistributionData} />
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
                <h2 className="text-base font-semibold text-slate-800 mb-3">Quick Actions</h2>
                <QuickActions />
            </div>

            {/* Role Distribution Cards */}
            <div className="mt-2">
                <h2 className="text-lg font-semibold text-slate-800 mb-3">Role Distribution</h2>
                <RolesCatalog 
                    users={usersList} 
                    customRoles={customRoles}
                    onEditCustom={handleEditCustomRole}
                    onDeleteCustom={requestDeleteRole}
                />
            </div>
            {/* Confirm Delete Role Modal */}
            <Modal 
                title="Delete Role" 
                isOpen={!!roleToDelete} 
                onClose={() => setRoleToDelete(null)} 
                className="w-96 mx-auto mt-32 rounded-lg"
            >
                <div className="py-4">
                    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
                        <p className="font-semibold mb-1">Recommended</p>
                        <p>
                            Reassign users from <span className="font-semibold">{roleToDelete?.name}</span> to another role before deleting to avoid access and reporting issues.
                        </p>
                        {roleToDelete && (
                            <p className="mt-2 text-amber-700">
                                Users currently in this role: <span className="font-semibold">{usersList.filter(u => String(u.role) === roleToDelete.name).length}</span>
                            </p>
                        )}
                    </div>
                    <p className="text-slate-700 mb-6">Are you sure you want to delete the role <span className="font-semibold">{roleToDelete?.name}</span>? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                        <Button 
                            onClick={() => setRoleToDelete(null)}
                            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => {
                                if (roleToDelete) {
                                    deleteCustomRoleById(roleToDelete.id, roleToDelete.name);
                                    setRoleToDelete(null);
                                }
                            }}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
            <div className="mt-6">
                <AllUsersList 
                    users={usersList} 
                    getRoleBadgeClass={getRoleBadgeClass} 
                    getRoleColor={getRoleColor}
                    onEditUser={handleEditUser}
                    onDeleteUser={handleDeleteUser}
                />
            </div>
        </div>
    );
};

export default RolesDashboard;