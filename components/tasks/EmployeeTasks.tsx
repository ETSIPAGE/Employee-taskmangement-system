import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService'; // Ensure this service has async functions
import { Project, Task, TaskStatus, User, UserRole } from '../../types';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';

const EmployeeTasks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Record<string, Project>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // --- FIX: Make loadData an async function ---
    const loadData = useCallback(async () => {
        if (!user) { // Ensure user is available
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // --- FIX: Await the async DataService calls ---
            const userTasks = await DataService.getTasksByAssignee(user.id);
            setAllTasks(userTasks);

            // Fetch all projects to get their names
            // --- FIX: Await the async DataService call ---
            const allProjects = await DataService.getAllProjects();
            const projectsMap = allProjects.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {} as Record<string, Project>);
            setProjects(projectsMap);
        } catch (error) {
            console.error("Failed to load task data:", error);
            // Optionally, handle error state for UI
        } finally {
            setIsLoading(false);
        }
    }, [user]); // `user` is correctly a dependency here

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => { // --- FIX: Make async ---
        const task = allTasks.find(t => t.id === taskId);
        // Prevent employee from moving a task out of 'On Hold' if a dependency is set
        if(task?.status === TaskStatus.ON_HOLD && task.dependency && newStatus !== TaskStatus.ON_HOLD) {
            alert("This task cannot be taken off hold until its dependency is cleared by a manager.");
            return;
        }
        // --- FIX: Await the async DataService call ---
        try {
            await DataService.updateTask(taskId, { status: newStatus });
            loadData(); // Reload data after successful update
        } catch (error) {
            console.error("Failed to update task status:", error);
            alert("Failed to update task status. Please try again.");
        }
    };

    const filteredTasks = useMemo(() => {
        return allTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && statusMatch;
        });
    }, [allTasks, searchTerm, projectFilter, statusFilter]);
    
    const uniqueProjectIds = useMemo(() => [...new Set(allTasks.map(t => t.projectId))], [allTasks]);

    if (!user || user.role !== UserRole.EMPLOYEE) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading your tasks...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8"> {/* Added padding for better layout */}
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 md:col-span-1"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Projects</option>
                        {uniqueProjectIds.map(id => projects[id] && <option key={id} value={id}>{projects[id].name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Conditional rendering for empty state */}
            {filteredTasks.length === 0 && <p className="text-center py-8 text-slate-500">No tasks found matching the current filters.</p>}

            {view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            employees={[]} // Not needed for employee view - kept as is
                            onStatusChange={handleStatusChange}
                            projectName={projects[task.projectId]?.name}
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
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{projects[task.projectId]?.name}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <select 
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking select
                                            onChange={async (e) => await handleStatusChange(task.id, e.target.value as TaskStatus)} // --- FIX: Await handleStatusChange ---
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
            {/* Moved this empty state message to be conditional with the main filteredTasks check */}
        </div>
    );
};

export default EmployeeTasks;