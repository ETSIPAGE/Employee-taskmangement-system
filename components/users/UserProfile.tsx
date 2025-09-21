import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';
import { User, Task, Project, TaskStatus, UserRole, Department } from '../../types';
import { MailIcon, CalendarIcon, BriefcaseIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, TrendingUpIcon } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import StarRating from '../shared/StarRating';

const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const StatCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; }> = ({ icon, value, label }) => (
    <div className="bg-white rounded-lg shadow p-4 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-slate-100 text-slate-600">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
    </div>
);

const UserProfile: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser } = useAuth();
    
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Record<string, Project>>({});
    const [departments, setDepartments] = useState<Record<string, Department>>({});
    const [manager, setManager] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [
                    fetchedUser, 
                    userTasks, 
                    allProjects, 
                    allDepts, 
                    allUsersFromApi
                ] = await Promise.all([
                    DataService.getUserByIdFromApi(userId),
                    DataService.getTasksByAssignee(userId),
                    DataService.getAllProjects(),
                    DataService.getDepartments(),
                    DataService.getAllUsersFromApi()
                ]);

                if (fetchedUser) {
                    setUser(fetchedUser);

                    if (fetchedUser.managerId) {
                        setManager(allUsersFromApi.find(u => u.id === fetchedUser.managerId) || null);
                    }
                    
                    setTasks(userTasks);
                    setProjects(allProjects.reduce((acc, p) => ({...acc, [p.id]: p }), {}));
                    setDepartments(allDepts.reduce((acc, d) => ({...acc, [d.id]: d }), {}));

                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Failed to load user profile data:", error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [userId]);

    const taskStats = useMemo(() => {
        const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED).length;
        return { completed, inProgress, overdue };
    }, [tasks]);

    if (isLoading) {
        return <div className="text-center p-10">Loading user profile...</div>;
    }

    if (!user) {
        return <div className="text-center p-10">User not found.</div>;
    }
    
    if (currentUser?.role !== UserRole.ADMIN) {
        return <Navigate to="/" />;
    }

    return (
        <div>
            <div className="mb-6">
                <Link to="/users" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to All Employees
                </Link>
            </div>

            {/* Header */}
            <div className="flex items-center space-x-5 mb-8">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-4xl font-bold flex-shrink-0">
                    {getInitials(user.name)}
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-slate-800">{user.name}</h1>
                    <p className="text-lg text-slate-500">{user.jobTitle}</p>
                    {user.rating !== undefined && (
                        <div className="mt-2">
                            <StarRating rating={user.rating} />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Contact & Role</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center"><MailIcon className="h-4 w-4 mr-3 text-slate-400" /> <span className="text-slate-700">{user.email}</span></div>
                            <div className="flex items-center"><CalendarIcon className="h-4 w-4 mr-3 text-slate-400" /> <span className="text-slate-700">Joined on {new Date(user.joinedDate!).toLocaleDateString()}</span></div>
                            <div className="flex items-center"><BriefcaseIcon className="h-4 w-4 mr-3 text-slate-400" /> <span className="text-slate-700">Role: {user.role}</span></div>
                             {manager && <div className="flex items-center"><span className="font-semibold w-24">Manager:</span> <span className="text-slate-700">{manager.name}</span></div>}
                            <div>
                                <h4 className="font-semibold mb-1">Departments:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {user.departmentIds?.map(id => departments[id] && (
                                        <span key={id} className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-full">{departments[id].name}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {user.skills?.map(skill => (
                                <span key={skill} className="bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full">{skill}</span>
                            ))}
                            {(!user.skills || user.skills.length === 0) && <p className="text-sm text-slate-500">No skills listed.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard icon={<CheckCircleIcon />} value={taskStats.completed} label="Tasks Completed" />
                        <StatCard icon={<ClockIcon />} value={taskStats.inProgress} label="Tasks In Progress" />
                        <StatCard icon={<ExclamationTriangleIcon />} value={taskStats.overdue} label="Tasks Overdue" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard icon={<TrendingUpIcon />} value="94%" label="On-Time Rate (Month)" />
                        <StatCard icon={<ClockIcon />} value="2.5 Days" label="Avg. Completion Time" />
                        <StatCard icon={<CalendarIcon className="h-6 w-6" />} value="152 Hrs" label="Avg. Login Hours (Month)" />
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Assigned Tasks ({tasks.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Task Name</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Project</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Due Date</th>
                                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {tasks.map(task => (
                                        <tr key={task.id}>
                                            <td className="px-4 py-3 font-medium text-slate-800">{task.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{projects[task.projectId]?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 text-slate-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                                                    task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tasks.length === 0 && <p className="text-center py-8 text-slate-500">No tasks assigned to this user.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;