import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole, Department } from '../../types';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

interface HydratedTask extends Task {
    projectName: string;
    assigneeName: string;
}

const TeamTasks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [hydratedTasks, setHydratedTasks] = useState<HydratedTask[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiDepartments, setApiDepartments] = useState<Department[]>([]);
    const [apiProjects, setApiProjects] = useState<Project[]>([]);
    const [dropdownsLoading, setDropdownsLoading] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
    const [newTaskData, setNewTaskData] = useState({
        department: '', // Storing department ID for new task creation
        project: '', // Project ID for new task creation
        title: '',
        description: '',
        due_date: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        est_time: '',
        assign_to: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [editingTask, setEditingTask] = useState<Task | null>(null);


    const loadData = useCallback(async () => {
        if (!user || user.role !== UserRole.MANAGER) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const team = AuthService.getTeamMembers(user.id); // Assuming this is synchronous and returns User[]
            setTeamMembers(team);

            if (team.length === 0) {
                setHydratedTasks([]);
                setAllProjects([]);
                setIsLoading(false);
                return;
            }
            
            const teamMemberIds = team.map(tm => tm.id);

            const [projects, teamTasks, allUsersFromApi, departments] = await Promise.all([
                DataService.getAllProjects(),
                DataService.getTasksByTeam(teamMemberIds),
                AuthService.getUsers(), // Changed to AuthService.getUsers
                DataService.getDepartments(),
            ]);
            
            setAllProjects(projects);
            setApiDepartments(departments); // For the create/edit modal
            
            const projectsMap = new Map(projects.map(p => [p.id, p]));
            const usersMap = new Map(allUsersFromApi.map(u => [u.id, u]));

            const newHydratedTasks = teamTasks.map(task => ({
                ...task,
                projectName: projectsMap.get(task.projectId)?.name || 'N/A',
                assigneeName: usersMap.get(task.assigneeId || '')?.name || 'Unassigned',
            }));
            setHydratedTasks(newHydratedTasks);
 
        } catch (error) {
            console.error("[TeamTasks] Failed to load team task data:", error);
            setHydratedTasks([]); // Clear tasks on error
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetForm = useCallback(() => {
        setNewTaskData({
            department: '',
            project: '',
            title: '',
            description: '',
            due_date: '',
            priority: 'medium',
            est_time: '',
            assign_to: teamMembers.length > 0 ? teamMembers[0].id : ''
        });
        setEditingTask(null);
        setSubmitError('');
    }, [teamMembers]);

    const handleOpenModal = () => {
        resetForm();
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        // Pre-fill form with task data
        setNewTaskData({
            department: allProjects.find(p => p.id === task.projectId)?.departmentIds[0] || '', // Assuming project has one department
            project: task.projectId,
            title: task.name,
            description: task.description || '',
            due_date: task.dueDate || '',
            priority: task.priority || 'medium',
            est_time: task.estimatedTime ? String(task.estimatedTime) : '',
            assign_to: task.assigneeId || ''
        });
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm(); // Reset form state when closing modal
    };

    useEffect(() => {
        if (isModalOpen && !editingTask) { // Only fetch dropdowns when creating a new task and modal opens
            const fetchDropdownData = async () => {
                setDropdownsLoading(true);
                try {
                    const [depts, projs] = await Promise.all([
                        DataService.getDepartments(),
                        DataService.getAllProjects()
                    ]);
                    setApiDepartments(depts);
                    setApiProjects(projs);
                     if (depts.length > 0 && !newTaskData.department) {
                        setNewTaskData(prev => ({ ...prev, department: depts[0].id })); // Store ID
                    }
                    if (projs.length > 0 && !newTaskData.project) {
                        setNewTaskData(prev => ({ ...prev, project: projs[0].id }));
                    }
                } catch (error) {
                    console.error("Failed to fetch dropdown data:", error);
                } finally {
                    setDropdownsLoading(false);
                }
            };
            fetchDropdownData();
        }
    }, [isModalOpen, editingTask, newTaskData.department, newTaskData.project]);

    useEffect(() => {
        if (teamMembers.length > 0 && !newTaskData.assign_to && !editingTask) { // Only set default if not editing
            setNewTaskData(prev => ({...prev, assign_to: teamMembers[0].id}));
        }
    }, [teamMembers, newTaskData.assign_to, editingTask]);
 
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setSubmitError('You must be logged in to save a task.');
            return;
        }
        if (!user.id) {
            setSubmitError('Creator ID not available. Please log in.');
            return;
        }
        if (!newTaskData.title.trim() || !newTaskData.project) {
            setSubmitError('Task title and project are required.');
            return;
        }

        setSubmitError('');
        setIsSubmitting(true);

        const taskPayload = {
            name: newTaskData.title,
            description: newTaskData.description,
            dueDate: newTaskData.due_date || undefined,
            projectId: newTaskData.project,
            assigneeId: newTaskData.assign_to || undefined,
            status: editingTask?.status || TaskStatus.TODO, // Keep existing status if editing, else default
            priority: newTaskData.priority,
            estimatedTime: newTaskData.est_time ? parseInt(newTaskData.est_time, 10) : undefined,
            creatorId: user.id // creatorId for new tasks, or for audit log on update
        };

        try {
            if (editingTask) {
                // For update, we only send the changed fields
                await DataService.updateTask(editingTask.id, taskPayload, user.id); 
            } else {
                await DataService.createTask(taskPayload);
            }
            
            loadData();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save task:", error);
            setSubmitError(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRequestDelete = (taskId: string) => {
        const task = hydratedTasks.find(t => t.id === taskId);
        if (task) {
            setTaskToDelete({ id: task.id, name: task.name });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!taskToDelete || !user) return;
        try {
            await DataService.deleteTask(taskToDelete.id, user.id);
            loadData();
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setTaskToDelete(null);
        }
    };

    const handleAssigneeChange = async (taskId: string, newAssigneeId?: string) => { 
        if (!user) {
            alert('You must be logged in to change assignee.');
            return;
        }
        try {
            await DataService.updateTask(taskId, { assigneeId: newAssigneeId }, user.id); 
            loadData();
        } catch (error) {
            console.error("[TeamTasks] Failed to update assignee:", error);
            alert('Failed to update assignee. Please try again.');
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        if (!user) {
            alert('You must be logged in to change task status.');
            return;
        }
        const task = hydratedTasks.find(t => t.id === taskId);
        if (task?.status === TaskStatus.ON_HOLD && task.dependency && newStatus !== TaskStatus.ON_HOLD) {
            alert("This task cannot be taken off hold until its dependency is cleared.");
            return;
        }
        try {
            await DataService.updateTask(taskId, { status: newStatus }, user.id);
            loadData();
        } catch (error) {
            console.error("[TeamTasks] Failed to update task status:", error);
            alert('Failed to update task status. Please try again.');
        }
    };

    const filteredProjectsByDepartment = useMemo(() => {
        const selectedDepartmentId = newTaskData.department; 
        
        if (!selectedDepartmentId) {
            // If no department is selected, return all projects that the manager can see (allProjects)
            // Or more specifically, projects that belong to the manager's team departments
            const managerDepartmentIds = apiDepartments.filter(d => teamMembers.some(tm => tm.departmentId === d.id)).map(d => d.id);
            return apiProjects.filter(p => p.departmentIds.some(dId => managerDepartmentIds.includes(dId)));
        }

        return apiProjects.filter(p => p.departmentIds.includes(selectedDepartmentId)); 
    }, [apiProjects, apiDepartments, newTaskData.department, teamMembers]);


    const filteredTasks = useMemo(() => {
        return hydratedTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const assigneeMatch = assigneeFilter === 'all' || task.assigneeId === assigneeFilter;
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && assigneeMatch && statusMatch;
        });
    }, [hydratedTasks, searchTerm, projectFilter, assigneeFilter, statusFilter]);
 

    if (user?.role !== UserRole.MANAGER) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading team tasks...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Team Tasks</h1>
                <Button onClick={handleOpenModal}>Create New Task</Button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full md:w-auto md:flex-1"></div>
                <div className="w-full md:w-64">
                    <ViewSwitcher view={view} setView={setView} />
                </div>
            </div>
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Projects</option>
                        {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Assignees</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {filteredTasks.length === 0 ? (
                 <div className="text-center py-8 text-slate-500 col-span-full">
                    <h3 className="text-xl font-semibold text-slate-700">No Tasks Found</h3>
                    <p className="text-slate-500 mt-2">No tasks were found for your team or there was an issue fetching them.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            employees={teamMembers}
                            onAssigneeChange={handleAssigneeChange} 
                            onDelete={handleRequestDelete} 
                            onEdit={handleOpenEditModal} 
                            projectName={task.projectName}
                            assigneeName={task.assigneeName}
                            onStatusChange={handleStatusChange} // Pass status change handler
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
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.assigneeName}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
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
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditModal(task);
                                                    }} 
                                                    className="text-slate-500 hover:text-indigo-600"
                                                    title="Edit Task"
                                                >
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRequestDelete(task.id);
                                                    }}
                                                    className="text-slate-500 hover:text-red-600"
                                                    title="Delete Task"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <Modal title={editingTask ? "Edit Task" : "Create New Task"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateUpdateTask} className="space-y-4">
                    {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{submitError}</div>}
                    
                    <Input id="title" name="title" type="text" label="Task Title" value={newTaskData.title} onChange={handleInputChange} required />
                    
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={newTaskData.description} onChange={handleInputChange}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-slate-700">Department</label>
                            <select id="department" name="department" value={newTaskData.department} onChange={handleInputChange} required disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                                <option value="">Select Department</option>
                                {dropdownsLoading ? <option>Loading...</option> : 
                                 apiDepartments.length > 0 ? apiDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : <option value="">No departments found</option>}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="project" className="block text-sm font-medium text-slate-700">Project</label>
                            <select id="project" name="project" value={newTaskData.project} onChange={handleInputChange} required disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                                <option value="">Select Project</option>
                                {dropdownsLoading ? <option>Loading...</option> : 
                                 filteredProjectsByDepartment.length > 0 ? filteredProjectsByDepartment.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">No projects found for selected department</option>}
                            </select>
                        </div>
                    </div>

                    <Input id="due_date" name="due_date" type="date" label="Due Date" value={newTaskData.due_date} onChange={handleInputChange} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" name="priority" value={newTaskData.priority} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="est_time" name="est_time" type="number" label="Est. Time (hours)" value={newTaskData.est_time} onChange={handleInputChange} min="0" />
                    </div>

                    <div>
                        <label htmlFor="assign_to" className="block text-sm font-medium text-slate-700">Assign To</label>
                        <select id="assign_to" name="assign_to" value={newTaskData.assign_to} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                            <option value="">Unassigned</option>
                             {teamMembers.map(employee => (
                                <option key={employee.id} value={employee.id}>{employee.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}</Button>
                    </div>
                </form>
            </Modal>
            <Modal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                title="Confirm Task Deletion"
            >
                <p className="text-slate-600">
                    Are you sure you want to delete the task "{taskToDelete?.name}"? This action cannot be undone.
                </p>
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setTaskToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                        Cancel
                    </button>
                    <Button onClick={handleConfirmDelete}>Delete Task</Button>
                </div>
            </Modal>
        </div>
    );
};

export default TeamTasks;