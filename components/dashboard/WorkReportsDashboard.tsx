import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Task, TaskStatus, User, UserRole } from '../../types';
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
    <div className="bg-white rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded" onClick={() => setCursor(c => addMonths(c, -1))}>{'<'}</button>
          <div className="text-lg font-semibold text-slate-800">Task Calendar</div>
          <button className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded" onClick={() => setCursor(c => addMonths(c, 1))}>{'>'}</button>
        </div>
        <button className="text-sm text-indigo-600 hover:underline" onClick={() => setCursor(new Date())}>Today</button>
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
                      : status === 'missed' ? 'inline-block w-2 h-2 bg-red-500' // square block for missed
                      : status === 'late' ? 'inline-block w-2 h-2 rounded-full bg-amber-500'
                      : 'hidden';
                    return (
                      <div
                        key={idx}
                        className={`relative min-h-[90px] border rounded p-1 ${invalid ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'}`}
                        onClick={() => { if (!invalid && onDayClick) onDayClick(ymd); }}
                      >
                        <div className={`text-right text-[11px] ${isToday ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>{invalid ? '' : d.getDate()}</div>
                        {/* show status indicators for both employee and manager views */}
                        {!invalid && status !== 'none' && (
                          <span className={`${dotClass} absolute left-1 top-1`} />
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
        const [u, allTasks] = await Promise.all([
          Promise.resolve(AuthService.getUsers?.() as User[] || []),
          Promise.resolve(DataService.getAllTasks?.() as Promise<Task[]>)
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(u) ? u : []);
        const t = Array.isArray(allTasks) ? allTasks : [];
        setTasks(t);
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
    if (!v) return undefined;
    if (typeof v === 'string') return { text: String(v) };
    if (typeof v === 'object') return { text: String(v.text || ''), savedAt: typeof v.savedAt === 'string' ? v.savedAt : undefined };
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
  };
  const saveNote = () => {
    if (!selectedDate) return;
    const key = noteKey(selectedDate);
    const next = { ...notes, [key]: { text: draft, savedAt: new Date().toISOString() } };
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setSelectedDate(null);
    setDraft('');
    setToast({ message: 'Report saved successfully!', type: 'success' });
  };
  const deleteNote = () => {
    if (!selectedDate) return;
    const key = noteKey(selectedDate);
    const next = { ...notes } as Record<string, any>;
    delete next[key];
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setSelectedDate(null);
    setDraft('');
    setToast({ message: 'Report deleted successfully!', type: 'success' });
  };
  const closeModal = () => { setSelectedDate(null); setDraft(''); };

  const saveTeamNoteForUser = (uid: string) => {
    if (!selectedDate) return;
    const text = (teamDrafts[uid] || '').trim();
    if (!text) return;
    const key = noteKey(selectedDate, uid);
    const next = { ...notes, [key]: { text, savedAt: new Date().toISOString() } };
    setNotes(next);
    try { localStorage.setItem('ets_work_notes', JSON.stringify(next)); } catch {}
    setTeamDrafts(prev => ({ ...prev, [uid]: '' }));
    setTeamEditing(prev => ({ ...prev, [uid]: false }));
    setToast({ message: 'Report added successfully!', type: 'success' });
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
              Promise.resolve(AuthService.getUsers?.() as User[] || []),
              Promise.resolve(DataService.getAllTasks?.() as Promise<Task[]>)
            ]).then(([u, t]) => {
              setUsers(Array.isArray(u) ? u : []);
              setTasks(Array.isArray(t) ? t : []);
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Team Work Reports • {selectedDate}</h3>
              <button onClick={() => { setIsTeamModal(false); setSelectedDate(null); }} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
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
                const assignedEmployees = (users || []).filter(u => {
                  if (String(u.id) === managerId) return false;
                  // only employees
                  if (u.role !== UserRole.EMPLOYEE) return false;
                  const m1 = u.managerId ? String(u.managerId) === managerId : false;
                  const m2 = Array.isArray(u.managerIds) ? u.managerIds.map(String).includes(managerId) : false;
                  const m3 = (tasks || []).some(t => String(t.assign_by || '') === managerId && (t.assigneeIds || []).includes(u.id));
                  return m1 || m2 || m3;
                });
                // Build employees list for the right column
                // Manager view: show only employees who actually have report text for that date
                let employeesForDate = assignedEmployees.filter(u => {
                  const note = getNoteForUser(selectedDate, u.id);
                  return !!(note && (note.text || '').trim().length > 0);
                });

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
                      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
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
                            className="w-full h-24 rounded border px-3 py-2 text-sm border-slate-300 focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="mt-2 flex justify-end space-x-2">
                            {teamEditing[managerId] && (
                              <button onClick={() => cancelEditTeamNote(managerId)} className="px-2 py-1 text-sm rounded bg-slate-100 hover:bg-slate-200">Cancel</button>
                            )}
                            <button
                              onClick={() => saveTeamNoteForUser(managerId)}
                              disabled={!(teamDrafts[managerId] || '').trim()}
                              className={`px-3 py-1.5 text-sm rounded text-white ${((teamDrafts[managerId] || '').trim()) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
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
                            className="text-sm border border-slate-300 rounded px-2 py-1"
                          />
                        </div>
                        {mgrTotal === 0 ? (
                          <div className="text-slate-500 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50">No manager reports or tasks for this date.</div>
                        ) : (
                          <div className="space-y-4">
                            {mgrPageItems.map(m => {
                              const note = getNoteForUser(selectedDate, m.id);
                              const text = note?.text || '';
                              const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                              return (
                                <div key={m.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
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
                            className="text-sm border border-slate-300 rounded px-2 py-1"
                          />
                        )}
                      </div>
                      {isAdmin ? (
                        empTotal === 0 ? (
                          <div className="text-slate-500 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50">No employee reports for this date.</div>
                        ) : (
                          <div className="space-y-4">
                            {empPageItems.map(u => {
                              const note = getNoteForUser(selectedDate, u.id);
                              const text = note?.text || '';
                              const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                              return (
                                <div key={u.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
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
                        <div className="text-slate-500 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50">No employee reports for this date.</div>
                      ) : (
                        <div className="space-y-4">
                          {employeesForDate.map(u => {
                            const note = getNoteForUser(selectedDate, u.id);
                            const text = note?.text || '';
                            const savedAt = note?.savedAt ? new Date(note.savedAt).toLocaleString() : undefined;
                            return (
                              <div key={u.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
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
                        </div>
                      )
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-5 pb-5 flex justify-end items-center space-x-2">
              <button onClick={() => { setIsTeamModal(false); setSelectedDate(null); }} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
      {selectedDate && !isTeamView && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">End of Day Work Report • {selectedDate}</h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-end">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); const el = document.getElementById('eod-note-area') as HTMLTextAreaElement | null; el?.focus(); }}
                    title="Edit"
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={deleteNote}
                    disabled={!getNote(selectedDate)?.text}
                    title="Delete"
                    className={`p-1 rounded ${getNote(selectedDate)?.text ? 'hover:bg-red-50 text-red-600' : 'text-slate-300 cursor-not-allowed'}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {!isTeamView && getStatusFor(selectedDate) === 'missed' && (
                <div className="mb-3 text-sm text-red-600">You missed submitting your report for this day.</div>
              )}
              <textarea
                id="eod-note-area"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Write what you worked on..."
                readOnly={!isEditing}
                className={`w-full h-32 rounded border px-3 py-2 text-sm focus:outline-none ${isEditing ? 'border-slate-300 focus:ring-2 focus:ring-indigo-500' : 'border-slate-200 bg-slate-50 cursor-not-allowed'}`}
              />
            </div>
            <div className="px-5 pb-5 flex justify-end items-center space-x-2">
              <button onClick={closeModal} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
              <button onClick={saveNote} disabled={!isEditing} className={`px-3 py-1.5 rounded text-white ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkReportsDashboard;
