import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Project, Task, TaskStatus, UserRole } from '../../types';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';

interface HydratedTask extends Task {
    projectName: string;
}

const EmployeeTasks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [hydratedTasks, setHydratedTasks] = useState<HydratedTask[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [userTasks, allProjects] = await Promise.all([
                DataService.getTasksByAssignee(user.id),
                DataService.getAllProjects()
            ]);
            
            setProjects(allProjects);

            const projectsMap = new Map(allProjects.map(p => [p.id, p]));
            const newHydratedTasks = userTasks.map(task => ({
                ...task,
                projectName: projectsMap.get(task.projectId)?.name || 'N/A'
            }));
            setHydratedTasks(newHydratedTasks);

        } catch (error) {
            console.error("Failed to load task data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        const task = hydratedTasks.find(t => t.id === taskId);
        if(task?.status === TaskStatus.ON_HOLD && task.dependency && newStatus !== TaskStatus.ON_HOLD) {
            alert("This task cannot be taken off hold until its dependency is cleared by a manager.");
            return;
        }
        DataService.updateTask(taskId, { status: newStatus });
        setHydratedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    const filteredTasks = useMemo(() => {
        return hydratedTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && statusMatch;
        });
    }, [hydratedTasks, searchTerm, projectFilter, statusFilter]);
    
    if (!user || user.role !== UserRole.EMPLOYEE) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading your tasks...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">My Tasks</h1>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full md:w-auto md:flex-1"></div>
                <div className="w-full md:w-64">
                    <ViewSwitcher view={view} setView={setView} />
                </div>
            </div>
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm md:col-span-1"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 col-span-full">
                    <h3 className="text-xl font-semibold text-slate-700">No Tasks Found</h3>
                    <p className="text-slate-500 mt-2">You have no tasks matching the current filters, or there was an issue fetching them.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            employees={[]} // Not needed for employee view
                            onStatusChange={handleStatusChange}
                            projectName={task.projectName}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Task</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => (
                                <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-slate-800">{task.name}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{task.projectName}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <select 
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                                            className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmployeeTasks;