import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Task, TaskStatus, User, UserRole, Project } from '../../types';

import { ArrowPathIcon, ClipboardListIcon, CheckCircleIcon, ClockIcon, EditIcon, TrashIcon } from '../../constants';
import Toast from '../shared/Toast';

// --- Minimal TaskCalendar ---
type CalendarProps = {
  tasks: Task[];
  users: User[];
  currentUserRole?: UserRole;
  currentUserId?: string;
  hideAllMembersReports?: boolean;
  onDayClick?: (ymd: string) => void;
  getStatus?: (ymd: string) => 'submitted' | 'missed' | 'late' | 'none';
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const localYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

const TaskCalendar: React.FC<CalendarProps> = ({ tasks, users, currentUserRole, currentUserId, hideAllMembersReports, onDayClick, getStatus }) => {
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const today = new Date();

  const dayTasks = (day: Date) => {
    if (isNaN(day.getTime())) return [] as Task[];
    const ymd = localYMD(day);
    const scoped = (tasks || []).filter(t => (t.dueDate ? String(t.dueDate).slice(0, 10) === ymd : false));
    if (hideAllMembersReports || currentUserRole === UserRole.EMPLOYEE) {
      return scoped.filter(t => (t.assigneeIds || []).includes(String(currentUserId)));
    }
    return scoped;
  };

  const assigneeNames = (t: Task) => {
    const names = (t.assigneeIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    return names.join(', ');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setCursor(c => addMonths(c, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="text-lg font-semibold text-slate-800">Task Calendar</div>
          <button
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setCursor(c => addMonths(c, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-600"><span className="inline-block w-2 h-2 rounded-full bg-green-500"/>Submitted</span>
            <span className="inline-flex items-center gap-1 text-slate-600"><span className="inline-block w-2 h-2 rounded-full bg-amber-500"/>Late</span>
            <span className="inline-flex items-center gap-1 text-slate-600"><span className="inline-block w-2 h-2 bg-red-500"/>Missed</span>
          </div>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700" onClick={() => setCursor(new Date())}>Today</button>
        </div>
      </div>
      <div className="px-6 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[-1,0,1].map(offset => {
          const base = addMonths(cursor, offset);
          const monthStart = startOfMonth(base);
          const monthEnd = endOfMonth(base);
          const startWeekday = monthStart.getDay();
          const totalDays = monthEnd.getDate();
          const cells: Date[] = [];
          for (let i=0;i<startWeekday;i++) cells.push(new Date(NaN));
          for (let d=1; d<=totalDays; d++) cells.push(new Date(base.getFullYear(), base.getMonth(), d));
          return (
            <div key={offset} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
                {base.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="text-center text-[11px] font-medium text-slate-500 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, idx) => {
                    const invalid = isNaN(d.getTime());
                    const tasksForDay = invalid ? [] as Task[] : dayTasks(d);
                    const isToday = !invalid && isSameDay(d, today);
                    const ymd = !invalid ? localYMD(d) : '';
                    const status = (!invalid && getStatus) ? getStatus(ymd) : 'none';
                    const dotClass =
                      status === 'submitted' ? 'inline-block w-2 h-2 rounded-full bg-green-500'
                      : status === 'missed' ? 'inline-block w-2 h-2 bg-red-500'
                      : status === 'late' ? 'inline-block w-2 h-2 rounded-full bg-amber-500'
                      : 'hidden';
                    return (
                      <div
                        key={idx}
                        className={`relative min-h-[96px] border rounded-lg p-1 transition-all ${invalid ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-sm cursor-pointer'} ${isToday && !invalid ? 'ring-1 ring-indigo-300' : ''}`}
                        onClick={() => { if (!invalid && onDayClick) onDayClick(ymd); }}
                      >
                        <div className={`flex items-start justify-between text-[11px] ${isToday ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>
                          <span className="sr-only">{invalid ? '' : d.toDateString()}</span>
                          <span className="px-1 rounded text-slate-700">{invalid ? '' : d.getDate()}</span>
                          {!invalid && tasksForDay.length > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 h-5 min-w-[20px] px-1 text-[10px]">
                              {tasksForDay.length}
                            </span>
                          )}
                        </div>
                        {!invalid && status !== 'none' && (
                          <span className={`${dotClass} absolute left-1.5 top-1.5`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string; color: string }) => (
  <div className="bg-white rounded-lg shadow-lg p-5 flex items-start">
    <div className={`rounded-lg p-3 ${color}`}>{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

type Props = { hideAllMembersReports?: boolean };

const WorkReportsDashboard: React.FC<Props> = ({ hideAllMembersReports }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notes, setNotes] = useState<Record<string, any>>(() => {
    try { const raw = localStorage.getItem('ets_work_notes'); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const isTeamView = useMemo(() => {
    if (!user) return false;
    if (hideAllMembersReports) return false;
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.HR;
  }, [user, hideAllMembersReports]);
  const [isTeamModal, setIsTeamModal] = useState<boolean>(false);
  const [teamDrafts, setTeamDrafts] = useState<Record<string, string>>({});
  const [teamEditing, setTeamEditing] = useState<Record<string, boolean>>({});
  // Admin modal helpers: search + pagination for large lists
  const [adminMgrQuery, setAdminMgrQuery] = useState<string>('');
  const [adminEmpQuery, setAdminEmpQuery] = useState<string>('');
  const [adminMgrPage, setAdminMgrPage] = useState<number>(1);
  const [adminEmpPage, setAdminEmpPage] = useState<number>(1);
  const ADMIN_PAGE_SIZE = 20;
  // Remote reports fetched from GET API for the selected day
  const [remoteReports, setRemoteReports] = useState<Record<string, { text: string; savedAt?: string; reportId?: string }>>({});

  // Tombstone helpers: avoid rehydrating a note from remote after local delete
  const tombstoneKey = (ymd: string, uid: string) => `ets_wr_deleted_${uid}_${ymd}`;
  const markDeleted = (ymd: string, uid?: string) => {
    const id = uid || (user?.id ? String(user.id) : '');
    if (!id) return;
    try { sessionStorage.setItem(tombstoneKey(ymd, id), '1'); } catch {}
  };
  const isDeleted = (ymd: string, uid?: string) => {
    const id = uid || (user?.id ? String(user.id) : '');
    if (!id) return false;
    try { return sessionStorage.getItem(tombstoneKey(ymd, id)) === '1'; } catch { return false; }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [u, allTasks, allProjects] = await Promise.all([
          DataService.getUsers(),
          DataService.getAllTasks(),
          DataService.getAllProjects()
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(u) ? u : []);
        const t = Array.isArray(allTasks) ? allTasks : [];
        setTasks(t);
        setProjects(Array.isArray(allProjects) ? allProjects : []);
      } catch {
        if (!cancelled) {
          setUsers([]);
          setTasks([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Helper to fetch remote work reports for a given date (used by effect and after POST/EDIT)
  const fetchRemoteReportsForDate = async (ymd: string) => {
    const parseToMap = async (url: string) => {
      const apiKey = (typeof window !== 'undefined'
        ? (localStorage.getItem('ets_wr_get_api_key') || localStorage.getItem('ets_api_key') || localStorage.getItem('ets_roles_api_key'))
        : null)
        || (import.meta as any).env?.VITE_WORK_REPORTS_GET_API_KEY
        || (import.meta as any).env?.VITE_WORK_REPORTS_API_KEY
        || (import.meta as any).env?.VITE_ROLES_API_KEY
        || '';
      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey as string;
      const res = await fetch(url, { headers });
      if (res.status === 403) {
        try { if (typeof window !== 'undefined') sessionStorage.setItem('ets_wr_forbidden', '1'); } catch {}
        return {} as Record<string, { text: string; savedAt?: string; reportId?: string }>;
      }
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      const arrSrc = Array.isArray(body?.items) ? body.items : (Array.isArray(body?.reports) ? body.reports : (Array.isArray(body) ? body : []));
      const arr: any[] = arrSrc || [];
      const map: Record<string, { text: string; savedAt?: string; reportId?: string }> = {};
      try {
        const idsPreview = (arr || []).slice(0, 10).map((it: any) => (
          it?.userId || it?.employeeId || it?.user_id || it?.employee_id || it?.employee?.id || it?.user?.id || it?.employeeEmail || it?.email
        ));
        // eslint-disable-next-line no-console
        console.debug('WorkReports GET', { url, count: arr.length || 0, idsPreview });
      } catch {}
      arr.forEach((it: any) => {
        // Normalize user id
        let uid = (
          it?.userId || it?.employeeId || it?.user_id || it?.employee_id || it?.employee?.id || it?.user?.id
        );
        // Fallback to email mapping
        const emailCandidate = it?.employeeEmail || it?.email || it?.employee_email || it?.employee?.email || it?.user?.email;
        if (!uid && emailCandidate) {
          const match = (users || []).find(u => (u.email || '').toLowerCase() === String(emailCandidate).toLowerCase());
          if (match) uid = match.id;
        }
        if (!uid) return;
        const key = String(uid);
        // Normalize text/content
        const textRaw = it?.summary ?? it?.message ?? it?.text ?? it?.content ?? it?.description ?? '';
        const text = String(textRaw || '');
        // Normalize timestamp
        const tsRaw = it?.savedAt ?? it?.timestamp ?? it?.updatedAt ?? it?.updated_at ?? it?.createdAt ?? it?.created_at;
        const savedAt = typeof tsRaw === 'string' ? tsRaw : (typeof tsRaw === 'number' ? new Date(tsRaw).toISOString() : undefined);
        // Determine the effective report date YMD and strictly filter by the selected day
        const reportDateRaw = it?.reportDate ?? it?.date ?? it?.day;
        let itemYmd: string | undefined;
        if (typeof reportDateRaw === 'string' && reportDateRaw.length >= 10) {
          itemYmd = reportDateRaw.slice(0, 10);
        } else if (savedAt) {
          try {
            const d = new Date(savedAt);
            itemYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          } catch {}
        }
        if (itemYmd && itemYmd !== ymd) return; // skip cross-date entries from backend
        // Normalize report id
        const reportIdRaw = it?.reportId ?? it?.id ?? it?._id;
        const reportId = typeof reportIdRaw === 'string' ? reportIdRaw : (reportIdRaw != null ? String(reportIdRaw) : undefined);
        if (text && text.trim()) map[key] = { text, savedAt, reportId };
      });
      return map;
    };

    const cid = user?.companyId ? `&companyId=${encodeURIComponent(user.companyId)}` : '';
    const keyCandidate = (
      (typeof window !== 'undefined'
        ? (localStorage.getItem('ets_wr_get_api_key') || localStorage.getItem('ets_api_key') || localStorage.getItem('ets_roles_api_key'))
        : null)
      || (import.meta as any).env?.VITE_WORK_REPORTS_GET_API_KEY
      || (import.meta as any).env?.VITE_WORK_REPORTS_API_KEY
      || (import.meta as any).env?.VITE_ROLES_API_KEY
      || ''
    );
    const warned = typeof window !== 'undefined' ? sessionStorage.getItem('ets_wr_warned_get') === '1' : true;
    if (!keyCandidate) {
      // Do not show any toast; just skip network and return empty
      if (!warned) { try { sessionStorage.setItem('ets_wr_warned_get', '1'); } catch {} }
      setRemoteReports({});
      return {} as Record<string, { text: string; savedAt?: string; reportId?: string }>;
    }
    // If we already got a 403 earlier in this session, don't spam further requests
    const forbiddenOnce = typeof window !== 'undefined' ? sessionStorage.getItem('ets_wr_forbidden') === '1' : false;
    if (forbiddenOnce) {
      setRemoteReports({});
      return {} as Record<string, { text: string; savedAt?: string; reportId?: string }>;
    }
    const proxyNoSlash = `/api-work-reports/work-reports?reportDate=${encodeURIComponent(ymd)}`;
    const proxyWithSlash = `/api-work-reports/work-reports/?reportDate=${encodeURIComponent(ymd)}`;
    const directBase = 'https://83eaugq1sc.execute-api.ap-south-1.amazonaws.com/prod/work-reports';
    const baseNoSlash = `${directBase}?reportDate=${encodeURIComponent(ymd)}`;
    const baseWithSlash = `${directBase}/?reportDate=${encodeURIComponent(ymd)}`;
    // Prefer proxy first; fallback to direct AWS endpoints (requires CORS + x-api-key)
    const candidates = [
      `${proxyNoSlash}${cid}`,
      proxyNoSlash,
      `${proxyWithSlash}${cid}`,
      proxyWithSlash,
      `${baseNoSlash}${cid}`,
      baseNoSlash,
      `${baseWithSlash}${cid}`,
      baseWithSlash,
    ];
    let map = {} as Record<string, { text: string; savedAt?: string; reportId?: string }>;
    for (const url of candidates) {
      try {
        map = await parseToMap(url);
        if (Object.keys(map).length > 0) break;
      } catch {
        // try next
      }
    }
    try {
      const selfId = user?.id ? String(user.id) : '';
      if (selfId && isDeleted(ymd, selfId)) {
        const filtered = { ...map } as typeof map;
        delete filtered[selfId];
        setRemoteReports(filtered);
        return filtered;
      }
    } catch {}
    setRemoteReports(map);
    return map;
  };

  // Fetch remote work reports for the selected date (GET API)
  useEffect(() => {
    if (!selectedDate) { setRemoteReports({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchRemoteReportsForDate(selectedDate);
        if (cancelled) return;
        setRemoteReports(map);
      } catch {
        if (!cancelled) setRemoteReports({});
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, user, users]);

  // When Team modal opens for a specific date, hydrate from remote GET to ensure latest view
  useEffect(() => {
    if (!isTeamView) return;
    if (!isTeamModal) return;
    if (!selectedDate) return;
    void (async () => {
      try { await fetchRemoteReportsForDate(selectedDate); } catch {}
    })();
  }, [isTeamView, isTeamModal, selectedDate]);

  // --- Helper: Send Work Report to external API ---
  const postWorkReport = async (reporter: User, summary: string, reportDate?: string) => {
    try {
      // If no create API key is available, skip remote sync silently
      const createKeyCandidate = (
        (typeof window !== 'undefined'
          ? (localStorage.getItem('ets_wr_create_api_key') || localStorage.getItem('ets_api_key') || localStorage.getItem('ets_roles_api_key'))
          : null)
        || (import.meta as any).env?.VITE_WORK_REPORTS_CREATE_API_KEY
        || (import.meta as any).env?.VITE_WORK_REPORTS_API_KEY
        || (import.meta as any).env?.VITE_ROLES_API_KEY
        || ''
      );
      const hasCreateKey = !!(createKeyCandidate && String(createKeyCandidate).trim());
      if (!hasCreateKey) {
        return; // local save already happened; do not attempt remote
      }
      // Prefer full user object from state to avoid missing org fields
      const full = (users || []).find(u => String(u.id) === String((reporter as any)?.id));
      const src = full || reporter;

      // Resolve org data lazily with multi-source inference
      let companyId = src.companyId || '';
      let companyName = '';
      let deptId = (src.departmentIds && src.departmentIds[0]) || '';
      let departmentName = '';

      // If department missing, infer from first assigned task's project
      if (!deptId) {
        try {
          const uid = String((src as any)?.id);
          const t = (tasks || []).find(t => (t.assigneeIds || []).map(String).includes(uid));
          if (t) {
            const proj = (projects || []).find(p => String(p.id) === String(t.projectId));
            if (proj && (proj.departmentIds || []).length > 0) {
              deptId = proj.departmentIds[0];
              if (!companyId && proj.companyId) companyId = proj.companyId;
            }
          }
        } catch {}
      }
      try {
        // Resolve department details (name and possibly companyId if reporter lacks it)
        if (deptId) {
          const allDepts = await DataService.getDepartments();
          const dept = allDepts.find(d => d.id === deptId);
          departmentName = dept?.name || '';
          if (!companyId && dept?.companyId) {
            companyId = dept.companyId;
          }
        }
      } catch {}
      try {
        // Resolve company name if we have a companyId by now (use API-backed companies list)
        if (companyId) {
          const companies = await DataService.getCompanies();
          const cid = String(companyId).toLowerCase();
          const c = companies.find(co => String(co.id).toLowerCase() === cid);
          companyName = c?.name || '';
        }
      } catch {}
      // Fallback: if companyName still empty, use any value present on the user
      if (!companyName) {
        companyName = (src as any)?.companyName || '';
      }
      // Last-resort fallbacks to avoid empty names in payload
      if (!companyName && companyId) companyName = companyId;
      if (!departmentName && deptId) departmentName = deptId;

      const managers: string[] = Array.isArray(src.managerIds)
        ? src.managerIds
        : (src.managerId ? [src.managerId] : []);

      const userIdValue = (src as any)?.id || (src as any)?._id || (src as any)?.userId || '';
      const nameSanitized = String(src.name || '').replace(/[^\p{L}\p{N} .,'-]/gu, '').trim();
      const roleNormalized = 'EMPLOYEE';
      const emailRaw = String(src.email || '').trim();
      const emailValid = /^(?=.{3,254}$)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(emailRaw);
      const managersArr = Array.isArray(src.managerIds) ? src.managerIds.map(String) : (src.managerId ? [String(src.managerId)] : []);
      const basePayload: any = {
        employeeId: userIdValue,
        userId: userIdValue,
        employeeName: nameSanitized,
        role: 'EMPLOYEE',
        summary: summary || '',
        reportDate: reportDate || new Date().toISOString().slice(0,10),
        companyId: companyId,
        companyName: companyName,
        departmentId: deptId,
        departmentName: departmentName,
        managers: managersArr,
      };
      if (emailValid) basePayload.employeeEmail = emailRaw.toLowerCase();
      const payload = basePayload;

      // Light retry for eventual consistency with endpoint caching
      let lastErr: any = null;
      // 1) Try cached successful URL first
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem('ets_wr_create_url') : null;
        if (cached) {
          const apiKey = createKeyCandidate;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['x-api-key'] = apiKey as string;
          const res = await fetch(cached, { method: 'POST', headers, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(await res.text());
          lastErr = null;
        } else {
          throw new Error('no cached url');
        }
      } catch (e) {
        // 2) Fallback list and cache the first success
        const createUrls = [
          // Proxied paths (proxy can inject x-api-key)
          '/api-work-reports-create/work-reports',
          '/api-work-reports-create/work-reports/',
          // Direct AWS endpoint
          'https://907wl6xmsi.execute-api.ap-south-1.amazonaws.com/prod/work-reports',
        ];
        let succeeded = false;
        for (let attempt = 0; attempt < createUrls.length; attempt++) {
          try {
            const apiKey = createKeyCandidate;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) headers['x-api-key'] = apiKey as string;
            const url = createUrls[attempt];
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || 'Failed to submit work report');
            }
            succeeded = true;
            lastErr = null;
            try { localStorage.setItem('ets_wr_create_url', url); } catch {}
            break;
          } catch (e2) {
            lastErr = e2;
            await new Promise(r => setTimeout(r, 300));
          }
        }
        if (!succeeded) throw lastErr;
      }
      setToast({ message: 'Work report synced!', type: 'success' });
      // Refresh remote reports for this date so Admin/Manager can see immediately
      const ymd = reportDate || new Date().toISOString().slice(0,10);
      try { await fetchRemoteReportsForDate(ymd); } catch {}
    } catch (e: any) {
      // Silent: local save already succeeded; do not surface sync errors
    }
  };

  // --- Helper: Edit existing Work Report by reportId ---
  const editWorkReport = async (reportId: string, summary: string, ymdForRefresh?: string) => {
    try {
      // If no edit API key is available, skip remote sync silently
      const editKeyCandidate = (
        (typeof window !== 'undefined'
          ? (localStorage.getItem('ets_wr_edit_api_key') || localStorage.getItem('ets_api_key') || localStorage.getItem('ets_roles_api_key'))
          : null)
        || (import.meta as any).env?.VITE_WORK_REPORTS_EDIT_API_KEY
        || (import.meta as any).env?.VITE_WORK_REPORTS_API_KEY
        || (import.meta as any).env?.VITE_ROLES_API_KEY
        || ''
      );
      const hasEditKey = !!(editKeyCandidate && String(editKeyCandidate).trim());
      if (!hasEditKey) {
        return; // do not attempt remote update
      }
      const payload = {
        reportId,
        timestamp: Date.now(),
        update: { summary },
      } as const;
      // Try multiple endpoint shapes; consider success if ANY works
      let lastErr: any = null;
      let succeeded = false;
      const employeeId = user?.id ? String(user.id) : undefined;
      const reportDate = ymdForRefresh;
      const candidates: Array<{ url: string; method: 'POST' | 'PUT' | 'PATCH'; body: any; bodyType: 'payload' | 'flat' | 'qs' | 'rest' }> = [
        // Prefer proxied edit endpoints first (proxy injects x-api-key and handles CORS)
        { url: '/api-work-reports-edit/work-reports/edit-by-user', method: 'POST', body: payload, bodyType: 'payload' },
        { url: '/api-work-reports-edit/work-reports/edit-by-user/', method: 'POST', body: payload, bodyType: 'payload' },
        { url: '/api-work-reports-edit/work-reports/edit-by-user', method: 'POST', body: { reportId, summary }, bodyType: 'flat' },
        { url: '/api-work-reports-edit/work-reports/edit-by-user/', method: 'POST', body: { reportId, summary }, bodyType: 'flat' },
        // Querystring variants via proxy
        { url: `/api-work-reports-edit/work-reports/edit-by-user?reportId=${encodeURIComponent(reportId)}`, method: 'POST', body: { summary }, bodyType: 'qs' },
        { url: `/api-work-reports-edit/work-reports/edit?reportId=${encodeURIComponent(reportId)}`, method: 'POST', body: { summary }, bodyType: 'qs' },
        // RESTful id routes via proxy
        { url: `/api-work-reports-edit/work-reports/${encodeURIComponent(reportId)}`, method: 'PUT', body: { summary }, bodyType: 'rest' },
        { url: `/api-work-reports-edit/work-reports/${encodeURIComponent(reportId)}`, method: 'PATCH', body: { summary }, bodyType: 'rest' },
      ];
      // 0) If we have a cached preferred endpoint, try it first
      try {
        const cachedRaw = typeof window !== 'undefined' ? localStorage.getItem('ets_wr_edit_endpoint') : null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { url: string; method: 'POST'|'PUT'|'PATCH'; bodyType: 'payload'|'flat'|'id'|'rest'|'qs' };
          // If cached URL is direct AWS domain, drop it to force proxy usage
          if (cached.url && cached.url.startsWith('http')) {
            try { localStorage.removeItem('ets_wr_edit_endpoint'); } catch {}
            throw new Error('invalid cached direct url');
          }
          const apiKey = editKeyCandidate;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers['x-api-key'] = apiKey as string;
          let body: any = payload;
          if (cached.bodyType === 'flat') body = { reportId, summary };
          else if (cached.bodyType === 'id') body = { id: reportId, summary };
          else if (cached.bodyType === 'rest') body = { summary };
          else if (cached.bodyType === 'qs') body = { summary };
          const res = await fetch(cached.url, { method: cached.method, headers, body: JSON.stringify(body) });
          if (!res.ok) {
            // Cached endpoint no longer valid; remove and fall back
            try { localStorage.removeItem('ets_wr_edit_endpoint'); } catch {}
            throw new Error(await res.text());
          }
          lastErr = null;
          succeeded = true;
        } else {
          throw new Error('no cached endpoint');
        }
      } catch (e) {
        // 1) Try proxied and direct variants
        for (let i = 0; !succeeded && i < candidates.length; i++) {
          const c = candidates[i];
          try {
            const apiKey = editKeyCandidate;
            if (!apiKey) break; // no key -> skip network
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            headers['x-api-key'] = apiKey as string;
            const res = await fetch(c.url, { method: c.method, headers, body: JSON.stringify(c.body) });
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || 'Failed to edit work report');
            }
            succeeded = true;
            lastErr = null;
            try { localStorage.setItem('ets_wr_edit_endpoint', JSON.stringify({ url: c.url, method: c.method, bodyType: c.bodyType })); } catch {}
          } catch (e2) {
            lastErr = e2;
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }
      if (!succeeded) throw lastErr || new Error('Edit failed');
      setToast({ message: 'Work report updated!', type: 'success' });
      // Refresh for the same date
      if (ymdForRefresh) { try { await fetchRemoteReportsForDate(ymdForRefresh); } catch {} }
    } catch (e: any) {
      // Silent: do not surface edit sync errors
    }
  };

  const filteredTasks = useMemo(() => {
    if (!user) return [] as Task[];
    const isSelfView = hideAllMembersReports || user.role === UserRole.EMPLOYEE;
    if (isSelfView) {
      return tasks.filter(t => (t.assigneeIds || []).includes(user.id));
    }
    return tasks;
  }, [tasks, user, hideAllMembersReports]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgress = filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    return { total, completed, inProgress };
  }, [filteredTasks]);

  const noteKey = (ymd: string, uid?: string) => `${uid || user?.id || 'all'}:${ymd}`;
  const getNote = (ymd: string): { text: string; savedAt?: string } | undefined => {
    const v = notes[noteKey(ymd)];
    if (!v) return undefined;
    if (typeof v === 'string') return { text: String(v) };
    if (typeof v === 'object') return { text: String(v.text || ''), savedAt: typeof v.savedAt === 'string' ? v.savedAt : undefined };
    return undefined;
  };
  const getNoteForUser = (ymd: string, uid: string): { text: string; savedAt?: string } | undefined => {
    const v = notes[noteKey(ymd, uid)];
    if (v) {
      if (typeof v === 'string') return { text: String(v) };
      if (typeof v === 'object') return { text: String(v.text || ''), savedAt: typeof v.savedAt === 'string' ? v.savedAt : undefined };
    }
    if (isDeleted(ymd, uid)) return undefined;
    // Fallback to remote reports fetched via GET API
    const remote = remoteReports[String(uid)];
    if (remote && (remote.text || '').trim()) return remote;
    return undefined;
  };
  const getStatusFor = (ymd: string): 'submitted' | 'missed' | 'late' | 'none' => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      // Parse YYYY-MM-DD safely as local date start
      const [yy, mm, dd] = ymd.split('-').map(n => parseInt(n, 10));
      if (!yy || !mm || !dd) return 'none';
      const dayStart = new Date(yy, mm - 1, dd);

      if (isTeamView) {
        // Admins should not see missed/today indicators on the calendar
        if (user?.role === UserRole.ADMIN) {
          return 'none';
        }
        // Manager view status must be based on MANAGER's own submission only
        const managerId = user?.id ? String(user.id) : '';
        if (managerId) {
          const selfNote = getNoteForUser(ymd, managerId);
          const text = selfNote?.text?.trim();
          if (text) {
            if (selfNote?.savedAt) {
              const saved = new Date(selfNote.savedAt);
              const savedStart = new Date(saved.getFullYear(), saved.getMonth(), saved.getDate());
              if (savedStart > dayStart) return 'late';
            }
            return 'submitted';
          }
        }
        // No manager report
        if (dayStart < todayStart) return 'missed';
        return 'none';
      }

      // Individual view
      const note = getNote(ymd);
      if (note && note.text && note.text.trim().length > 0) {
        if (note.savedAt) {
          const saved = new Date(note.savedAt);
          const savedStart = new Date(saved.getFullYear(), saved.getMonth(), saved.getDate());
          if (savedStart > dayStart) return 'late';
        }
        return 'submitted';
      }
      // Only mark missed for days strictly before today
      if (dayStart < todayStart) return 'missed';
      return 'none';
    } catch { return 'none'; }
  };
  const openNoteFor = (ymd: string) => {
    setSelectedDate(ymd);
    if (isTeamView) {
      setIsTeamModal(true);
      setIsEditing(false);
      return;
    }
    const existing = getNote(ymd)?.text || '';
    setDraft(existing);
    setIsEditing(existing.trim().length === 0);
    // Immediately hydrate this day from remote if local is empty
    if (!existing.trim()) {
      const selfId = user?.id ? String(user.id) : '';
      if (selfId && !isDeleted(ymd, selfId)) {
        void (async () => {
          try {
            const map = await fetchRemoteReportsForDate(ymd);
            const remote = map[selfId];
            if (remote && (remote.text || '').trim()) {
              setDraft(remote.text);
              setIsEditing(true);
              const key = noteKey(ymd);
              const merged = { ...notes, [key]: { text: remote.text, savedAt: remote.savedAt || new Date().toISOString() } } as Record<string, any>;
              setNotes(merged);
              try { localStorage.setItem('ets_work_notes', JSON.stringify(merged)); } catch {}
            }
          } catch {}
        })();
      }
    }
  };


  // If no local draft for the selected date, prefill from remote GET data when available
  useEffect(() => {
    if (!selectedDate || isTeamView) return;
    if (draft && draft.trim().length > 0) return;
    const selfId = user?.id ? String(user.id) : '';
    if (selfId && !isDeleted(selectedDate, selfId)) {
      const remote = remoteReports[selfId];
      if (remote && (remote.text || '').trim()) {
        setDraft(remote.text);
        setIsEditing(true);
      }
    }
  }, [remoteReports, selectedDate, isTeamView, user, draft]);

  // One-time reconciliation: clear wrongly hydrated notes in current month (employee view only)
  useEffect(() => {
    if (!user || isTeamView) return;
    try {
      const today = new Date();
      const ymTag = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const selfId = String(user.id || '');
      if (!selfId) return;
      const sessionKey = `ets_work_notes_reconciled_${selfId}_${ymTag}`;
      if (sessionStorage.getItem(sessionKey) === '1') return;

      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let cancelled = false;
      (async () => {
        const next = { ...notes } as Record<string, any>;
        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
          const day = new Date(d);
          const ymd = toYmd(day);
          const k = `${selfId}:${ymd}`;
          if (!(k in next)) continue;
          try {
            const map = await fetchRemoteReportsForDate(ymd);
            const remote = map[selfId];
            // If backend has a report, update local; otherwise keep local note intact
            if (remote && (remote.text || '').trim()) {
              const existing = next[k] || {};
              next[k] = { text: remote.text, savedAt: remote.savedAt || existing.savedAt };
            }
          } catch { /* ignore and keep existing note */ }
          if (cancelled) return;
        }
        if (!cancelled) {
          setNotes(next);
          try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
          sessionStorage.setItem(sessionKey, '1');
        }
      })();
      return () => { cancelled = true; };
    } catch {}
  }, [user, isTeamView]);
  const saveNote = () => {
    if (!selectedDate) return;
    const ymd = selectedDate; // preserve before clearing
    const key = noteKey(selectedDate);
    const next = { ...notes, [key]: { text: draft, savedAt: new Date().toISOString() } };
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setSelectedDate(null);
    setDraft('');
    setToast({ message: 'Report saved successfully!', type: 'success' });
    // Fire-and-forget sync to external API for the current user
    if (user && draft.trim()) {
      const uid = String(user.id);
      const existing = remoteReports[uid];
      if (existing?.reportId) {
        void editWorkReport(existing.reportId, draft.trim(), ymd);
      } else {
        void postWorkReport(user, draft.trim(), ymd);
      }
    }
  };
  const deleteNote = () => {
    if (!selectedDate) return;
    const key = noteKey(selectedDate);
    const next = { ...notes } as Record<string, any>;
    delete next[key];
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    // mark tombstone for current user/date to avoid rehydration
    try { markDeleted(selectedDate); } catch {}
    // Also clear remote report if one exists so others don't see stale data
    try {
      const ymd = selectedDate;
      const uid = user?.id ? String(user.id) : '';
      if (uid) {
        const existing = remoteReports[uid];
        if (existing?.reportId) {
          // Use edit endpoint to blank out the report summary
          void editWorkReport(existing.reportId, '', ymd);
        }
      }
    } catch {}
    // Refresh remote cache for the same date to update UI instantly
    try { if (selectedDate) { void fetchRemoteReportsForDate(selectedDate); } } catch {}
    setSelectedDate(null);
    setDraft('');
    setToast({ message: 'Report deleted successfully!', type: 'success' });
  };
  const closeModal = () => { setSelectedDate(null); setDraft(''); };

  const saveTeamNoteForUser = (uid: string) => {
    if (!selectedDate) return;
    const ymd = selectedDate; // preserve before clearing
    const text = (teamDrafts[uid] || '').trim();
    if (!text) return;
    const key = noteKey(selectedDate, uid);
    const next = { ...notes, [key]: { text, savedAt: new Date().toISOString() } };
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setTeamDrafts(prev => ({ ...prev, [uid]: '' }));
    setTeamEditing(prev => ({ ...prev, [uid]: false }));
    setToast({ message: 'Report added successfully!', type: 'success' });
    // Sync manager self-report to external API
    const reporter = users.find(u => u.id === uid) || user;
    if (reporter && text) {
      const existing = remoteReports[String(uid)];
      if (existing?.reportId) {
        void editWorkReport(existing.reportId, text, ymd);
      } else {
        void postWorkReport(reporter, text, ymd);
      }
    }
  };

  const startEditTeamNote = (uid: string, currentText: string) => {
    setTeamEditing(prev => ({ ...prev, [uid]: true }));
    setTeamDrafts(prev => ({ ...prev, [uid]: currentText }));
  };

  const cancelEditTeamNote = (uid: string) => {
    setTeamEditing(prev => ({ ...prev, [uid]: false }));
    setTeamDrafts(prev => ({ ...prev, [uid]: '' }));
  };

  const deleteTeamNoteForUser = (uid: string) => {
    if (!selectedDate) return;
    const key = noteKey(selectedDate, uid);
    const next = { ...notes } as Record<string, any>;
    delete next[key];
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setTeamEditing(prev => ({ ...prev, [uid]: false }));
    setTeamDrafts(prev => ({ ...prev, [uid]: '' }));
    // mark tombstone for that user/date
    try { markDeleted(selectedDate, uid); } catch {}
    // Also clear remote report for that user if one exists so managers/admins don't see stale data
    try {
      const ymd = selectedDate;
      const existing = remoteReports[String(uid)];
      if (existing?.reportId) {
        void editWorkReport(existing.reportId, '', ymd);
      }
    } catch {}
    // Refresh remote cache for the same date to update UI instantly
    try { if (selectedDate) { void fetchRemoteReportsForDate(selectedDate); } } catch {}
    setToast({ message: 'Report deleted successfully!', type: 'success' });
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Work Reports</h1>
          <p className="text-slate-600">
            {user ? (
              hideAllMembersReports || user.role === UserRole.EMPLOYEE
                ? 'Your personal tasks overview'
                : 'Team tasks overview'
            ) : (
              'Please sign in.'
            )}
          </p>
        </div>
        <button
          onClick={() => {
            // re-run effect by toggling loading and calling loaders
            setIsLoading(true);
            Promise.all([
              DataService.getUsers(),
              DataService.getAllTasks(),
              DataService.getAllProjects()
            ]).then(([u, t, p]) => {
              setUsers(Array.isArray(u) ? u : []);
              setTasks(Array.isArray(t) ? t : []);
              setProjects(Array.isArray(p) ? p : []);
            }).finally(() => setIsLoading(false));
          }}
          disabled={isLoading}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
          aria-label="Refresh data"
        >
          <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<ClipboardListIcon />} title="Total Tasks" value={`${stats.total}`} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={<CheckCircleIcon />} title="Completed" value={`${stats.completed}`} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={<ClockIcon />} title="In Progress" value={`${stats.inProgress}`} color="bg-amber-100 text-amber-600" />
      </div>

      <TaskCalendar
        tasks={filteredTasks}
        users={users}
        currentUserRole={user?.role}
        currentUserId={user?.id}
        onDayClick={openNoteFor}
        getStatus={getStatusFor}
      />
      {selectedDate && isTeamView && isTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
              <h3 className="text-2xl font-bold text-slate-800">Team Work Reports • {selectedDate}</h3>
              <button onClick={() => { setIsTeamModal(false); setSelectedDate(null); }} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-6 max-h-[72vh] overflow-y-auto">
              {(() => {
                // Manager view with assigned employees
                const managerId = user?.id ? String(user.id) : '';
                const managerNote = managerId ? getNoteForUser(selectedDate, managerId) : undefined;
                const managerText = managerNote?.text || '';
                const managerSavedAt = managerNote?.savedAt ? new Date(managerNote.savedAt).toLocaleString() : undefined;
                // Determine if selected date is in the past, today, or future
                let isPastDay = false;
                try {
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const [yy, mm, dd] = String(selectedDate).split('-').map(n => parseInt(n, 10));
                  if (yy && mm && dd) {
                    const dayStart = new Date(yy, mm - 1, dd);
                    isPastDay = dayStart < todayStart;
                  }
                } catch {}

                // Employees assigned under this manager
                // Build comprehensive team for manager
                const managedProjects = (projects || []).filter(p => (p.managerIds || []).map(String).includes(managerId));
                const managedProjectIds = new Set(managedProjects.map(p => p.id));
                const managedDeptIds = new Set<string>(managedProjects.flatMap(p => p.departmentIds || []));
                const employeeIdsFromManagedTasks = new Set<string>();
                (tasks || []).forEach(t => {
                  if (managedProjectIds.has(t.projectId)) {
                    (t.assigneeIds || []).forEach(id => employeeIdsFromManagedTasks.add(String(id)));
                  }
                });
                const byId: Record<string, User> = {};
                (users || []).forEach(u => {
                  if (String(u.id) === managerId) return;
                  if (u.role !== UserRole.EMPLOYEE) return;
                  const direct = u.managerId ? String(u.managerId) === managerId : false;
                  const multiMgr = Array.isArray(u.managerIds) ? u.managerIds.map(String).includes(managerId) : false;
                  const inDept = (u.departmentIds || []).some(id => managedDeptIds.has(id));
                  const fromTasks = employeeIdsFromManagedTasks.has(String(u.id));
                  if (direct || multiMgr || inDept || fromTasks) {
                    byId[String(u.id)] = u;
                  }
                });
                // Include anyone with a REMOTE report for this date (even if not in current users list)
                try {
                  Object.keys(remoteReports || {}).forEach(uid => {
                    if (String(uid) === String(managerId)) return; // never include manager in employee list
                    // If we already have the user, keep as is; else create a stub employee
                    if (!byId[String(uid)]) {
                      const remote = remoteReports[String(uid)];
                      if (remote && (remote.text || '').trim()) {
                        const known = (users || []).find(u => String(u.id) === String(uid));
                        if (known && known.role === UserRole.EMPLOYEE) {
                          byId[String(uid)] = known;
                        } else if (!known) {
                          const stub: User = {
                            id: String(uid),
                            name: 'Employee',
                            email: '',
                            role: UserRole.EMPLOYEE,
                            status: 'Active',
                            joinedDate: new Date().toISOString(),
                          } as User;
                          byId[String(uid)] = stub;
                        }
                      }
                    }
                  });
                } catch {}
                // Include anyone with a note for this date (from users list)
                (users || []).forEach(u => {
                  if (u.role !== UserRole.EMPLOYEE) return;
                  const note = getNoteForUser(selectedDate, u.id);
                  if (note && (note.text || '').trim().length > 0) {
                    byId[String(u.id)] = u;
                  }
                });
                // Also include note-only user IDs not present in users list (create stubs)
                try {
                  const noteUserIds = Object.keys(notes || {}).filter(k => k.endsWith(`:${selectedDate}`)).map(k => k.split(':')[0]);
                  noteUserIds.forEach(uid => {
                    if (String(uid) === String(managerId)) return; // never include manager in employee list
                    if (!byId[String(uid)]) {
                      const note = getNoteForUser(selectedDate, uid);
                      if (note && (note.text || '').trim().length > 0) {
                        const stub: User = {
                          id: String(uid),
                          name: 'Employee',
                          email: '',
                          role: UserRole.EMPLOYEE,
                          status: 'Active',
                          joinedDate: new Date().toISOString(),
                        } as User;
                        byId[String(uid)] = stub;
                      }
                    }
                  });
                } catch {}
                const assignedEmployees = Object.values(byId);
                // Build employees list for the right column
                // Manager view: show ONLY employees who saved a report for this date
                let employeesForDate = assignedEmployees.filter(u => {
                  const note = getNoteForUser(selectedDate, u.id);
                  return !!(note && (note.text || '').trim().length > 0);
                });

                // Always augment from remoteReports for the date to ensure visibility even if assignment links are missing
                try {
                  const existingIds = new Set(employeesForDate.map(u => String(u.id)));
                  const managerIdsSet = new Set((users || []).filter(u => u.role === UserRole.MANAGER).map(u => String(u.id)));
                  Object.keys(remoteReports || {}).forEach(uid => {
                    if (String(uid) === String(managerId)) return; // skip manager self
                    if (managerIdsSet.has(String(uid))) return; // skip managers in employee list
                    if (existingIds.has(String(uid))) return;
                    const remote = remoteReports[String(uid)];
                    if (!remote || !(remote.text || '').trim()) return;
                    const known = (users || []).find(u => String(u.id) === String(uid));
                    if (known && known.role === UserRole.EMPLOYEE) {
                      employeesForDate.push(known);
                      existingIds.add(String(uid));
                    } else if (!known) {
                      const stub: User = {
                        id: String(uid),
                        name: 'Employee',
                        email: '',
                        role: UserRole.EMPLOYEE,
                        status: 'Active',
                        joinedDate: new Date().toISOString(),
                      } as User;
                      employeesForDate.push(stub);
                      existingIds.add(String(uid));
                    }
                  });
                } catch {}

                const isAdmin = user?.role === UserRole.ADMIN;
                const sectionLabel = isAdmin ? 'Admin Report' : 'Manager Report';

                // Managers present on this date (for Admin view)
                const managerUsers = (users || []).filter(u => u.role === UserRole.MANAGER);
                let managersForDate = managerUsers.filter(u => {
                  const note = getNoteForUser(selectedDate, u.id);
                  if (note && (note.text || '').trim().length > 0) return true;
                  const hasTask = (tasks || []).some(t => (t.assigneeIds || []).includes(u.id) && String(t.dueDate || '').slice(0,10) === selectedDate);
                  return hasTask;
                });

                // For Admin: show only users who actually have report text; if none, render neutral message card
                if (isAdmin) {
                  managersForDate = managerUsers.filter(u => {
                    const note = getNoteForUser(selectedDate, u.id);
                    return !!(note && (note.text || '').trim().length > 0);
                  });
                  employeesForDate = (users || []).filter(u => u.role === UserRole.EMPLOYEE).filter(u => {
                    const note = getNoteForUser(selectedDate, u.id);
                    return !!(note && (note.text || '').trim().length > 0);
                  });
                  // Augment with any note-only user IDs so reports are visible even if user list misses them
                  try {
                    const noteUserIds = Object.keys(notes || {}).filter(k => k.endsWith(`:${selectedDate}`)).map(k => k.split(':')[0]);
                    const existingIds = new Set(employeesForDate.map(u => String(u.id)));
                    const managerIdsSet = new Set(managerUsers.map(m => String(m.id)));
                    noteUserIds.forEach(uid => {
                      if (managerIdsSet.has(String(uid))) return; // do not add manager notes to employee list
                      if (!existingIds.has(String(uid))) {
                        const note = getNoteForUser(selectedDate, uid);
                        if (note && (note.text || '').trim().length > 0) {
                          const stub: User = {
                            id: String(uid),
                            name: 'Employee',
                            email: '',
                            role: UserRole.EMPLOYEE,
                            status: 'Active',
                            joinedDate: new Date().toISOString(),
                          } as User;
                          employeesForDate.push(stub);
                        }
                      }
                    });
                    // Also augment with any REMOTE-only report user IDs from the GET API
                    Object.keys(remoteReports || {}).forEach(uid => {
                      if (managerIdsSet.has(String(uid))) return; // don't add managers to employee list
                      if (!existingIds.has(String(uid))) {
                        const remote = remoteReports[String(uid)];
                        if (remote && (remote.text || '').trim()) {
                          const known = (users || []).find(u => String(u.id) === String(uid));
                          if (known && known.role === UserRole.EMPLOYEE) {
                            employeesForDate.push(known);
                          } else if (!known) {
                            const stub: User = {
                              id: String(uid),
                              name: 'Employee',
                              email: '',
                              role: UserRole.EMPLOYEE,
                              status: 'Active',
                              joinedDate: new Date().toISOString(),
                            } as User;
                            employeesForDate.push(stub);
                          }
                          existingIds.add(String(uid));
                        }
                      }
                    });
                  } catch {}
                }

                // Build Admin view filters + pagination datasets
                let mgrFiltered = managersForDate;
                let empFiltered = employeesForDate;
                if (isAdmin) {
                  const q1 = adminMgrQuery.trim().toLowerCase();
                  const q2 = adminEmpQuery.trim().toLowerCase();
                  if (q1) {
                    mgrFiltered = managersForDate.filter(m =>
                      (m.name || '').toLowerCase().includes(q1) || (m.email || '').toLowerCase().includes(q1)
                    );
                  }
                  if (q2) {
                    empFiltered = employeesForDate.filter(e =>
                      (e.name || '').toLowerCase().includes(q2) || (e.email || '').toLowerCase().includes(q2)
                    );
                  }
                }

                const mgrTotal = isAdmin ? mgrFiltered.length : 0;
                const empTotal = isAdmin ? empFiltered.length : 0;
                const mgrPageCount = isAdmin ? Math.max(1, Math.ceil(mgrTotal / ADMIN_PAGE_SIZE)) : 1;
                const empPageCount = isAdmin ? Math.max(1, Math.ceil(empTotal / ADMIN_PAGE_SIZE)) : 1;
                const mgrPageItems = isAdmin ? mgrFiltered.slice((adminMgrPage - 1) * ADMIN_PAGE_SIZE, adminMgrPage * ADMIN_PAGE_SIZE) : [];
                const empPageItems = isAdmin ? empFiltered.slice((adminEmpPage - 1) * ADMIN_PAGE_SIZE, adminEmpPage * ADMIN_PAGE_SIZE) : [];

                return (
                  <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-slate-700">{sectionLabel}</div>
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                          <div className="text-xs text-slate-500">{user?.email}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {managerSavedAt && <div className="text-xs text-slate-500">Saved: {managerSavedAt}</div>}
                          {managerText.trim() && !teamEditing[managerId] && (
                            <>
                              <button onClick={() => startEditTeamNote(managerId, managerText)} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="Edit">
                                <EditIcon className="w-5 h-5" />
                              </button>
                              <button onClick={() => deleteTeamNoteForUser(managerId)} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete">
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {managerText.trim() && !teamEditing[managerId] ? (
                        <div className="text-sm whitespace-pre-wrap text-slate-700 min-h-[2rem]">{managerText}</div>
                      ) : (
                        <div>
                          {!teamEditing[managerId] && !managerText.trim() && (
                            <div className={`text-xs mb-1 ${user?.role === UserRole.ADMIN ? 'text-slate-500' : (isPastDay ? 'text-red-600' : 'text-slate-500')}`}>
                              {user?.role === UserRole.ADMIN
                                ? 'Add your report:'
                                : (isPastDay ? 'Missed report. Add your report:' : 'Add your report for today:')}
                            </div>
                          )}
                          <textarea
                            value={teamDrafts[managerId] || ''}
                            onChange={e => setTeamDrafts(prev => ({ ...prev, [managerId]: e.target.value }))}
                            placeholder={`Add your report...`}
                            className="w-full h-28 rounded-md border px-3 py-2 text-sm border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <div className="mt-2 flex justify-end space-x-2">
                            {teamEditing[managerId] && (
                              <button onClick={() => cancelEditTeamNote(managerId)} className="px-3 py-1.5 text-sm rounded-md bg-slate-100 hover:bg-slate-200">Cancel</button>
                            )}
                            <button
                              onClick={() => saveTeamNoteForUser(managerId)}
                              disabled={!(teamDrafts[managerId] || '').trim()}
                              className={`px-4 py-1.5 text-sm rounded-md text-white ${((teamDrafts[managerId] || '').trim()) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-700">Manager Reports</div>
                          <input
                            value={adminMgrQuery}
                            onChange={e => { setAdminMgrQuery(e.target.value); setAdminMgrPage(1); }}
                            placeholder="Search"
                            className="text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        {mgrTotal === 0 ? (
                          <div className="text-slate-500 text-sm border border-slate-200 rounded-xl p-5 bg-slate-50">No manager reports or tasks for this date.</div>
                        ) : (
                          <div className="space-y-4">
                            {mgrPageItems.map(m => {
                              const note = getNoteForUser(selectedDate, m.id);
                              const text = note?.text || '';
                              const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                              return (
                                <div key={m.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                                      <div className="text-xs text-slate-500">{m.email}</div>
                                    </div>
                                    {savedAt && <div className="text-xs text-slate-500">Saved: {savedAt}</div>}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap text-slate-700 min-h-[2rem]">{text}</div>
                                </div>
                              );
                            })}
                            {mgrPageCount > 1 && (
                              <div className="flex items-center justify-end space-x-2 pt-2">
                                <span className="text-xs text-slate-500">{(adminMgrPage - 1) * ADMIN_PAGE_SIZE + 1}-{Math.min(adminMgrPage * ADMIN_PAGE_SIZE, mgrTotal)} of {mgrTotal}</span>
                                <button disabled={adminMgrPage <= 1} onClick={() => setAdminMgrPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Prev</button>
                                <button disabled={adminMgrPage >= mgrPageCount} onClick={() => setAdminMgrPage(p => Math.min(mgrPageCount, p + 1))} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Next</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-700">Employee Reports</div>
                        {isAdmin && (
                          <input
                            value={adminEmpQuery}
                            onChange={e => { setAdminEmpQuery(e.target.value); setAdminEmpPage(1); }}
                            placeholder="Search"
                            className="text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                      {isAdmin ? (
                        empTotal === 0 ? (
                          <div className="text-slate-500 text-sm border border-slate-200 rounded-xl p-5 bg-slate-50">No employee reports for this date.</div>
                        ) : (
                          <div className="space-y-4">
                            {empPageItems.map(u => {
                              const note = getNoteForUser(selectedDate, u.id);
                              const text = note?.text || '';
                              const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                              return (
                                <div key={u.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                                      <div className="text-xs text-slate-500">{u.email}</div>
                                    </div>
                                    {savedAt && <div className="text-xs text-slate-500">Saved: {savedAt}</div>}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap text-slate-700 min-h-[2rem]">{text}</div>
                                </div>
                              );
                            })}
                            {empPageCount > 1 && (
                              <div className="flex items-center justify-end space-x-2 pt-2">
                                <span className="text-xs text-slate-500">{(adminEmpPage - 1) * ADMIN_PAGE_SIZE + 1}-{Math.min(adminEmpPage * ADMIN_PAGE_SIZE, empTotal)} of {empTotal}</span>
                                <button disabled={adminEmpPage <= 1} onClick={() => setAdminEmpPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Prev</button>
                                <button disabled={adminEmpPage >= empPageCount} onClick={() => setAdminEmpPage(p => Math.min(empPageCount, p + 1))} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Next</button>
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                      employeesForDate.length === 0 ? (
                        <div className="text-slate-500 text-sm border border-slate-200 rounded-xl p-5 bg-slate-50">No employee reports for this date.</div>
                      ) : (
                        <div className="space-y-4">
                          {employeesForDate.map(u => {
                            const note = getNoteForUser(selectedDate, u.id);
                            const text = note?.text || '';
                            const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                            return (
                              <div key={u.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.email}</div>
                                  </div>
                                  {savedAt && <div className="text-xs text-slate-500">Saved: {savedAt}</div>}
                                </div>
                                <div className="text-sm whitespace-pre-wrap text-slate-700 min-h-[2rem]">{text || 'No report for this date.'}</div>
                              </div>
                            );
                          })}
                        </div>
                      )
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 text-right rounded-b-2xl bg-white/60">
              <button onClick={() => { setIsTeamModal(false); setSelectedDate(null); }} className="inline-flex items-center px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}
      {selectedDate && !isTeamView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-slate-800">End of Day Work Report • {selectedDate}</h3>
              <button onClick={closeModal} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-6">
              {(() => {
                const note = selectedDate ? getNote(selectedDate) : undefined;
                const status = selectedDate ? getStatusFor(selectedDate) : 'none';
                const hasText = !!(note && (note.text || '').trim().length > 0);
                return (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-sm">
                        {hasText ? (
                          <div className="text-emerald-600">You have a report for this day{note?.savedAt ? ` • Saved: ${new Date(note.savedAt).toLocaleString()}` : ''}.</div>
                        ) : status === 'missed' ? (
                          <div className="text-red-600">Missed report. Add your report:</div>
                        ) : (
                          <div className="text-slate-500">Add your report for this day:</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasText && !isEditing && (
                          <button
                            type="button"
                            onClick={() => { setIsEditing(true); setDraft(note?.text || ''); }}
                            title="Edit"
                            className="p-1 rounded hover:bg-slate-100 text-slate-600"
                          >
                            <EditIcon className="w-5 h-5" />
                          </button>
                        )}
                        {hasText && (
                          <button
                            type="button"
                            onClick={deleteNote}
                            title="Delete"
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      id="eod-note-area"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="Write what you worked on..."
                      readOnly={!isEditing && hasText}
                      className={`w-full h-40 rounded-md border px-3 py-2 text-sm focus:outline-none ${(!isEditing && hasText) ? 'border-slate-200 bg-slate-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    />
                  </div>
                );
              })()}
            </div>
            <div className="px-6 pb-6 flex justify-end items-center space-x-2">
              <button onClick={closeModal} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
              <button onClick={saveNote} disabled={!isEditing || !draft.trim()} className={`px-4 py-1.5 rounded-md text-white ${(!isEditing || !draft.trim()) ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkReportsDashboard;
