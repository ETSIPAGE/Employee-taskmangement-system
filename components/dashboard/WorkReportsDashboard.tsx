import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole } from '../../types';
import { ChartBarIcon, ClipboardListIcon, UsersIcon, TrendingUpIcon, ClockIcon, ArrowPathIcon, CheckCircleIcon, CalendarIcon, EditIcon, TrashIcon } from '../../constants';

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

const PieChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    if (total === 0) return <div className="flex items-center justify-center h-full text-slate-500">No data</div>;
    
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
                {data.map((item) => {
                    const percent = (item.value / total) * 100;
                    const offset = circumference - (accumulatedPercent / 100) * circumference;
                    const dashArray = `${(percent / 100) * circumference} ${circumference}`;
                    accumulatedPercent += percent;
                    return <circle key={item.label} cx="75" cy="75" r={radius} fill="transparent" stroke={item.color} strokeWidth="20" strokeDasharray={dashArray} strokeDashoffset={offset} />;
                })}
            </svg>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {data.map(item => (
                    <div key={item.label} className="flex items-center text-xs">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 font-medium">{item.label} ({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BarChart = ({ data, title }: { data: { label: string, value: number }[], title: string }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="w-full">
            <h3 className="text-md font-semibold text-slate-700 mb-2">{title}</h3>
            <div className="space-y-2">
                {data.map(item => (
                    <div key={item.label}>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-semibold text-slate-800">{item.value}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${item.value}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Confirmation modal for delete action
const ConfirmDeleteModal = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    date
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void;
    date: string;
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">Confirm Delete</h3>
                </div>
                <div className="px-6 py-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete the work notes for {date ? new Date(date).toLocaleDateString() : 'this date'}? This action cannot be undone.
                    </p>
                </div>
                <div className="px-6 py-4 bg-slate-50 rounded-b-lg flex justify-end space-x-3">
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// History modal to show all work notes
const HistoryModal = ({ 
    isOpen, 
    onClose, 
    workNotes 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    workNotes: {[key: string]: string};
}) => {
    if (!isOpen) return null;
    
    // Convert workNotes object to array and sort by date (newest first)
    const notesArray = Object.entries(workNotes)
        .map(([date, notes]) => ({ date, notes }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">Work Notes History</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        &times;
                    </button>
                </div>
                <div className="px-6 py-4 overflow-y-auto flex-grow">
                    {notesArray.length > 0 ? (
                        <div className="space-y-4">
                            {notesArray.map(({ date, notes }) => (
                                <div key={date} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-slate-800">
                                            {new Date(date).toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </h4>
                                    </div>
                                    <div className="mt-2 whitespace-pre-wrap text-slate-700 bg-slate-50 p-3 rounded-md">
                                        {notes}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <p>No work notes recorded yet.</p>
                            <p className="mt-2 text-sm">Click on any date in the calendar to add notes.</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-slate-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal component for work notes
const WorkNotesModal = ({ 
    isOpen, 
    onClose, 
    date, 
    notes, 
    onSave,
    onDelete
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    date: string; 
    notes: string; 
    onSave: (notes: string) => void;
    onDelete: (date: string) => void;
}) => {
    const [workNotes, setWorkNotes] = useState(notes);
    const [isEditing, setIsEditing] = useState(!notes);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    useEffect(() => {
        setWorkNotes(notes);
        setIsEditing(!notes);
    }, [notes, date]);
    
    if (!isOpen) return null;
    
    const handleSave = () => {
        if (date) {
            onSave(workNotes);
            setIsEditing(false);
        }
    };
    
    const handleEdit = () => {
        if (date) {
            setIsEditing(true);
        }
    };
    
    const handleDelete = () => {
        if (date) {
            setIsDeleteModalOpen(true);
        }
    };
    
    const confirmDelete = () => {
        if (date) {
            onDelete(date);
        }
        setIsDeleteModalOpen(false);
        onClose();
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-800">
                            Work Notes for {date ? new Date(date).toLocaleDateString() : 'Selected Date'}
                        </h3>
                        {!isEditing && notes && date && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleEdit}
                                    className="p-1 text-slate-500 hover:text-indigo-600"
                                    title="Edit notes"
                                >
                                    <EditIcon />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-1 text-slate-500 hover:text-red-600"
                                    title="Delete notes"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4">
                        {isEditing ? (
                            <textarea
                                value={workNotes}
                                onChange={(e) => setWorkNotes(e.target.value)}
                                placeholder="Write your work notes for this date..."
                                className="w-full h-40 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        ) : notes ? (
                            <div className="whitespace-pre-wrap text-slate-700 min-h-40 p-3 border border-slate-200 rounded-md bg-slate-50">
                                {workNotes}
                            </div>
                        ) : (
                            <div className="text-slate-500 italic min-h-40 flex items-center justify-center">
                                No notes recorded for this date
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-slate-50 rounded-b-lg flex justify-end space-x-3">
                        <button
                            onClick={() => {
                                // Reset editing state when closing
                                setIsEditing(false);
                                onClose();
                            }}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
                        >
                            Close
                        </button>
                        {isEditing && (
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                            >
                                Save Notes
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                date={date}
            />
        </>
    );
};

// Calendar component for displaying tasks by date
const TaskCalendar = ({ tasks }: { tasks: Task[] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [workNotes, setWorkNotes] = useState<{[key: string]: string}>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    // Get the first day of the month and the number of days in the month
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Generate an array of days for the calendar
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
    }
    
    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }
    
    // Navigate to previous month
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    
    // Navigate to next month
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    // Navigate to today
    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    // Check if a date is today
    const isToday = (day: number) => {
        const today = new Date();
        return currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear() && 
               day === today.getDate();
    };
    
    // Check if a date has notes
    const hasNotes = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return !!workNotes[dateStr];
    };
    
    // Handle date click - simplified to always open modal
    const handleDateClick = (day: number) => {
        if (day === null) return;
        
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setIsModalOpen(true);
    };
    
    // Save work notes for a date
    const saveWorkNotes = (notes: string) => {
        if (selectedDate) {
            setWorkNotes(prev => ({
                ...prev,
                [selectedDate]: notes
            }));
        }
    };
    
    // Delete work notes for a date
    const deleteWorkNotes = (date: string) => {
        setWorkNotes(prev => {
            const newNotes = { ...prev };
            delete newNotes[date];
            return newNotes;
        });
        // Reset selected date to null after deletion
        setSelectedDate(null);
    };
    
    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Task Calendar</h2>
                <div className="flex space-x-2">
                    <button 
                        onClick={prevMonth}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                    >
                        &lt;
                    </button>
                    <button 
                        onClick={goToToday}
                        className="px-3 py-1 text-sm rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                        Today
                    </button>
                    <button 
                        onClick={nextMonth}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                    >
                        &gt;
                    </button>
                </div>
            </div>
            
            <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-slate-700">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                        {day}
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <div 
                        key={index} 
                        onClick={() => handleDateClick(day)}
                        className={`min-h-20 p-1 border rounded cursor-pointer transition-colors relative ${
                            day === null ? 'bg-slate-50' : 
                            isToday(day) ? 'bg-indigo-50 border-indigo-300' : 
                            'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {day !== null && (
                            <>
                                <div className={`text-right text-sm p-1 ${
                                    isToday(day) ? 'font-bold text-indigo-700' : 'text-slate-700'
                                }`}>
                                    {day}
                                </div>
                                {/* Show indicator if date has notes */}
                                {hasNotes(day) && (
                                    <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-indigo-500"></div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="mt-4 flex justify-center">
                <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 flex items-center"
                >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    View Work Notes History
                </button>
            </div>
            
            {selectedDate && (
                <WorkNotesModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    date={selectedDate}
                    notes={workNotes[selectedDate] || ''}
                    onSave={saveWorkNotes}
                    onDelete={deleteWorkNotes}
                />
            )}
            
            <HistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                workNotes={workNotes}
            />
        </div>
    );
};

const WorkReportsDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        avgCompletionRate: 0,
    });
    const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
    const [projectProgressData, setProjectProgressData] = useState<any[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [users, projects, tasksData] = await Promise.all([
                AuthService.getUsers(),
                DataService.getAllProjects(),
                DataService.getAllTasks()
            ]);

            setTasks(tasksData);

            // Calculate task statistics
            const totalTasks = tasksData.length;
            const completedTasks = tasksData.filter(t => t.status === TaskStatus.COMPLETED).length;
            const inProgressTasks = tasksData.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
            const overdueTasks = tasksData.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED).length;
            
            // Calculate average completion rate
            const avgCompletionRate = projects.length > 0 
                ? Math.round((completedTasks / totalTasks) * 100) || 0 
                : 0;

            setStats({
                totalTasks,
                completedTasks,
                inProgressTasks,
                overdueTasks,
                avgCompletionRate,
            });

            // Task status distribution
            setTaskStatusData([
                { label: TaskStatus.TODO, value: tasksData.filter(t => t.status === TaskStatus.TODO).length, color: '#f59e0b' },
                { label: TaskStatus.IN_PROGRESS, value: tasksData.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
                { label: TaskStatus.ON_HOLD, value: tasksData.filter(t => t.status === TaskStatus.ON_HOLD).length, color: '#94a3b8' },
                { label: TaskStatus.COMPLETED, value: tasksData.filter(t => t.status === TaskStatus.COMPLETED).length, color: '#22c55e' },
            ]);

            // Project progress data (top 5 projects by completion)
            const projectProgressPromises = projects.map(async p => {
                const projectTasks = await DataService.getTasksByProject(p.id);
                const completed = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                return {
                    label: p.name,
                    value: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
                };
            });
            const projectProgress = await Promise.all(projectProgressPromises);
            setProjectProgressData(projectProgress.sort((a,b) => b.value - a.value).slice(0, 5));
        } catch (error) {
            console.error("Failed to load work reports data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Work Reports</h1>
                    <p className="text-slate-600">Detailed analytics and reports on work progress and performance.</p>
                </div>
                <button 
                    onClick={loadData} 
                    disabled={isLoading} 
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Refresh data"
                >
                    <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    icon={<ClipboardListIcon />}
                    title="Total Tasks"
                    value={`${stats.totalTasks}`}
                    color="bg-indigo-100 text-indigo-600"
                />
                <StatCard 
                    icon={<CheckCircleIcon />}
                    title="Completed Tasks"
                    value={`${stats.completedTasks}`}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatCard 
                    icon={<ClockIcon />}
                    title="In Progress"
                    value={`${stats.inProgressTasks}`}
                    color="bg-amber-100 text-amber-600"
                />
                <StatCard 
                    icon={<TrendingUpIcon />}
                    title="Avg. Completion"
                    value={`${stats.avgCompletionRate}%`}
                    color="bg-cyan-100 text-cyan-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Project Progress Report</h2>
                    <BarChart data={projectProgressData} title="Top 5 Projects by Completion" />
                </div>
                <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Task Status Distribution</h2>
                    <PieChart data={taskStatusData} />
                </div>
            </div>

            {/* Calendar Section */}
            <div className="mt-8">
                <TaskCalendar tasks={tasks} />
            </div>

            <div className="mt-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Work Analytics Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-700 mb-2">Task Completion Rate</h3>
                            <p className="text-3xl font-bold text-indigo-600">{stats.avgCompletionRate}%</p>
                            <p className="text-sm text-slate-500 mt-1">Overall task completion</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-700 mb-2">Overdue Tasks</h3>
                            <p className="text-3xl font-bold text-red-600">{stats.overdueTasks}</p>
                            <p className="text-sm text-slate-500 mt-1">Tasks past due date</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-700 mb-2">Active Projects</h3>
                            <p className="text-3xl font-bold text-amber-600">{projectProgressData.length}</p>
                            <p className="text-sm text-slate-500 mt-1">Projects in progress</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkReportsDashboard;