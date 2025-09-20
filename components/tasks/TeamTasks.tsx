import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService'; // Assuming this has getTeamMembers, getUsers (if not async)
import { Project, Task, TaskStatus, User, UserRole, Department } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';

const TeamTasks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [managedProjects, setManagedProjects] = useState<Project[]>([]);
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

    // Form state (kept for now, but CUD functions are commented out)
    const [taskName, setTaskName] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
    const [departmentId, setDepartmentId] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.TODO);
    const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [taskEstTime, setTaskEstTime] = useState('');


    // --- CRITICAL FIXES HERE: Mark loadData as async and await DataService calls ---
    const loadData = useCallback(async () => { // Marked as async
        if (!user || user.role !== UserRole.MANAGER) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Assuming AuthService.getTeamMembers is synchronous or returns a direct array
            // If it's async, you'd need to `await AuthService.getTeamMembers(user.id);`
            const team = AuthService.getTeamMembers(user.id); 
            setTeamMembers(team);

            const teamMemberIds = team.map(m => m.id);
            // --- AWAIT DataService.getTasksByTeam ---
            const teamTasks = await DataService.getTasksByTeam(teamMemberIds);
            setAllTasks(teamTasks);

            // --- AWAIT DataService.getProjectsByManager ---
            const projects = await DataService.getProjectsByManager(user.id);
            setManagedProjects(projects);
            
            // --- AWAIT DataService.getDepartments ---
            const depts = await DataService.getDepartments();
            setDepartments(depts);
            
            // Set default assignee if not already set, and teamMembers exist
            if (team.length > 0 && !assigneeId) {
                setAssigneeId(team[0].id);
            }
            // Set default department/project for new tasks if available
            if (depts.length > 0 && !departmentId) {
                setDepartmentId(depts[0].id);
                const defaultDeptProjects = projects.filter(p => p.departmentIds.includes(depts[0].id));
                if (defaultDeptProjects.length > 0 && !projectId) {
                    setProjectId(defaultDeptProjects[0].id);
                }
            }

        } catch (error) {
            console.error("[TeamTasks] Failed to load team task data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, assigneeId, departmentId, projectId]); // Added state variables as dependencies for re-initialization

    useEffect(() => {
        loadData();
    }, [loadData]);


    const resetForm = useCallback(() => {
        setTaskName('');
        setTaskDesc('');
        setTaskDueDate('');
        setAssigneeId(teamMembers.length > 0 ? teamMembers[0].id : undefined); // Default to first team member
        setDepartmentId(departments.length > 0 ? departments[0].id : ''); // Default to first department
        setProjectId(managedProjects.length > 0 ? managedProjects[0].id : ''); // Default to first project (could be more refined)
        setTaskStatus(TaskStatus.TODO);
        setEditingTask(null);
        setTaskPriority('medium');
        setTaskEstTime('');
    }, [teamMembers, departments, managedProjects]);

    const handleOpenCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };
    
    // --- CUD FUNCTIONS (COMMENTED OUT IF ONLY FETCHING IS DESIRED) ---
    const handleOpenEditModal = (task: Task) => {
        // setEditingTask(task);
        // setTaskName(task.name);
        // setTaskDesc(task.description || '');
        // setTaskDueDate(task.dueDate || '');
        // setAssigneeId(task.assigneeId);
        // setProjectId(task.projectId);
        
        // const project = managedProjects.find(p => p.id === task.projectId);
        // if (project && project.departmentIds.length > 0) {
        //     setDepartmentId(project.departmentIds[0]);
        // } else {
        //     setDepartmentId('');
        // }

        // setTaskStatus(task.status);
        // setTaskPriority(task.priority || 'medium');
        // setTaskEstTime(task.estimatedTime?.toString() || '');
        // setIsModalOpen(true);
        alert("Editing tasks is not supported via this component's configuration (GET-only).");
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => { // Marked as async
        e.preventDefault();
        // if (!taskName.trim() || !projectId || !user?.id) {
        //     alert('Task Title, Project, and Creator ID are required.');
        //     return;
        // }

        // const taskData: Omit<Task, 'id'> = {
        //     creatorId: user.id, // Ensure creatorId is always provided
        //     name: taskName,
        //     description: taskDesc,
        //     dueDate: taskDueDate,
        //     projectId: projectId,
        //     assigneeId: assigneeId,
        //     status: taskStatus,
        //     priority: taskPriority,
        //     tags: [], // Add default empty array for tags
        //     notes: [], // Add default empty array for notes
        //     dependencyLogs: [], // Add default empty array for dependencyLogs
        //     estimatedTime: taskEstTime ? parseInt(taskEstTime, 10) : undefined,
        // };

        // try {
        //     if (editingTask) {
        //         await DataService.updateTask(editingTask.id, taskData);
        //     } else {
        //         await DataService.createTask(taskData);
        //     }
            
        //     await loadData(); // AWAIT loadData
        //     handleCloseModal();
        // } catch (error) {
        //     console.error("[TeamTasks] Failed to save task:", error);
        //     alert('Failed to save task. Please try again.');
        // }
        alert("Creating/Updating tasks is not supported via this component's configuration (GET-only).");
    };
    
    const handleDeleteTask = (taskId: string) => {
        // if(window.confirm("Are you sure you want to delete this task?")) {
        //     try {
        //         await DataService.deleteTask(taskId); // AWAIT DataService.deleteTask
        //         await loadData(); // AWAIT loadData
        //     } catch (error) {
        //         console.error("[TeamTasks] Failed to delete task:", error);
        //         alert('Failed to delete task. Please try again.');
        //     }
        // }
        alert("Deleting tasks is not supported via this component's configuration (GET-only).");
    };
    
    const handleAssigneeChange = async (taskId: string, newAssigneeId?: string) => { // Marked as async
        // try {
        //     await DataService.updateTask(taskId, { assigneeId: newAssigneeId }); // AWAIT DataService.updateTask
        //     await loadData(); // AWAIT loadData
        // } catch (error) {
        //     console.error("[TeamTasks] Failed to update assignee:", error);
        //     alert('Failed to update assignee. Please try again.');
        // }
        alert("Changing assignee is not supported via this component's configuration (GET-only).");
    };
    // --- END CUD FUNCTIONS ---


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
        // If no department is selected, return all managed projects to allow selection
        if (!departmentId) return managedProjects;
        return managedProjects.filter(p => p.departmentIds.includes(departmentId));
    }, [managedProjects, departmentId]);

    const getProjectName = (pId: string) => managedProjects.find(p => p.id === pId)?.name;

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
                {/* --- Removed Create New Task button as CUD is not supported --- */}
                {/* <Button onClick={handleOpenCreateModal}>Create New Task</Button> */}
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
                        {managedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

            {filteredTasks.length === 0 && <p className="text-center py-8 text-slate-500 col-span-full">No tasks match the current filters.</p>}

            {view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            employees={teamMembers}
                            onAssigneeChange={handleAssigneeChange} // This will trigger the alert
                            onDelete={handleDeleteTask} // This will trigger the alert
                            onEdit={handleOpenEditModal} // This will trigger the alert
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
                                {/* --- Removed Actions column if CUD is not supported --- */}
                                {/* <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => {
                                const assignee = teamMembers.find(e => e.id === task.assigneeId);
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
                                        {/* --- Removed Actions column data if CUD is not supported --- */}
                                        {/* <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(task); }} className="text-slate-500 hover:text-indigo-600"><EditIcon /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-slate-500 hover:text-red-600"><TrashIcon /></button>
                                            </div>
                                        </td> */}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {/* --- Removed Modal for Create/Edit if CUD is not supported --- */}
            { <Modal title={editingTask ? "Edit Task" : "Create New Task"} isOpen={isModalOpen} onClose={handleCloseModal}>
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
                        <textarea id="taskDescription" rows={3} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
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
                            {teamMembers.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
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
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">Cancel</button>
                        <Button type="submit">{editingTask ? "Update Task" : "Create Task"}</Button>
                    </div>
                </form>
            </Modal> }
        </div>
    );
};

export default TeamTasks;