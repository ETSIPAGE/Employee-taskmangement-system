import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService'; // Assuming this also returns a Promise now or will be updated.
import Modal from '../shared/Modal';

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const EmployeeAttendanceDetailModal: React.FC<{ employee: User; monthDate: Date; onClose: () => void; }> = ({ employee, monthDate, onClose }) => {
    const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 0 });
    const [presentDates, setPresentDates] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true); // Add loading state
    const [error, setError] = useState<string | null>(null); // Add error state

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            
            try {
                // Await the async call
                const userPresentDateStrings = await DataService.getAttendanceForUserByMonth(employee.id, year, month);
                const presentDays = new Set(userPresentDateStrings.map(d => new Date(d).getUTCDate()));
                setPresentDates(presentDays);

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let workingDays = 0;
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                        workingDays++;
                    }
                }

                const presentCount = presentDays.size;
                const absentCount = workingDays - presentCount;
                const percentage = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

                setStats({ present: presentCount, absent: absentCount, percentage });
            } catch (err) {
                console.error("Failed to fetch employee attendance details:", err);
                setError("Failed to load attendance data. Please try again.");
                setStats({ present: 0, absent: 0, percentage: 0 }); // Reset stats on error
                setPresentDates(new Set());
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [employee, monthDate]);
    
    const renderMiniCalendar = () => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
             <div className="mt-4">
                 <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-semibold mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                    {days.map(day => {
                        const date = new Date(year, month, day);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isPresent = presentDates.has(day);

                        let classes = "w-8 h-8 flex items-center justify-center rounded text-sm";
                        if (isWeekend) {
                            classes += " bg-slate-100 text-slate-400";
                        } else if (isPresent) {
                            classes += " bg-green-500 text-white font-bold";
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
            <h4 className="font-semibold text-slate-700">Stats for {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
            {loading ? (
                <div className="text-center py-4 text-slate-500">Loading attendance stats...</div>
            ) : error ? (
                <div className="text-center py-4 text-red-600">{error}</div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4 my-4 text-center">
                        <div className="bg-green-50 p-3 rounded-lg"><p className="text-2xl font-bold text-green-700">{stats.present}</p><p className="text-xs text-green-600">Present</p></div>
                        <div className="bg-red-50 p-3 rounded-lg"><p className="text-2xl font-bold text-red-700">{stats.absent}</p><p className="text-xs text-red-600">Absent</p></div>
                        <div className="bg-indigo-50 p-3 rounded-lg"><p className="text-2xl font-bold text-indigo-700">{stats.percentage}%</p><p className="text-xs text-indigo-600">Percentage</p></div>
                    </div>
                    {renderMiniCalendar()}
                </>
            )}
        </Modal>
    );
};


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
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
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

const AdminAttendanceView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [presentEmployees, setPresentEmployees] = useState<User[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false); // New loading state
    const [attendanceError, setAttendanceError] = useState<string | null>(null); // New error state
    const [allUsers, setAllUsers] = useState<User[]>([]); // To store all users once
    const [loadingUsers, setLoadingUsers] = useState(true); // Loading state for all users

    // Fetch all users once when the component mounts
    useEffect(() => {
        const fetchAllUsers = async () => {
            setLoadingUsers(true);
            try {
                const users = await AuthService.getUsers(); // Await AuthService.getUsers()
                setAllUsers(users);
            } catch (error) {
                console.error("Failed to fetch all users for AdminAttendanceView:", error);
                // Handle error for user fetching if necessary
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchAllUsers();
    }, []); // Empty dependency array means this runs once on mount

    useEffect(() => {
        const fetchPresentEmployees = async () => {
            if (selectedDate && allUsers.length > 0) { // Only fetch if date is selected and users are loaded
                setLoadingAttendance(true);
                setAttendanceError(null);
                try {
                    const dateString = selectedDate.toISOString().split('T')[0];
                    // Await the async call
                    const presentIds = await DataService.getAttendanceByDate(dateString);
                    const employees = allUsers.filter(u => presentIds.includes(u.id));
                    setPresentEmployees(employees);
                } catch (err) {
                    console.error("Failed to fetch present employees:", err);
                    setAttendanceError("Failed to load attendance for this date.");
                    setPresentEmployees([]);
                } finally {
                    setLoadingAttendance(false);
                }
            } else if (!selectedDate) {
                setPresentEmployees([]); // Clear if no date is selected
            }
        };

        if (!loadingUsers) { // Only attempt to fetch attendance if users are done loading
            fetchPresentEmployees();
        }
       
    }, [selectedDate, allUsers, loadingUsers]); // Re-run when selectedDate or allUsers changes

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
                {loadingUsers ? (
                    <p className="text-slate-500 text-center pt-8">Loading all user data...</p>
                ) : selectedDate ? (
                    loadingAttendance ? (
                        <p className="text-slate-500 text-center pt-8">Loading employees for this day...</p>
                    ) : attendanceError ? (
                        <p className="text-red-600 text-center pt-8">{attendanceError}</p>
                    ) : presentEmployees.length > 0 ? (
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
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
};

const EmployeeAttendanceView: React.FC<{ user: User }> = ({ user }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'present' | 'absent' | 'weekend' | 'future'>>({});
    const [loadingAttendance, setLoadingAttendance] = useState(false); // New loading state
    const [attendanceError, setAttendanceError] = useState<string | null>(null); // New error state

     useEffect(() => {
        const fetchUserAttendance = async () => {
            setLoadingAttendance(true);
            setAttendanceError(null);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            const newStatus: Record<string, 'present' | 'absent' | 'weekend' | 'future'> = {};

            try {
                // Await the async call
                const presentDateStrings = await DataService.getAttendanceForUserByMonth(user.id, year, month);
                const presentDaysSet = new Set(presentDateStrings.map(d => new Date(d).getUTCDate()));
                
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dayOfWeek = date.getDay();

                    if (date > today) {
                        newStatus[day] = 'future'; // Mark future dates
                    } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Skip weekends
                        newStatus[day] = 'weekend'; // Mark weekends
                    } else {
                        if (presentDaysSet.has(day)) {
                            newStatus[day] = 'present';
                        } else {
                            newStatus[day] = 'absent';
                        }
                    }
                }
                setAttendanceStatus(newStatus);
            } catch (err) {
                console.error("Failed to fetch employee's monthly attendance:", err);
                setAttendanceError("Failed to load your attendance data. Please try again.");
                setAttendanceStatus({}); // Clear status on error
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchUserAttendance();
    }, [currentDate, user.id]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
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
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                </div>
                {loadingAttendance ? (
                    <div className="text-center py-8 text-slate-500">Loading your attendance...</div>
                ) : attendanceError ? (
                    <div className="text-center py-8 text-red-600">{attendanceError}</div>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                        {days.map(day => {
                            const status = attendanceStatus[day];
                            let statusClasses = "text-slate-800 bg-slate-100"; // Default for un-marked/weekends/future
                            if (status === 'present') statusClasses = "bg-green-500 text-white font-bold";
                            else if (status === 'absent') statusClasses = "bg-red-500 text-white font-bold";
                            else if (status === 'weekend') statusClasses = "bg-slate-100 text-slate-400";
                            else if (status === 'future') statusClasses = "bg-gray-50 text-gray-400"; // New style for future dates
                            
                            return (
                                <div key={day} className="flex justify-center">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full ${statusClasses}`}>{day}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
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
                        <li className="flex items-center"><div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 mr-3"></div><span className="text-slate-700">Weekend</span></li> {/* Updated */}
                        <li className="flex items-center"><div className="w-5 h-5 rounded-full bg-gray-50 text-gray-400 mr-3"></div><span className="text-slate-700">Future Date</span></li> {/* New */}
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