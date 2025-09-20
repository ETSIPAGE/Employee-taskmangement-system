import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { Task, TaskStatus, Project } from '../../types';
import { Link } from 'react-router-dom';
import { ArrowPathIcon } from '../../constants';

const ActionButton = ({ onClick, children, className }: { onClick: () => void, children: React.ReactNode, className: string }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto ${className}`}>
        {children}
    </button>
);

const TaskStatCard = ({ title, count, color }: { title: string, count: number, color: string }) => (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{count}</span>
        <span className="text-sm font-medium text-slate-500 mt-1">{title}</span>
    </div>
);

const RecentTaskItem = ({ task, projectName }: { task: Task, projectName: string }) => {
     const statusColor = {
        [TaskStatus.TODO]: 'bg-yellow-500',
        [TaskStatus.IN_PROGRESS]: 'bg-blue-500',
        [TaskStatus.ON_HOLD]: 'bg-slate-500',
        [TaskStatus.COMPLETED]: 'bg-green-500',
    };
    return (
        <li className="py-3 flex items-center justify-between">
            <div>
                <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600 transition-colors">
                    {task.name}
                </Link>
                <p className="text-xs text-slate-500">{projectName}</p>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">{task.dueDate}</span>
                <div className={`w-3 h-3 rounded-full ${statusColor[task.status]}`} title={task.status}></div>
            </div>
        </li>
    )
};


const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectsMap, setProjectsMap] = useState<Map<string, Project>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (user) {
            try {
                const [userTasks, allProjects] = await Promise.all([
                    DataService.getTasksByAssignee(user.id),
                    DataService.getAllProjects()
                ]);
                setTasks(userTasks);
                setProjectsMap(new Map(allProjects.map(p => [p.id, p])));
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            }
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const taskCounts = {
        todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
        inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        onHold: tasks.filter(t => t.status === TaskStatus.ON_HOLD).length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    };

    const getProjectName = (projectId: string) => {
        return projectsMap.get(projectId)?.name || projectId || 'Unknown Project';
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">My Dashboard</h1>
                    <p className="text-slate-600">Welcome back, {user?.name}!</p>
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

            {/* Action Center */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                     <ActionButton 
                        onClick={() => setIsPunchedIn(!isPunchedIn)}
                        className={isPunchedIn ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}
                    >
                        {isPunchedIn ? 'Punch Out' : 'Punch In'}
                    </ActionButton>
                     <ActionButton 
                        onClick={() => setIsOnBreak(!isOnBreak)}
                        className={isOnBreak ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-sky-100 text-sky-800 hover:bg-sky-200'}
                    >
                        {isOnBreak ? 'End Break' : 'Start Break'}
                    </ActionButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Task Report and Recent */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                         <TaskStatCard title="To-Do" count={taskCounts.todo} color="text-yellow-500" />
                         <TaskStatCard title="In Progress" count={taskCounts.inProgress} color="text-blue-500" />
                         <TaskStatCard title="On Hold" count={taskCounts.onHold} color="text-slate-500" />
                         <TaskStatCard title="Completed" count={taskCounts.completed} color="text-green-500" />
                    </div>
                     <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Recent Tasks</h2>
                            <Link to="/tasks" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">View All</Link>
                        </div>
                        <ul className="divide-y divide-slate-200">
                           {tasks.slice(0, 5).map(task => (
                                <RecentTaskItem key={task.id} task={task} projectName={getProjectName(task.projectId)} />
                           ))}
                           {tasks.length === 0 && <p className="text-center py-4 text-slate-500">You have no assigned tasks.</p>}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Placeholder */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Performance</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500">Avg. Task Completion</h3>
                                <p className="text-2xl font-bold text-slate-800">3.5 Days</p>
                                <p className="text-xs text-slate-400">(Mock Data)</p>
                            </div>
                             <div>
                                <h3 className="text-sm font-medium text-slate-500">On-Time Completion Rate</h3>
                                <p className="text-2xl font-bold text-slate-800">92%</p>
                                <p className="text-xs text-slate-400">(Mock Data)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;