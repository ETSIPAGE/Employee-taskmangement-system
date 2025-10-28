import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import * as DataService from '../../services/dataService';

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

const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ManagerAttendanceView - unchanged, but included for completeness
const ManagerAttendanceView: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [presentEmployees, setPresentEmployees] = useState<User[]>([]);
    const [monthAttendance, setMonthAttendance] = useState<Record<string, number[]>>({});
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedDate || !currentUser) return;
        const fetchAttendance = async () => {
            setIsLoading(true);
            try {
                const dateString = formatLocalDate(selectedDate);
                const attendanceRecords = await DataService.getAttendanceByDate(dateString);
                const filteredAttendance = attendanceRecords.filter(rec => {
                    const dateValue = rec?.date;
                    const day = dateValue ? extractDay(dateValue as any) : null;
                    if (!day) return false;
                    const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                    const isSunday = targetDate.getDay() === 0;
                    if (isSunday) {
                        return false;
                    }
                    return true;
                });

                const attendanceDetails = filteredAttendance.map(rec => {
                    const dateValue = rec?.date;
                    const day = dateValue ? extractDay(dateValue as any) : null;
                    const baseDate = day
                        ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
                        : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    const formattedDate = formatLocalDate(baseDate);
                    const dayName = baseDate.toLocaleDateString(undefined, { weekday: 'long' });
                    return {
                        userId: String(rec.userId),
                        date: formattedDate,
                        dayName,
                    };
                });

                const presentIds = Array.from(new Set(filteredAttendance.map(rec => String(rec.userId))));
                const apiUsers = await DataService.getUsers();

                const merged = new Map<string, User>();
                for (const u of apiUsers) merged.set(u.id, u);

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
                const logEntries = displayUsers.map(emp => {
                    const detail = attendanceDetails.find(d => d.userId === emp.id);
                    const fallbackDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    const fallbackDayName = fallbackDate.toLocaleDateString(undefined, { weekday: 'long' });
                    return {
                        id: emp.id,
                        name: emp.name,
                        email: emp.email,
                        date: detail?.date ?? dateString,
                        dayName: detail?.dayName ?? fallbackDayName,
                    };
                });
                console.log(`ManagerAttendanceView: ${logEntries.length} attendance record(s) on ${dateString}`, logEntries);
                setPresentEmployees(displayUsers);

                const pad = (value: number) => String(value).padStart(2, '0');
                const currentYear = selectedDate.getFullYear();
                const currentMonthIndex = selectedDate.getMonth();
                const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
                const monthlySummary: Array<{ date: string; dayName: string; employees: Array<{ id: string; name: string; email: string }> }> = [];

                for (let day = 1; day <= daysInMonth; day++) {
                    const iterDate = new Date(currentYear, currentMonthIndex, day);
                    const dayOfWeek = iterDate.getDay();
                    if (dayOfWeek === 0) {
                        continue;
                    }

                    const ds = `${currentYear}-${pad(currentMonthIndex + 1)}-${pad(day)}`;
                    try {
                        const dailyRecords = await DataService.getAttendanceByDate(ds);
                        const eligibleDaily = dailyRecords.filter(rec => {
                            const dateValue = rec?.date;
                            const recDay = dateValue ? extractDay(dateValue as any) : null;
                            if (!recDay) return false;
                            const normalizedDate = new Date(currentYear, currentMonthIndex, recDay);
                            const isSunday = normalizedDate.getDay() === 0;
                            if (isSunday) return false;
                            const resolved = merged.get(String(rec.userId));
                            return resolved ? isEligibleForManager(resolved) : false;
                        });

                        if (eligibleDaily.length > 0) {
                            const employees = eligibleDaily.map(rec => {
                                const resolved = merged.get(String(rec.userId));
                                if (resolved) {
                                    return { id: resolved.id, name: resolved.name, email: resolved.email };
                                }
                                return { id: String(rec.userId), name: String(rec.userId), email: '' };
                            });
                            monthlySummary.push({
                                date: ds,
                                dayName: iterDate.toLocaleDateString(undefined, { weekday: 'long' }),
                                employees,
                            });
                        }
                    } catch (summaryError) {
                        console.error(`ManagerAttendanceView: Failed to load daily records for ${ds}`, summaryError);
                    }
                }

                console.log(`ManagerAttendanceView: Monthly attendance summary for ${selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`, monthlySummary);
                const monthKey = `${currentYear}-${pad(currentMonthIndex + 1)}`;
                const monthDaySet = new Set<number>();
                monthlySummary.forEach(entry => {
                    const day = extractDay(entry.date);
                    if (day) monthDaySet.add(day);
                });
                setMonthAttendance(prev => ({
                    ...prev,
                    [monthKey]: Array.from(monthDaySet).sort((a, b) => a - b),
                }));
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
    const monthKeyFor = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return (
        <div>
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
                <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <CalendarMonthView
                    date={previousMonth}
                    selectedDate={selectedDate}
                    onDateClick={setSelectedDate}
                    presentDays={monthAttendance[monthKeyFor(previousMonth)]}
                />
                <CalendarMonthView
                    date={currentDate}
                    selectedDate={selectedDate}
                    onDateClick={setSelectedDate}
                    presentDays={monthAttendance[monthKeyFor(currentDate)]}
                />
                <CalendarMonthView
                    date={nextMonth}
                    selectedDate={selectedDate}
                    onDateClick={setSelectedDate}
                    presentDays={monthAttendance[monthKeyFor(nextMonth)]}
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-slate-800">{selectedDate ? `Team present on ${selectedDate.toLocaleDateString()}` : 'Select a date'}</h3>
                    <button
                        type="button"
                        onClick={() => currentUser && setSelectedEmployee(currentUser)}
                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                        title="Show My Attendance"
                    >
                        Show My Attendance
                    </button>
                </div>
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
    const [dailyPunches, setDailyPunches] = useState<Record<number, { punchIn?: string | number; punchOut?: string | number; punchInRaw?: string | number; punchOutRaw?: string | number }>>({});

    const normalizeIdentifier = (value: string | number | null | undefined): string | null => {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (!trimmed) return null;
        return trimmed.toLowerCase();
    };

    useEffect(() => {
        const fetchUserAttendance = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth() + 1; // API uses 1-12

            try {
                const userPresentRecords = await DataService.getAttendanceForUserByMonth(employee.id, year, month);

                const presentDays = new Set<number>();
                const punches: Record<number, { punchIn?: string | number; punchOut?: string | number; punchInRaw?: string | number; punchOutRaw?: string | number }> = {};
                const identifierSet = new Set<string>();
                const addIdentifier = (value: string | number | null | undefined) => {
                    const normalized = normalizeIdentifier(value);
                    if (normalized) identifierSet.add(normalized);
                };
                addIdentifier(employee.id);
                addIdentifier(employee.email);
                addIdentifier(employee.name);
                const pad = (n: number) => String(n).padStart(2, '0');
                const totalDaysInMonth = new Date(year, month, 0).getDate();

                const fetchDailyDataForDay = async (day: number) => {
                    const date = new Date(year, month - 1, day);
                    const ds = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                    try {
                        const daily = await DataService.getAttendanceByDate(ds);
                        const match = daily.find(entry => {
                            const normalized = normalizeIdentifier(entry.userId);
                            return normalized ? identifierSet.has(normalized) : false;
                        });
                        if (match) {
                            const normalizedMatchedId = normalizeIdentifier(match.userId);
                            if (normalizedMatchedId) identifierSet.add(normalizedMatchedId);
                            const dayOfWeek = date.getDay();
                            if (dayOfWeek === 0) {
                                return;
                            }

                            presentDays.add(day);
                            const existing = punches[day] || {};
                            const dateSource = match.date ?? ds;
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
                    if (day) {
                        addIdentifier((rec as any)?.userId);
                        const baseDate = new Date(year, month - 1, day);
                        const dayOfWeek = baseDate.getDay();
                        if (dayOfWeek === 0) {
                            continue;
                        }

                        presentDays.add(day);
                        const existing = punches[day] || {};
                        const dateSource = rec.date ?? undefined;
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
                        const dayOfWeek = new Date(year, month - 1, selectedDayNumber).getDay();
                        if (dayOfWeek !== 0) {
                            presentDays.add(selectedDayNumber);
                            if (!punches[selectedDayNumber]) {
                                punches[selectedDayNumber] = {};
                            }
                            daysToFetch.add(selectedDayNumber);
                        }
                    }
                }
                if (daysToFetch.size > 0) {
                    const uniqueDays = Array.from(daysToFetch);
                    await Promise.all(uniqueDays.map(day => fetchDailyDataForDay(day)));
                }
                setPresentDates(presentDays);
                setDailyPunches(punches);
                console.log(`EmployeeAttendanceDetailModal: punch details for ${employee.name} (${employee.id}) in ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    Array.from(presentDays).sort((a, b) => a - b).map(day => ({
                        day,
                        punchIn: punches[day]?.punchIn ?? punches[day]?.punchInRaw,
                        punchOut: punches[day]?.punchOut ?? punches[day]?.punchOutRaw,
                    })));

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
                const punchesForDay = value as { punchIn?: string | number; punchOut?: string | number; punchInRaw?: string | number; punchOutRaw?: string | number };
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

    const parseTimeComponents = (time: string | number): { hours: number; minutes: number } | null => {
        if (typeof time === 'number') {
            const fromEpoch = coerceDateFromEpoch(time);
            if (fromEpoch) {
                return { hours: fromEpoch.getHours(), minutes: fromEpoch.getMinutes() };
            }
            return null;
        }
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

    const coerceDateFromEpoch = (input: string | number): Date | null => {
        const numeric = typeof input === 'number' ? input : Number(String(input).trim());
        if (!Number.isFinite(numeric)) return null;
        const millis = numeric > 1e12 ? numeric : numeric > 1e9 ? numeric * 1000 : null;
        if (!millis) return null;
        const date = new Date(millis);
        return isNaN(date.getTime()) ? null : date;
    };

    const resolveDateTime = (day: number, timeValue?: string | number, rawValue?: string | number): Date | null => {
        if (timeValue === undefined || timeValue === null) return null;

        if (typeof timeValue === 'number') {
            const epoch = coerceDateFromEpoch(timeValue);
            if (epoch) return epoch;
        }

        if (typeof timeValue === 'string') {
            const trimmed = timeValue.trim();
            const epoch = /^\d{9,}$/.test(trimmed) ? coerceDateFromEpoch(trimmed) : null;
            if (epoch) return epoch;
            // If ISO-like, extract clock part and compose later
            if (/T\d{2}:\d{2}/.test(trimmed)) {
                const match = trimmed.match(/T(\d{2}):(\d{2})/);
                if (match) {
                    const hh = parseInt(match[1], 10);
                    const mm = parseInt(match[2], 10);
                    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
                        // Compose below using raw date or fallback
                        const datePart = rawValue ? String(rawValue).split('T')[0] : null;
                        if (datePart) {
                            const iso = `${datePart}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
                            const d = new Date(iso);
                            if (!isNaN(d.getTime())) return d;
                        }
                        const d = new Date(
                            monthDate.getFullYear(),
                            monthDate.getMonth(),
                            day,
                            hh,
                            mm,
                        );
                        return d;
                    }
                }
            }
        }

        if (rawValue !== undefined && rawValue !== null) {
            if (typeof rawValue === 'number') {
                const rawEpoch = coerceDateFromEpoch(rawValue);
                if (rawEpoch) return rawEpoch;
            }
            // Prefer composing from YYYY-MM-DD + HH:mm to avoid TZ shifts
            const datePart = String(rawValue).split('T')[0];
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

    const formatTime = (day: number, value?: string | number, raw?: string | number) => {
        const parsed = resolveDateTime(day, value, raw);
        if (!parsed) return value ?? '—';
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (day: number, punchIn?: string | number, punchInRaw?: string | number, punchOut?: string | number, punchOutRaw?: string | number) => {
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
                        const isWeekend = dayOfWeek === 0; // Only Sunday is non-working
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
    presentDays?: number[];
}> = ({ date, selectedDate, onDateClick, presentDays }) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const presentSet = useMemo(() => new Set(presentDays || []), [presentDays]);

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
                    const isPresent = presentSet.has(day);
                    const isFuture = d > today;
                    const isSunday = d.getDay() === 0; // Only Sunday is off

                    let baseClasses = "w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors";
                    let selectedClasses = isSelected ? "bg-indigo-600 text-white font-bold shadow-lg" : "hover:bg-indigo-100";
                    let statusClasses = "";
                    if (isPresent) {
                        statusClasses = "bg-green-500 text-white font-bold";
                    } else if (isSunday) {
                        statusClasses = "bg-slate-100 text-slate-400";
                    } else if (!isFuture) {
                        statusClasses = "bg-red-100 text-red-700";
                    }
                    let todayClasses = isToday && !isSelected && !isPresent ? "ring-2 ring-slate-300" : "";

                    return (
                        <div key={day} className="flex justify-center">
                            <button onClick={() => onDateClick(d)} className={`${baseClasses} ${selectedClasses} ${todayClasses} ${statusClasses}`}>{day}</button>
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
    const [presentManagers, setPresentManagers] = useState<User[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedDate && currentUser) {
            const fetchAttendance = async () => {
                setIsLoading(true);
                try {
                    const dateString = formatLocalDate(selectedDate);
                    const attendanceRecords = await DataService.getAttendanceByDate(dateString);
                    const presentIds = Array.from(new Set(attendanceRecords.map(rec => String(rec.userId))));
                    const apiUsers = await DataService.getUsers();

                    const merged = new Map<string, User>();
                    for (const u of apiUsers) merged.set(u.id, u);

                    const displayUsers: User[] = presentIds.map(id => {
                        const resolved = merged.get(id);
                        return resolved || { id, name: id, email: '', role: UserRole.EMPLOYEE } as User;
                    });
                    const managers: User[] = [];
                    const employees: User[] = [];
                    displayUsers.forEach(user => {
                        if (user.role === UserRole.MANAGER) {
                            managers.push(user);
                        } else {
                            employees.push(user);
                        }
                    });
                    setPresentManagers(managers);
                    setPresentEmployees(employees);
                } catch (error) {
                    console.error("Failed to fetch daily attendance", error);
                    setPresentManagers([]);
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
                        presentManagers.length > 0 || presentEmployees.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-1">Managers</h4>
                                    {presentManagers.length > 0 ? (
                                        <ul className="space-y-3">
                                            {presentManagers.map(manager => (
                                                <li key={manager.id} onClick={() => setSelectedPerson(manager)} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">{getInitials(manager.name)}</div>
                                                    <div>
                                                        <p className="font-semibold text-slate-700">{manager.name}</p>
                                                        <p className="text-xs text-slate-500">{manager.email}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-slate-500 text-sm">No managers present.</p>}
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-1">Employees</h4>
                                    {presentEmployees.length > 0 ? (
                                        <ul className="space-y-3">
                                            {presentEmployees.map(emp => (
                                                <li key={emp.id} onClick={() => setSelectedPerson(emp)} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">{getInitials(emp.name)}</div>
                                                    <div>
                                                        <p className="font-semibold text-slate-700">{emp.name}</p>
                                                        <p className="text-xs text-slate-500">{emp.email}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-slate-500 text-sm">No employees present.</p>}
                                </div>
                            </div>
                        ) : <p className="text-slate-500 text-center pt-8">No attendance records for this day.</p>
                    ) : <p className="text-slate-500 text-center pt-8">Select a date from the calendar to view attendance.</p>}
            </div>
            {selectedPerson && selectedDate && (
                <EmployeeAttendanceDetailModal
                    employee={selectedPerson}
                    monthDate={selectedDate}
                    presentDate={selectedDate}
                    onClose={() => setSelectedPerson(null)}
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
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailDate, setDetailDate] = useState<Date | null>(new Date());

    const normalizeIdentifier = (value: string | number | null | undefined): string | null => {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        if (!trimmed) return null;
        return trimmed.toLowerCase();
    };

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

            try {
                const attendanceRecords = await DataService.getAttendanceForUserByMonth(user.id, year, month);
                console.log("EmployeeAttendanceView: API attendance records received:", attendanceRecords);

                const presentDates = new Set<number>();
                const identifierSet = new Set<string>();
                const addIdentifier = (value: string | number | null | undefined) => {
                    const normalized = normalizeIdentifier(value);
                    if (normalized) identifierSet.add(normalized);
                };

                addIdentifier(user.id);
                addIdentifier(user.email);
                addIdentifier(user.name);

                for (const rec of attendanceRecords) {
                    addIdentifier((rec as any)?.userId);
                    const core = typeof rec.date === 'string' ? rec.date : '';
                    const d = core ? extractDay(core) : null;
                    if (d) presentDates.add(d);
                }
                console.log("EmployeeAttendanceView: Present days from API:", Array.from(presentDates));

                const pad = (value: number) => String(value).padStart(2, '0');
                const daysToVerify: number[] = [];
                const fallbackMatches: Array<{ day: number; date: string }> = [];

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month - 1, day);
                    if (date > today) {
                        continue;
                    }

                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        continue;
                    }

                    if (!presentDates.has(day)) {
                        daysToVerify.push(day);
                    }
                }

                if (daysToVerify.length > 0) {
                    console.log("EmployeeAttendanceView: Performing daily fallback checks", daysToVerify);
                    await Promise.all(daysToVerify.map(async day => {
                        const ds = `${year}-${pad(month)}-${pad(day)}`;
                        try {
                            const daily = await DataService.getAttendanceByDate(ds);
                            const match = daily.find(entry => {
                                const normalized = normalizeIdentifier(entry.userId);
                                return normalized ? identifierSet.has(normalized) : false;
                            });
                            if (match) {
                                presentDates.add(day);
                                const normalizedMatchedId = normalizeIdentifier(match.userId);
                                if (normalizedMatchedId) identifierSet.add(normalizedMatchedId);
                                fallbackMatches.push({ day, date: ds });
                            }
                        } catch (error) {
                            console.error("EmployeeAttendanceView: Failed daily attendance fallback", error);
                        }
                    }));
                }

                const presentDayList = Array.from(presentDates)
                    .sort((a, b) => a - b)
                    .map(day => ({
                        day,
                        date: `${year}-${pad(month)}-${pad(day)}`,
                    }));
                console.log(`EmployeeAttendanceView: ${presentDayList.length} present day(s) for ${user.name}`, presentDayList);
                if (fallbackMatches.length > 0) {
                    console.log("EmployeeAttendanceView: Fallback matches identified:", fallbackMatches);
                }

                const newStatus: Record<string, 'present' | 'absent'> = {};

                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month - 1, day);
                    if (date > today) {
                        continue;
                    }

                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        continue;
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
                        if (status === 'present') {
                            const dayNum = Number(dayKey);
                            if (!Number.isFinite(dayNum)) return;
                            const date = new Date(year, month - 1, dayNum);
                            const isWeekend = [0, 6].includes(date.getDay());
                            if (isWeekend) {
                                return;
                            }
                            if (merged[dayKey] !== 'present') {
                                merged[dayKey] = 'present';
                            }
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
                    const dayOfWeek = now.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        console.log(`EmployeeAttendanceView: Skipping optimistic update for weekend day ${day}.`);
                    } else {
                        setAttendanceStatus(prev => {
                            const updatedStatus = { ...prev, [day]: 'present' };
                            console.log(`EmployeeAttendanceView: Optimistically setting day ${day} to 'present'. New status:`, updatedStatus);
                            return updatedStatus;
                        });
                    }
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
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
                    <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
                </div>
                <button
                    type="button"
                    onClick={() => { setDetailDate(new Date()); setDetailOpen(true); }}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                    title="Show Detailed Attendence"
                >
                    Show Detailed Attendence
                </button>
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
        {detailOpen && detailDate && (
            <EmployeeAttendanceDetailModal
                employee={user}
                monthDate={detailDate}
                presentDate={detailDate}
                onClose={() => setDetailOpen(false)}
            />
        )}
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