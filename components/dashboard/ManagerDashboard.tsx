import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ClockIcon, DocumentCheckIcon, ExclamationTriangleIcon, ArrowPathIcon } from '../../constants';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';
import { Project, Task, TaskStatus, User } from '../../types';

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) => (
    <div className="bg-white rounded-lg shadow-lg p-5 flex items-center">
        <div className={`rounded-full p-3 ${color}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

interface ProjectWithProgress extends Project {
    progress: number;
    status: string;
    statusColor: string;
}

const ProjectRow: React.FC<ProjectWithProgress> = ({ id, name, status, progress, statusColor }) => (
    <li className="py-3 sm:py-4">
        <div className="flex items-center space-x-4">
            <div className="flex-1 min-w-0">
                <Link to={`/projects/${id}`} className="text-sm font-medium text-slate-900 truncate hover:text-indigo-600 transition-colors">
                    {name}
                </Link>
                <div className="flex items-center mt-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${statusColor} mr-2`}></div>
                    <p className="text-sm text-slate-500 truncate">
                        {status}
                    </p>
                </div>
            </div>
            <div className="w-32">
                <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className="inline-flex items-center text-sm font-semibold text-slate-900 w-10 text-right">
                {progress}%
            </div>
        </div>
    </li>
);

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    if (total === 0) {
        return <div className="flex items-center justify-center h-48 text-slate-500">No task data available</div>;
    }
    
    const radius = 60;
    const strokeWidth = 20;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div className="flex items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
                {data.map((item, index) => {
                    const percent = (item.value / total) * 100;
                    const offset = circumference - (accumulatedPercent / 100) * circumference;
                    const dashArray = `${(percent / 100) * circumference} ${circumference}`;
                    accumulatedPercent += percent;

                    return (
                        <circle
                            key={index}
                            cx="75"
                            cy="75"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                        />
                    );
                })}
                 <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-slate-800 text-2xl font-bold rotate-90 origin-center">
                    {total}
                </text>
                 <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" className="fill-slate-500 text-xs font-medium rotate-90 origin-center">
                    Total Tasks
                </text>
            </svg>
        </div>
    );
};

const PriorityTaskItem = ({ task }: { task: Task }) => {
    const assignee = AuthService.getUserById(task.assigneeId || '');
    return (
        <li className="py-3 flex justify-between items-center">
            <div>
                <Link to={`/tasks/${task.id}`} className="font-semibold text-slate-700 hover:text-indigo-600">{task.name}</Link>
                <p className="text-xs text-slate-500">{assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}</p>
            </div>
            {task.dueDate && <span className="text-sm font-medium text-slate-600">{new Date(task.dueDate).toLocaleDateString()}</span>}
        </li>
    );
};


const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
    const [teamTaskCounts, setTeamTaskCounts] = useState({ todo: 0, inProgress: 0, completed: 0 });
    const [teamSize, setTeamSize] = useState(0);
    const [highPriorityTasks, setHighPriorityTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(() => {
        setIsLoading(true);
        if (user) {
            // Fetch team members
            const teamMembers = AuthService.getTeamMembers(user.id);
            setTeamSize(teamMembers.length);

            // Fetch manager's projects and calculate progress
            const managerProjects = DataService.getProjectsByManager(user.id);
            const projectsWithProgress = managerProjects.map(p => {
                const projectTasks = DataService.getTasksByProject(p.id);
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                
                let status = "On Track";
                let statusColor = "bg-green-500";
                if (progress < 50) {
                    status = "At Risk";
                    statusColor = "bg-red-500";
                } else if (progress < 100) {
                    status = "In Progress";
                    statusColor = "bg-blue-500";
                } else {
                    status = "Completed";
                    statusColor = "bg-gray-400";
                }

                return { ...p, progress, status, statusColor };
            });
            setProjects(projectsWithProgress);

            // Fetch team tasks and count statuses
            const teamMemberIds = teamMembers.map(tm => tm.id);
            const teamTasks = DataService.getTasksByTeam(teamMemberIds);
            const counts = {
                todo: teamTasks.filter(t => t.status === TaskStatus.TODO).length,
                inProgress: teamTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
                completed: teamTasks.filter(t => t.status === TaskStatus.COMPLETED).length
            };
            setTeamTaskCounts(counts);

            const highPrio = teamTasks
                .filter(t => t.priority === 'high' && t.status !== TaskStatus.COMPLETED)
                .sort((a,b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : 0)
                .slice(0, 5);
            setHighPriorityTasks(highPrio);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const chartData = [
        { label: TaskStatus.TODO, value: teamTaskCounts.todo, color: '#94a3b8' }, // slate-400
        { label: TaskStatus.IN_PROGRESS, value: teamTaskCounts.inProgress, color: '#3b82f6' }, // blue-500
        { label: TaskStatus.COMPLETED, value: teamTaskCounts.completed, color: '#22c55e' }, // green-500
    ];

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Manager Dashboard</h1>
                    <div className="flex items-center space-x-3">
                        <p className="text-slate-600">Welcome, {user?.name}!</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                            {user?.role}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">Here's your team's overview.</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    icon={<ClockIcon />}
                    title="Team Members"
                    value={`${teamSize}`}
                    color="bg-green-100 text-green-600"
                />
                <StatCard 
                    icon={<DocumentCheckIcon />}
                    title="Active Projects"
                    value={`${projects.filter(p=>p.progress < 100).length}`}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard 
                    icon={<ExclamationTriangleIcon />}
                    title="Tasks To-Do"
                    value={`${teamTaskCounts.todo}`}
                    color="bg-red-100 text-red-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">My Projects Overview</h2>
                        <ul className="divide-y divide-slate-200">
                           {projects.map(p => <ProjectRow key={p.id} {...p} />)}
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                         <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Team Task Status</h2>
                         <DonutChart data={chartData} />
                         <div className="mt-4 flex justify-center space-x-6">
                            {chartData.map(item => (
                                <div key={item.label} className="flex items-center text-sm">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-slate-600">{item.label}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

             <div className="mt-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Team's High-Priority Tasks</h2>
                    {highPriorityTasks.length > 0 ? (
                         <ul className="divide-y divide-slate-200">
                           {highPriorityTasks.map(task => <PriorityTaskItem key={task.id} task={task} />)}
                        </ul>
                    ) : (
                        <p className="text-center py-4 text-slate-500">No high-priority tasks for your team.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;