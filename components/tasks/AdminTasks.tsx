import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole, Department } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';

const AdminTasks: React.FC = () => {
    const { user } = useAuth(); // Get the current logged-in user
    const navigate = useNavigate();

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [allEmployees, setAllEmployees] = useState<User[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [view, setView] = useState<'card' | 'table'>('card');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Form state
    const [taskName, setTaskName] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
    const [departmentId, setDepartmentId] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.TODO);
    const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [taskEstTime, setTaskEstTime] = useState('');

    const loadData = useCallback(async () => {
        // Ensure user is defined before proceeding, or handle unauthorized state
        if (!user) {
            setIsLoading(false);
            return;
        }
        if (user.role !== UserRole.ADMIN) { // Ensure only admin can load data for this component
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const allUsers = await AuthService.getUsers();
            const employees = allUsers.filter(u => u.role === UserRole.EMPLOYEE);
            setAllEmployees(employees);

            // FIX: Await DataService.getAllProjects() - This was already fixed in your code.
            const projects = await DataService.getAllProjects(); 
            setAllProjects(projects);

            // FIX: Await DataService.getTasksByTeam - Ensure this is correctly fetching based on allUsers
            const tasks = await DataService.getTasksByTeam(allUsers.map(u => u.id));
            setAllTasks(tasks);

            const depts = await DataService.getDepartments();
            setDepartments(depts);
            
        } catch (error) {
            console.error("Failed to load admin task data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]); // `user` is correctly a dependency here.

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetForm = useCallback(() => {
        setTaskName('');
        setTaskDesc('');
        setTaskDueDate('');
        setAssigneeId(undefined);
        setDepartmentId('');
        setProjectId('');
        setTaskStatus(TaskStatus.TODO);
        setEditingTask(null);
        setTaskPriority('medium');
        setTaskEstTime('');
    }, []);

    const handleOpenCreateModal = () => {
        resetForm();
        // Set default project/department if available
        if (departments.length > 0) setDepartmentId(departments[0].id);
        if (allProjects.length > 0) setProjectId(allProjects[0].id);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        setTaskName(task.name);
        setTaskDesc(task.description || '');
        setTaskDueDate(task.dueDate || '');
        setAssigneeId(task.assigneeId);
        setProjectId(task.projectId);
        
        const project = allProjects.find(p => p.id === task.projectId);
        if (project && project.departmentIds.length > 0) {
            setDepartmentId(project.departmentIds[0]);
        } else {
            setDepartmentId('');
        }

        setTaskStatus(task.status);
        setTaskPriority(task.priority || 'medium');
        setTaskEstTime(task.estimatedTime?.toString() || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName.trim() || !projectId) {
            alert('Task Title and Project are required.');
            return;
        }
        // Ensure user is logged in and available
        if (!user?.id) {
            alert('Creator ID not available. Please log in.');
            return;
        }

        const taskData: Omit<Task, 'id'> = { // Explicitly type to catch missing properties
            creatorId: user.id, // <--- FIX: Add creatorId here
            name: taskName,
            description: taskDesc,
            dueDate: taskDueDate,
            projectId: projectId,
            assigneeId: assigneeId,
            status: taskStatus,
            priority: taskPriority,
            estimatedTime: taskEstTime ? parseInt(taskEstTime, 10) : undefined,
            // Add other properties that are part of Omit<Task, 'id'> if they are required and not optional
            // e.g., category: '', tags: [], notes: [], dependencyLogs: [],
        };

        try {
            if (editingTask) {
                // When editing, creatorId is already part of the existing task.
                // You only pass the partial updates.
                await DataService.updateTask(editingTask.id, taskData); // taskData is Partial<Task> for update
            } else {
                await DataService.createTask(taskData);
            }
            
            loadData();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save task:", error);
            alert('Failed to save task. Please try again.');
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        if(window.confirm("Are you sure you want to delete this task?")) {
            try {
                await DataService.deleteTask(taskId);
                loadData();
            } catch (error) {
                console.error("Failed to delete task:", error);
                alert('Failed to delete task. Please try again.');
            }
        }
    };
    
    const handleAssigneeChange = async (taskId: string, newAssigneeId?: string) => {
        try {
            await DataService.updateTask(taskId, { assigneeId: newAssigneeId });
            loadData();
        } catch (error) {
            console.error("Failed to update assignee:", error);
            alert('Failed to update assignee. Please try again.');
        }
    };

    const filteredTasks = useMemo(() => {
        return allTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const assigneeMatch = assigneeFilter === 'all' || task.assigneeId === assigneeFilter;
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && assigneeMatch && statusMatch;
        });
    }, [allTasks, searchTerm, projectFilter, assigneeFilter, statusFilter]);

    const availableProjects = useMemo(() => {
        if (!departmentId) return allProjects; 
        return allProjects.filter(p => p.departmentIds.includes(departmentId));
    }, [allProjects, departmentId]);

    const getProjectName = (pId: string) => allProjects.find(p => p.id === pId)?.name;

    if (user?.role !== UserRole.ADMIN) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading all tasks...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">All Tasks</h1>
                <Button onClick={handleOpenCreateModal}>Create New Task</Button>
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
                        {allEmployees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {filteredTasks.length === 0 && <p className="text-center py-8 text-slate-500 col-span-full">No tasks match the current filters.</p>}

            {view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            employees={allEmployees}
                            onAssigneeChange={handleAssigneeChange}
                            onDelete={handleDeleteTask}
                            onEdit={handleOpenEditModal}
                            projectName={getProjectName(task.projectId)}
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
                                const assignee = allEmployees.find(e => e.id === task.assigneeId);
                                const statusStyles = {
                                    [TaskStatus.TODO]: 'bg-yellow-100 text-yellow-800', [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
                                    [TaskStatus.ON_HOLD]: 'bg-slate-100 text-slate-800', [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
                                };
                                return (
                                    <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-slate-800">{task.name}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{getProjectName(task.projectId)}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{assignee?.name || 'Unassigned'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[task.status]}`}>{task.status}</span>
                                        </td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(task); }} className="text-slate-500 hover:text-indigo-600"><EditIcon /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-slate-500 hover:text-red-600"><TrashIcon /></button>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="department" className="block text-sm font-medium text-slate-700">Department</label>
                        <select id="department" value={departmentId} onChange={e => {
                            setDepartmentId(e.target.value);
                            setProjectId('');
                        }} required
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                            <option value="">Select a Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="project" className="block text-sm font-medium text-slate-700">Project</label>
                        <select id="project" value={projectId} onChange={e => setProjectId(e.target.value)} required
                            disabled={!departmentId}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                            <option value="">Select a Project</option>
                            {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <Input id="taskName" type="text" label="Task Title" value={taskName} onChange={e => setTaskName(e.target.value)} required />

                    <div>
                        <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="taskDescription" rows={3} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                    <Input id="dueDate" type="date" label="Due Date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" value={taskPriority} onChange={e => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="estTime" type="number" label="Est. Time (hours)" value={taskEstTime} onChange={e => setTaskEstTime(e.target.value)} min="0" />
                    </div>

                    <div>
                        <label htmlFor="assignee" className="block text-sm font-medium text-slate-700">Assign To</label>
                        <select id="assignee" value={assigneeId || ''} onChange={e => setAssigneeId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                            <option value="">Unassigned</option>
                            {allEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        </select>
                    </div>

                    {editingTask && (
                        <div>
                             <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                             <select id="status" value={taskStatus} onChange={e => setTaskStatus(e.target.value as TaskStatus)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="pt-4 flex justify-end space-x-3">
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-sm">Cancel</button>
                        <Button type="submit">{editingTask ? "Update Task" : "Create Task"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminTasks;