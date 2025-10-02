import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService'; // Ensure this service has async functions
import { Project, Task, TaskStatus, UserRole } from '../../types';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';

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
        if (!user) { // Ensure user is available
            setIsLoading(false);
            return;
        }
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
            // Optionally, handle error state for UI
        } finally {
            setIsLoading(false);
        }
    }, [user]); // `user` is correctly a dependency here

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => { 
        const task = hydratedTasks.find(t => t.id === taskId);
        // Prevent employee from moving a task out of 'On Hold' if a dependency is set
        if(task?.status === TaskStatus.ON_HOLD && task.dependency && newStatus !== TaskStatus.ON_HOLD) {
            alert("This task cannot be taken off hold until its dependency is cleared by a manager.");
            return;
        }
        try {
            // Assuming updateTask takes taskId, updatedFields, and updaterId
            await DataService.updateTask(taskId, { status: newStatus }, user?.id); 
            loadData(); // Reload data after successful update
        } catch (error) {
            console.error("Failed to update task status:", error);
            alert("Failed to update task status. Please try again.");
        }
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
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Conditional rendering for empty state */}
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
                            assigneeName={user.name}
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
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assignee</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => {
                                const statusStyles = {
                                    [TaskStatus.TODO]: 'bg-yellow-100 text-yellow-800',
                                    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
                                    [TaskStatus.ON_HOLD]: 'bg-slate-100 text-slate-800',
                                    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
                                };
                                return (
                                <tr key={task.id} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-800" onClick={() => navigate(`/tasks/${task.id}`)}>{task.name}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.projectName}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{user?.name}</td> {/* Use optional chaining for user?.name */}
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <select 
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking select
                                            onChange={async (e) => await handleStatusChange(task.id, e.target.value as TaskStatus)} 
                                            className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        {/* The span below is redundant if using a select for status display */}
                                        {/* <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[task.status]}`}>
                                            {task.status}
                                        </span> */}
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <div className="flex items-center space-x-3">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/tasks/${task.id}`);
                                                }} 
                                                className="text-slate-500 hover:text-indigo-600"
                                                title="View Task Details"
                                            >
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button disabled className="text-slate-300 cursor-not-allowed" title="Delete disabled">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmployeeTasks;