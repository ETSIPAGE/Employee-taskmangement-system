import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService'; // Assuming this is for local user data
import Modal from '../shared/Modal';

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Helper to extract day from various date string formats
const extractDay = (dateStr: string): number | null => {
    const s = String(dateStr);
    const asDate = new Date(s);
    if (!isNaN(asDate.getTime())) return asDate.getDate(); // Handles ISO, YYYY-MM-DD, etc.

    const core = s.split('T')[0]; // Try to get YYYY-MM-DD part
    const parts = core.split(/[-\/]/); // Split by - or /
    if (parts.length >= 3) {
        // Assume YYYY-MM-DD or DD-MM-YYYY based on common patterns
        // More robust: look for 'YYYY-MM-DD' first, otherwise 'DD-MM-YYYY'
        if (parts[0].length === 4) { // Assumes YYYY-MM-DD
            const d = parseInt(parts[2], 10);
            return isNaN(d) ? null : d;
        } else { // Assumes DD-MM-YYYY or MM-DD-YYYY
            const d = parseInt(parts[0], 10); // Day is usually first or second, let's try first
            return isNaN(d) ? null : d;
        }
    }
    return null;
};

// ManagerAttendanceView - unchanged, but included for completeness
const ManagerAttendanceView: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [presentEmployees, setPresentEmployees] = useState<User[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedDate || !currentUser) return;
        const fetchAttendance = async () => {
            setIsLoading(true);
            try {
                const dateString = selectedDate.toISOString().split('T')[0];
                const attendanceRecords = await DataService.getAttendanceByDate(dateString);
                const presentIds = attendanceRecords.map(rec => rec.userId);
                const apiUsers = await DataService.getUsers(true);
                const localUsers = AuthService.getUsers(); // Assuming this fetches some local user data

                const merged = new Map<string, User>();
                for (const u of localUsers) merged.set(u.id, u);
                for (const u of apiUsers) merged.set(u.id, { ...(merged.get(u.id) || {} as User), ...u });

                const managerDeptIds = currentUser.departmentIds || [];

                const isEligibleForManager = (u: User): boolean => {
                    const deptEligible = Array.isArray(u.departmentIds) && u.departmentIds.some(d => managerDeptIds.includes(d));
                    const directReport = u.managerId === currentUser.id;
                    return (u.role === UserRole.EMPLOYEE) && (deptEligible || directReport);
                };

                const resolvedUsers: User[] = presentIds.map(id => {
                    const found = merged.get(id);
                    if (found) return found as User;
                    return { id, name: id, email: '', role: UserRole.EMPLOYEE } as User;
                });

                const displayUsers = resolvedUsers.filter(isEligibleForManager);
                setPresentEmployees(displayUsers);
            } catch (error) {
                console.error("Failed to fetch manager daily attendance", error);
                setPresentEmployees([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAttendance();
    }, [selectedDate, currentUser]);

    useEffect(() => {
        const handler = () => {
            if (selectedDate) {
                // Trigger refetch by updating date instance to force effect re-run
                setSelectedDate(new Date(selectedDate));
            }
        };
        window.addEventListener('ets-attendance-updated', handler as EventListener);
        return () => window.removeEventListener('ets-attendance-updated', handler as EventListener);
    }, [selectedDate]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const previousMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), [currentDate]);
    const nextMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
                <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <CalendarMonthView date={previousMonth} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                <CalendarMonthView date={currentDate} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                <CalendarMonthView date={nextMonth} selectedDate={selectedDate} onDateClick={setSelectedDate} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">{selectedDate ? `Team present on ${selectedDate.toLocaleDateString()}` : 'Select a date'}</h3>
                {isLoading ? <p className="text-slate-500 text-center pt-8">Loading attendance...</p> :
                    selectedDate ? (
                        presentEmployees.length > 0 ? (
                            <ul className="space-y-3">
                                {presentEmployees.map(emp => (
                                    <li
                                        key={emp.id}
                                        onClick={() => setSelectedEmployee(emp)}
                                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">{getInitials(emp.name)}</div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{emp.name}</p>
                                            <p className="text-xs text-slate-500">{emp.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-500 text-center pt-8">No attendance records for this day.</p>
                    ) : <p className="text-slate-500 text-center pt-8">Select a date from the calendar to view attendance.</p>}
            </div>
            {selectedEmployee && selectedDate && (
                <EmployeeAttendanceDetailModal
                    employee={selectedEmployee}
                    monthDate={selectedDate}
                    presentDate={selectedDate}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
};

// EmployeeAttendanceDetailModal - unchanged, but included for completeness
const EmployeeAttendanceDetailModal: React.FC<{ employee: User; monthDate: Date; presentDate?: Date; onClose: () => void; }> = ({ employee, monthDate, presentDate, onClose }) => {
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 0 });
    const [presentDates, setPresentDates] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [dailyPunches, setDailyPunches] = useState<Record<number, { punchIn?: string; punchOut?: string; punchInRaw?: string; punchOutRaw?: string }>>({});

    useEffect(() => {
        const fetchUserAttendance = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth() + 1; // API uses 1-12

            try {
                const userPresentRecords = await DataService.getAttendanceForUserByMonth(employee.id, year, month);

                const presentDays = new Set<number>();
                const punches: Record<number, { punchIn?: string; punchOut?: string; punchInRaw?: string; punchOutRaw?: string }> = {};
                const normEmpId = String(employee.id).toLowerCase();
                const pad = (n: number) => String(n).padStart(2, '0');
                const totalDaysInMonth = new Date(year, month, 0).getDate();

                const fetchDailyDataForDay = async (day: number) => {
                    const date = new Date(year, month - 1, day);
                    const ds = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                    try {
                        const daily = await DataService.getAttendanceByDate(ds);
                        const match = daily.find(r => String(r.userId).toLowerCase() === normEmpId);
                        if (match) {
                            presentDays.add(day);
                            const existing = punches[day] || {};
                            const dateSource = typeof match.date === 'string' && match.date ? match.date : ds;
                            punches[day] = {
                                punchIn: match.punchInTime ?? existing.punchIn,
                                punchOut: match.punchOutTime ?? existing.punchOut,
                                punchInRaw: dateSource ?? existing.punchInRaw,
                                punchOutRaw: dateSource ?? existing.punchOutRaw,
                            };
                        }
                    } catch { }
                };

                for (const rec of userPresentRecords) {
                    const core = typeof rec.date === 'string' ? rec.date : '';
                    const day = core ? extractDay(core) : null;
                    if (day) presentDays.add(day);
                    if (day) {
                        const existing = punches[day] || {};
                        const dateSource = typeof rec.date === 'string' ? rec.date : undefined;
                        punches[day] = {
                            punchIn: rec.punchInTime ?? existing.punchIn,
                            punchOut: rec.punchOutTime ?? existing.punchOut,
                            punchInRaw: dateSource ?? existing.punchInRaw,
                            punchOutRaw: dateSource ?? existing.punchOutRaw,
                        };
                    }
                }
                // Fallback: if monthly API returned nothing, check daily endpoint for each day
                const daysToFetch = new Set<number>();
                if (presentDays.size === 0) {
                    for (let day = 1; day <= totalDaysInMonth; day++) {
                        daysToFetch.add(day);
                    }
                }
                presentDays.forEach(day => {
                    const punch = punches[day];
                    if (!punch || !punch.punchIn || !punch.punchOut) {
                        daysToFetch.add(day);
                    }
                });
                // Ensure the clicked date (if in same month/year) shows as present
                if (presentDate) {
                    const sameMonth = presentDate.getFullYear() === year && (presentDate.getMonth() + 1) === month;
                    if (sameMonth) {
                        const selectedDayNumber = presentDate.getDate();
                        presentDays.add(selectedDayNumber);
                        if (!punches[selectedDayNumber]) {
                            punches[selectedDayNumber] = {};
                        }
                        daysToFetch.add(selectedDayNumber);
                    }
                }
                if (daysToFetch.size > 0) {
                    const uniqueDays = Array.from(daysToFetch);
                    await Promise.all(uniqueDays.map(day => fetchDailyDataForDay(day)));
                }
                setPresentDates(presentDays);
                setDailyPunches(punches);

                let workingDays = 0;
                for (let day = 1; day <= totalDaysInMonth; day++) {
                    const date = new Date(year, month - 1, day);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                        workingDays++;
                    }
                }

                const presentCount = presentDays.size;
                const absentCount = workingDays - presentCount;
                const percentage = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

                setStats({ present: presentCount, absent: absentCount, percentage });
            } catch (error) {
                console.error("Failed to load user attendance details", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserAttendance();
    }, [employee, monthDate, currentUser, presentDate]);

    const selectedDay = presentDate?.getDate();
    const selectedPunches = selectedDay ? dailyPunches[selectedDay] : undefined;

    const punchEntries = useMemo(() => {
        return Object.entries(dailyPunches)
            .map(([day, value]) => {
                const punchesForDay = value as { punchIn?: string; punchOut?: string; punchInRaw?: string; punchOutRaw?: string };
                return {
                    day: Number(day),
                    punchIn: punchesForDay?.punchIn,
                    punchOut: punchesForDay?.punchOut,
                    punchInRaw: punchesForDay?.punchInRaw,
                    punchOutRaw: punchesForDay?.punchOutRaw,
                };
            })
            .sort((a, b) => a.day - b.day);
    }, [dailyPunches]);

    const parseTimeComponents = (time: string): { hours: number; minutes: number } | null => {
        const trimmed = time.trim();
        const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
        if (twelveHourMatch) {
            let hours = parseInt(twelveHourMatch[1], 10);
            const minutes = parseInt(twelveHourMatch[2], 10);
            const meridian = twelveHourMatch[4]?.toUpperCase();
            if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) return null;
            if (meridian === 'AM') {
                if (hours === 12) hours = 0;
            } else if (meridian === 'PM') {
                if (hours !== 12) hours += 12;
            }
            if (hours < 0 || hours > 23) return null;
            return { hours, minutes };
        }

        const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (twentyFourHourMatch) {
            const hours = parseInt(twentyFourHourMatch[1], 10);
            const minutes = parseInt(twentyFourHourMatch[2], 10);
            if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
            return { hours, minutes };
        }

        return null;
    };

    const resolveDateTime = (day: number, timeValue?: string, rawValue?: string): Date | null => {
        if (!timeValue) return null;

        const direct = new Date(timeValue);
        if (!isNaN(direct.getTime())) {
            return direct;
        }

        if (rawValue) {
            const rawDirect = new Date(rawValue);
            if (!isNaN(rawDirect.getTime())) {
                return rawDirect;
            }

            const datePart = rawValue.split('T')[0];
            if (datePart) {
                const comps = parseTimeComponents(timeValue);
                if (comps) {
                    const iso = `${datePart}T${String(comps.hours).padStart(2, '0')}:${String(comps.minutes).padStart(2, '0')}:00`;
                    const dateFromIso = new Date(iso);
                    if (!isNaN(dateFromIso.getTime())) {
                        return dateFromIso;
                    }
                }
            }
        }

        const comps = parseTimeComponents(timeValue);
        if (!comps) return null;
        const resolved = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
            comps.hours,
            comps.minutes,
        );
        return resolved;
    };

    const formatTime = (day: number, value?: string, raw?: string) => {
        const parsed = resolveDateTime(day, value, raw);
        if (!parsed) return value ?? '—';
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (day: number, punchIn?: string, punchInRaw?: string, punchOut?: string, punchOutRaw?: string) => {
        const start = resolveDateTime(day, punchIn, punchInRaw);
        const end = resolveDateTime(day, punchOut, punchOutRaw);
        if (!start || !end) return '—';
        let diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60; // handle overnight shifts
        }
        if (diffMinutes < 0) return '—';
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        return `${minutes}m`;
    };

    const renderMiniCalendar = () => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="mt-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-semibold mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={i}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                    {days.map(day => {
                        const date = new Date(year, month, day);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isPresent = presentDates.has(day);
                        const isFuture = date > today;

                        let classes = "w-8 h-8 flex items-center justify-center rounded text-sm";
                        if (isPresent) {
                            classes += " bg-green-500 text-white font-bold";
                        } else if (isFuture) {
                            classes += " border-2 border-slate-300 text-slate-600";
                        } else if (isWeekend) {
                            classes += " bg-slate-100 text-slate-400";
                        } else {
                            classes += " bg-red-100 text-red-700";
                        }

                        return <div key={day} className={classes}>{day}</div>;
                    })}
                </div>
            </div>
        );
    };

    return (
        <Modal title={`Attendance Details`} isOpen={true} onClose={onClose}>
            <div className="flex items-center space-x-4 border-b pb-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold flex-shrink-0">{getInitials(employee.name)}</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{employee.name}</h3>
                    <p className="text-slate-500">{employee.jobTitle}</p>
                </div>
            </div>
            {isLoading ? <p>Loading details...</p> : (
                <>
                    <h4 className="font-semibold text-slate-700">Stats for {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                    <div className="grid grid-cols-3 gap-4 my-4 text-center">
                        <div className="bg-green-50 p-3 rounded-lg"><p className="text-2xl font-bold text-green-700">{stats.present}</p><p className="text-xs text-green-600">Present</p></div>
                        <div className="bg-red-50 p-3 rounded-lg"><p className="text-2xl font-bold text-red-700">{stats.absent}</p><p className="text-xs text-red-600">Absent</p></div>
                        <div className="bg-indigo-50 p-3 rounded-lg"><p className="text-2xl font-bold text-indigo-700">{stats.percentage}%</p><p className="text-xs text-indigo-600">Percentage</p></div>
                    </div>
                    {presentDate && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Selected Date</p>
                                <p className="text-lg font-semibold text-slate-800">{presentDate.toLocaleDateString()}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Punch In</p>
                                <p className="text-lg font-semibold text-slate-800">{formatTime(selectedDay ?? presentDate.getDate(), selectedPunches?.punchIn, selectedPunches?.punchInRaw)}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Punch Out</p>
                                <p className="text-lg font-semibold text-slate-800">{formatTime(selectedDay ?? presentDate.getDate(), selectedPunches?.punchOut, selectedPunches?.punchOutRaw)}</p>
                            </div>
                        </div>
                    )}
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
                        <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700">Monthly Punch Details</div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-600">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Day</th>
                                        <th className="px-4 py-2 text-left font-medium">Punch In</th>
                                        <th className="px-4 py-2 text-left font-medium">Punch Out</th>
                                        <th className="px-4 py-2 text-left font-medium">Working Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {punchEntries.length > 0 ? (
                                        punchEntries.map(({ day, punchIn, punchOut, punchInRaw, punchOutRaw }) => (
                                            <tr key={day} className={selectedDay === day ? 'bg-emerald-50' : ''}>
                                                <td className="px-4 py-2 font-medium text-slate-800">{day}</td>
                                                <td className="px-4 py-2">{formatTime(day, punchIn, punchInRaw)}</td>
                                                <td className="px-4 py-2">{formatTime(day, punchOut, punchOutRaw)}</td>
                                                <td className="px-4 py-2">{formatDuration(day, punchIn, punchInRaw, punchOut, punchOutRaw)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="px-4 py-3 text-center text-slate-500" colSpan={4}>No punch data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {renderMiniCalendar()}
                </>
            )}
        </Modal>
    );
};

// CalendarMonthView - unchanged, but included for completeness
const CalendarMonthView: React.FC<{
    date: Date;
    selectedDate: Date | null;
    onDateClick: (date: Date) => void;
}> = ({ date, selectedDate, onDateClick }) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-center text-slate-800 mb-3">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-sm text-slate-500 font-semibold mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <div key={i}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                {days.map(day => {
                    const d = new Date(year, month, day);
                    const isToday = today.toDateString() === d.toDateString();
                    const isSelected = selectedDate?.toDateString() === d.toDateString();

                    let baseClasses = "w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors";
                    let selectedClasses = isSelected ? "bg-indigo-600 text-white font-bold shadow-lg" : "hover:bg-indigo-100";
                    let todayClasses = isToday && !isSelected ? "bg-slate-200 text-slate-800 font-bold" : "";

                    return (
                        <div key={day} className="flex justify-center">
                            <button onClick={() => onDateClick(d)} className={`${baseClasses} ${selectedClasses} ${todayClasses}`}>{day}</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// AdminAttendanceView - unchanged, but included for completeness
const AdminAttendanceView: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [presentEmployees, setPresentEmployees] = useState<User[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedDate && currentUser) {
            const fetchAttendance = async () => {
                setIsLoading(true);
                try {
                    const dateString = selectedDate.toISOString().split('T')[0];
                    const attendanceRecords = await DataService.getAttendanceByDate(dateString);
                    const presentIds = attendanceRecords.map(rec => rec.userId);
                    const allUsers = await DataService.getUsers();
                    const userMap = new Map(allUsers.map(u => [u.id, u]));
                    const displayUsers: User[] = presentIds.map(id => {
                        const found = userMap.get(id);
                        return found || { id, name: id, email: '', role: UserRole.EMPLOYEE } as User;
                    });
                    setPresentEmployees(displayUsers);
                } catch (error) {
                    console.error("Failed to fetch daily attendance", error);
                    setPresentEmployees([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAttendance();
        } else {
            setPresentEmployees([]);
        }
    }, [selectedDate, currentUser]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const previousMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), [currentDate]);
    const nextMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
                <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <CalendarMonthView date={previousMonth} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                <CalendarMonthView date={currentDate} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                <CalendarMonthView date={nextMonth} selectedDate={selectedDate} onDateClick={setSelectedDate} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">{selectedDate ? `Present on ${selectedDate.toLocaleDateString()}` : 'Select a date'}</h3>
                {isLoading ? <p className="text-slate-500 text-center pt-8">Loading attendance...</p> :
                    selectedDate ? (
                        presentEmployees.length > 0 ? (
                            <ul className="space-y-3">
                                {presentEmployees.map(emp => (
                                    <li key={emp.id} onClick={() => setSelectedEmployee(emp)} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">{getInitials(emp.name)}</div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{emp.name}</p>
                                            <p className="text-xs text-slate-500">{emp.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-500 text-center pt-8">No attendance records for this day.</p>
                    ) : <p className="text-slate-500 text-center pt-8">Select a date from the calendar to view attendance.</p>}
            </div>
            {selectedEmployee && selectedDate && (
                <EmployeeAttendanceDetailModal
                    employee={selectedEmployee}
                    monthDate={selectedDate}
                    presentDate={selectedDate}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
};


const EmployeeAttendanceView: React.FC<{ user: User }> = ({ user }) => {
    const { user: currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'present' | 'absent'>>({});
    const [refreshKey, setRefreshKey] = useState(0);

    // Effect to fetch initial attendance data or when month/refreshKey changes
    useEffect(() => {
        if (!currentUser) {
            console.log("EmployeeAttendanceView: No current user, skipping fetchAttendance.");
            return;
        }

        const fetchAttendance = async () => {
            console.log(`EmployeeAttendanceView: Starting fetchAttendance for ${user.name} for month: ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} (refreshKey: ${refreshKey})`);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // API expects 1-12
            const daysInMonth = new Date(year, month, 0).getDate();
            const today = new Date();
            const newStatus: Record<string, 'present' | 'absent'> = {};

            try {
                const attendanceRecords = await DataService.getAttendanceForUserByMonth(user.id, year, month);
                console.log("EmployeeAttendanceView: API attendance records received:", attendanceRecords);

                const presentDates = new Set<number>();
                for (const rec of attendanceRecords) {
                    const core = typeof rec.date === 'string' ? rec.date : '';
                    const d = core ? extractDay(core) : null;
                    if (d) presentDates.add(d);
                }
                console.log("EmployeeAttendanceView: Present days from API:", Array.from(presentDates));

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month - 1, day);
                    if (date > today) { // Only assign status for past or current dates
                        continue; // Future dates don't have a 'present'/'absent' status yet
                    }

                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekends
                        continue; // Weekends don't typically have attendance status, you can adjust this if needed
                    }

                    if (presentDates.has(day)) {
                        newStatus[day] = 'present';
                    } else {
                        newStatus[day] = 'absent';
                    }
                }
                setAttendanceStatus(prev => {
                    const merged: Record<string, 'present' | 'absent'> = { ...newStatus };

                    // Preserve optimistic present flags from the previous state until the backend confirms.
                    Object.entries(prev).forEach(([dayKey, status]) => {
                        if (status === 'present' && !merged[dayKey]) {
                            merged[dayKey] = 'present';
                        }
                    });

                    console.log("EmployeeAttendanceView: Updated attendanceStatus after fetch (merged):", merged);
                    return merged;
                });
            } catch (error) {
                console.error("EmployeeAttendanceView: Failed to fetch user's monthly attendance", error);
                setAttendanceStatus({}); // Clear status on error
            }
        };
        fetchAttendance();
    }, [currentDate, user.id, currentUser, refreshKey]); // `refreshKey` now triggers refetch

    // Effect to handle punch-in event from Header
    useEffect(() => {
        const handleAttendanceUpdate = (event: Event) => {
            console.log("EmployeeAttendanceView: 'ets-attendance-updated' event received!");
            const customEvent = event as CustomEvent; // Cast to CustomEvent to access detail
            const { userId, action } = customEvent.detail;

            // Only act if the event is for the current user and it's a PUNCH_IN
            if (userId === user.id && action === 'PUNCH_IN') {
                const now = new Date();
                const sameMonth = now.getFullYear() === currentDate.getFullYear() && now.getMonth() === currentDate.getMonth();

                if (sameMonth) {
                    const day = now.getDate();
                    // --- MODIFIED SECTION: No weekend check for optimistic update ---
                    setAttendanceStatus(prev => {
                        const updatedStatus = { ...prev, [day]: 'present' };
                        console.log(`EmployeeAttendanceView: Optimistically setting day ${day} to 'present'. New status:`, updatedStatus);
                        return updatedStatus;
                    });
                    // --- END MODIFIED SECTION ---
                } else {
                    console.log("EmployeeAttendanceView: Punch-in event for a different month than current view, skipping optimistic update.");
                }
            } else {
                console.log(`EmployeeAttendanceView: Skipping event (userId mismatch or not PUNCH_IN): ${userId} vs ${user.id}, action: ${action}`);
            }

            // --- CRITICAL FIX: Increased Timeout Delay ---
            // Always trigger a delayed refetch to ensure data consistency with the backend
            // Increased the delay to 3 seconds to give the backend more time to process the record.
            setTimeout(() => {
                console.log("EmployeeAttendanceView: Triggering delayed refetch via refreshKey increment.");
                setRefreshKey(prev => prev + 1);
            }, 3000); // Increased from 1000ms to 3000ms (3 seconds)
            // If this still blinks, try 5000ms (5 seconds).
            // The ultimate solution might require optimizing the backend's write-to-read consistency.
            // --- END CRITICAL FIX ---
        };

        window.addEventListener('ets-attendance-updated', handleAttendanceUpdate as EventListener);
        console.log("EmployeeAttendanceView: Event listener 'ets-attendance-updated' mounted.");
        return () => {
            window.removeEventListener('ets-attendance-updated', handleAttendanceUpdate as EventListener);
            console.log("EmployeeAttendanceView: Event listener 'ets-attendance-updated' unmounted.");
        };
    }, [currentDate, user.id]); // Depend on currentDate and user.id

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            console.log("EmployeeAttendanceView: Changing month to:", newDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed for Date constructor
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(); // Current real-world date

        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
                    <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-500 font-semibold mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <div key={i}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                    {days.map(day => {
                        const date = new Date(year, month, day);
                        const isTodayInView = date.toDateString() === today.toDateString(); // Is this date cell "today"?

                        let statusClasses = ""; // Default empty, will be assigned

                        // Determine the status for the current day in the loop based on state
                        const status = attendanceStatus[day];
                        // console.log(`Rendering Day ${day}: status=${status}`); // Debug each day's status

                        if (status === 'present') {
                            statusClasses = "bg-green-500 text-white font-bold";
                        } else if (status === 'absent') {
                            statusClasses = "bg-red-500 text-white font-bold";
                        } else {
                            // If no explicit 'present'/'absent' status (e.g., future date, weekend, or unrecorded today)
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isFuture = date > today;

                            if (isWeekend || isFuture) {
                                statusClasses = "border-2 border-slate-300 text-slate-600"; // Weekend or future
                            } else if (isTodayInView) {
                                // If it's today and no status (meaning not yet punched in)
                                statusClasses = "bg-yellow-100 text-yellow-800"; // Pending/neutral color for today
                            } else {
                                // Fallback for past weekdays with no record (should theoretically be 'absent' from fetch, but just in case)
                                statusClasses = "bg-gray-100 text-gray-500";
                            }
                        }

                        return (
                            <div key={day} className="flex justify-center">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-full ${statusClasses}`}>{day}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">{renderCalendar()}</div>
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-lg h-full">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Legend</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center"><div className="w-5 h-5 rounded-full bg-green-500 mr-3"></div><span className="text-slate-700">Present</span></li>
                        <li className="flex items-center"><div className="w-5 h-5 rounded-full bg-red-500 mr-3"></div><span className="text-slate-700">Absent</span></li>

                    </ul>
                </div>
            </div>
        </div>
    );
}

const Attendance: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" />;

    const renderContent = () => {
        switch (user.role) {
            case UserRole.ADMIN:
            case UserRole.HR:
                return <AdminAttendanceView />;
            case UserRole.MANAGER:
                return <ManagerAttendanceView />;
            case UserRole.EMPLOYEE:
                return <EmployeeAttendanceView user={user} />;
            default:
                return <Navigate to="/" />;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Attendance</h1>
            {renderContent()}
        </div>
    );
};

export default Attendance;