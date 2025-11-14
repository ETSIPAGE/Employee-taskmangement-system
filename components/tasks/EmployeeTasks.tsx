import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';

import { Project, Task, TaskStatus, User, UserRole } from '../../types';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

interface HydratedTask extends Task {
    projectName: string;
    assigneeNames: string[];
}

const EmployeeTasks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [hydratedTasks, setHydratedTasks] = useState<HydratedTask[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');

    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiProjects, setApiProjects] = useState<Project[]>([]);
    const [newTaskData, setNewTaskData] = useState({
        project: '',
        title: '',
        description: '',
        due_date: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        est_time: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [userTasks, allProjects, users] = await Promise.all([
                DataService.getTasksByAssignee(user.id),
                DataService.getAllProjects(),
                DataService.getUsers()
            ]);
            
            setProjects(allProjects);
            setApiProjects(allProjects);
            setAllUsers(users);

            if (allProjects.length > 0 && !newTaskData.project) {
                setNewTaskData(prev => ({ ...prev, project: allProjects[0].id }));
            }

            const projectsMap = new Map(allProjects.map(p => [p.id, p]));
            const usersMap = new Map(users.map(u => [u.id, u]));
            const newHydratedTasks = userTasks.map(task => ({
                ...task,
                projectName: projectsMap.get(task.projectId)?.name || 'N/A',
                assigneeNames: (task.assigneeIds || []).map(id => usersMap.get(id)?.name || 'Unknown').filter(Boolean),
            }));
            setHydratedTasks(newHydratedTasks);

        } catch (error) {
            console.error("Failed to load task data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, newTaskData.project]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSubmitError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setSubmitError('You must be logged in to create a task.');
            return;
        }
        setSubmitError('');
        setIsSubmitting(true);
        try {
            const payload = {
                ...newTaskData,
                department: '', // Not applicable for employee self-assign
                assign_to: [user.id],
                currentUserId: user.id
            };
            await DataService.createTask(payload);
            handleCloseModal();
            loadData();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredTasks = useMemo(() => {
        const filtered = hydratedTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && statusMatch;
        });
        const getTime = (t: any) => {
            const fields = ['updatedAt','lastUpdated','modifiedAt','timestamp','createdAt','created_at','created','dueDate'];
            for (const f of fields) {
                const v = (t as any)[f];
                if (v) {
                    const ms = new Date(v).getTime();
                    if (!Number.isNaN(ms)) return ms;
                }
            }
            return 0;
        };
        return filtered.slice().sort((a,b) => getTime(b) - getTime(a));
    }, [hydratedTasks, searchTerm, projectFilter, statusFilter]);
    
    if (!user || user.role !== UserRole.EMPLOYEE) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading your tasks...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">My Tasks</h1>
                <Button onClick={handleOpenModal}>Create New Task</Button>
            </div>
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
                            assigneeNames={task.assigneeNames}
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
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assignees</th>
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
                                <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-800">{task.name}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.projectName}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.assigneeNames.join(', ')}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[task.status]}`}>
                                            {task.status}
                                        </span>
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
                                                <EditIcon />
                                            </button>
                                            <button disabled className="text-slate-300 cursor-not-allowed" title="Delete disabled">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal title="Create New Task" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateTask} className="space-y-4">
                    {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{submitError}</div>}
                    
                    <Input id="title" name="title" type="text" label="Task Title" value={newTaskData.title} onChange={handleInputChange} required />
                    
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={newTaskData.description} onChange={handleInputChange}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="project" className="block text-sm font-medium text-slate-700">Project</label>
                        <select id="project" name="project" value={newTaskData.project} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 rounded-md shadow-sm">
                            {apiProjects.length > 0 ? apiProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">No projects found</option>}
                        </select>
                    </div>

                    <Input id="due_date" name="due_date" type="date" label="Due Date" value={newTaskData.due_date} onChange={handleInputChange} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" name="priority" value={newTaskData.priority} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="est_time" name="est_time" type="number" label="Est. Time (hours)" value={newTaskData.est_time} onChange={handleInputChange} min="0" />
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border">
                            Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Task'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default EmployeeTasks;