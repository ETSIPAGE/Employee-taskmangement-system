import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole } from '../../types';
import { ChartBarIcon, ClipboardListIcon, UsersIcon, ExclamationTriangleIcon, ArrowPathIcon } from '../../constants';

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

const OverdueTaskItem = ({ task, project, assignee }: { task: Task, project?: Project, assignee?: User }) => {
    return (
        <div className="py-3 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center justify-between">
                <div>
                    <Link to={`/tasks/${task.id}`} className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors">
                        {task.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
                        <span>Project: {project?.name || 'N/A'}</span>
                        <span>Assignee: {assignee?.name || 'Unassigned'}</span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-bold text-red-600">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                    </p>
                    <p className="text-xs text-red-500">Overdue</p>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProjects: 0,
        completedProjects: 0,
        overdueTasks: 0,
    });
    const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
    const [projectProgressData, setProjectProgressData] = useState<any[]>([]);
    const [overdueTasksList, setOverdueTasksList] = useState<Task[]>([]);
    const [projectsMap, setProjectsMap] = useState<Map<string, Project>>(new Map());
    const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [users, projects, tasks] = await Promise.all([
                AuthService.getUsers(),
                DataService.getAllProjects(),
                DataService.getAllTasks()
            ]);

            setUsersMap(new Map(users.map(u => [u.id, u])));
            setProjectsMap(new Map(projects.map(p => [p.id, p])));

            const projectProgressPromises = projects.map(async p => {
                const projectTasks = await DataService.getTasksByProject(p.id);
                const completed = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                return {
                    label: p.name,
                    value: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
                };
            });
            const projectProgress = await Promise.all(projectProgressPromises);
            
            const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED)
                .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
            setOverdueTasksList(overdueTasks.slice(0, 5));

            setStats({
                totalUsers: users.length,
                totalProjects: projects.length,
                completedProjects: projectProgress.filter(p => p.value === 100).length,
                overdueTasks: overdueTasks.length,
            });

            setTaskStatusData([
                { label: TaskStatus.TODO, value: tasks.filter(t => t.status === TaskStatus.TODO).length, color: '#f59e0b' },
                { label: TaskStatus.IN_PROGRESS, value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
                { label: TaskStatus.ON_HOLD, value: tasks.filter(t => t.status === TaskStatus.ON_HOLD).length, color: '#94a3b8' },
                { label: TaskStatus.COMPLETED, value: tasks.filter(t => t.status === TaskStatus.COMPLETED).length, color: '#22c55e' },
            ]);

            setProjectProgressData(projectProgress.sort((a,b) => b.value - a.value).slice(0, 5));
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
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
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
                    <p className="text-slate-600">Welcome, {user?.name}! Here's the company-wide overview.</p>
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
                    icon={<UsersIcon />}
                    title="Total Employees"
                    value={`${stats.totalUsers}`}
                    color="bg-sky-100 text-sky-600"
                />
                 <StatCard 
                    icon={<ClipboardListIcon />}
                    title="Active Projects"
                    value={`${stats.totalProjects - stats.completedProjects}`}
                    color="bg-indigo-100 text-indigo-600"
                />
                 <StatCard 
                    icon={<ExclamationTriangleIcon />}
                    title="Overdue Tasks"
                    value={`${stats.overdueTasks}`}
                    color="bg-red-100 text-red-600"
                />
                 <StatCard 
                    icon={<ChartBarIcon />}
                    title="Projects Completed"
                    value={`${stats.completedProjects}`}
                    color="bg-emerald-100 text-emerald-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Project Progress</h2>
                    <BarChart data={projectProgressData} title="Top 5 Projects by Completion" />
                </div>
                <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Task Status Overview</h2>
                    <PieChart data={taskStatusData} />
                </div>
            </div>

            <div className="mt-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Overdue Tasks</h2>
                    {overdueTasksList.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                                                   {overdueTasksList.map(task => (
                                                       <li key={task.id}>
                                                           <OverdueTaskItem task={task} project={projectsMap.get(task.projectId)} assignee={usersMap.get(task.assigneeId || '')} />
                                                       </li>
                                                   ))}
                                                </ul>
                    ) : (
                        <p className="text-center py-4 text-slate-500">No overdue tasks. Great job!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
