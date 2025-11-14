import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';
import { Project, Task, TaskStatus, User, UserRole, Department, Company } from '../../types';

import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

interface HydratedTask extends Task {
    projectName: string;
    assigneeNames: string[];
    companyName?: string;
    departmentName?: string;
}

export default function TeamTasks() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [hydratedTasks, setHydratedTasks] = useState<HydratedTask[]>([]);
    const [allEmployees, setAllEmployees] = useState<User[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiDepartments, setApiDepartments] = useState<Department[]>([]);
    const [apiCompanies, setApiCompanies] = useState<Company[]>([]);
    const [apiProjects, setApiProjects] = useState<Project[]>([]);
    const [dropdownsLoading, setDropdownsLoading] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
    const [newTaskData, setNewTaskData] = useState({
        company: '',
        department: '',
        project: '',
        title: '',
        description: '',
        due_date: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        est_time: '',
        assign_to: [] as string[]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = useCallback(async () => {
        if (!user || user.role !== UserRole.MANAGER) return;
        setIsLoading(true);
        try {
            const [tasks, projects, allUsersFromApi, departments, companies] = await Promise.all([
                DataService.getAllTasks(),
                DataService.getAllProjects(),
                DataService.getUsers(),
                DataService.getDepartments(),
                DataService.getCompanies().catch(() => []),
            ]);
            
            setAllProjects(projects);
            const employees = allUsersFromApi.filter(u => u.role === UserRole.EMPLOYEE);
            setAllEmployees(employees);
            
            const projectsMap = new Map(projects.map(p => [p.id, p]));
            const departmentsMap = new Map(departments.map(d => [d.id, d]));
            const companiesMap = new Map((companies || []).map(c => [c.id, c]));
            const usersMap = new Map(allUsersFromApi.map(u => [u.id, u]));
    
            const newHydratedTasks = tasks.map(task => ({
                ...task,
                projectName: projectsMap.get(task.projectId)?.name || 'N/A',
                companyName: (() => {
                    const proj = projectsMap.get(task.projectId) as any;
                    const cid = proj?.companyId;
                    return cid ? companiesMap.get(cid)?.name : undefined;
                })(),
                departmentName: (() => {
                    const proj = projectsMap.get(task.projectId) as any;
                    const deptIds: string[] = Array.isArray(proj?.departmentIds) ? proj.departmentIds : [];
                    const first = deptIds[0];
                    return first ? departmentsMap.get(first)?.name : undefined;
                })(),
                assigneeNames: (task.assigneeIds || []).map(id => usersMap.get(id)?.name || 'Unknown').filter(Boolean),
            }));
            setHydratedTasks(newHydratedTasks);
            
        } catch (error) {
            console.error("Failed to load team tasks data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (isModalOpen) {
            const fetchDropdownData = async () => {
                setDropdownsLoading(true);
                try {
                    const [companies, depts, projs] = await Promise.all([
                        DataService.getCompanies(),
                        DataService.getDepartments(),
                        DataService.getAllProjects()
                    ]);
                    setApiCompanies(companies || []);
                    setApiDepartments(depts);
                    setApiProjects(projs);
                     if (companies && companies.length > 0) {
                        const defaultCompanyId = companies[0].id;
                        const deptInCompany = depts.find(d => d.companyId === defaultCompanyId);
                        setNewTaskData(prev => ({ ...prev, company: defaultCompanyId, department: deptInCompany ? deptInCompany.id : '' }));
                    } else if (depts.length > 0) {
                        setNewTaskData(prev => ({ ...prev, department: depts[0].id }));
                    }
                    if (projs.length > 0) {
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
    }, [isModalOpen]);

    // Filter departments by selected company
    const filteredDepartments = useMemo(() => {
        if (!newTaskData.company) return apiDepartments;
        return apiDepartments.filter(d => d.companyId === newTaskData.company);
    }, [apiDepartments, newTaskData.company]);

    // Ensure department stays valid when company changes
    useEffect(() => {
        if (!newTaskData.company) return;
        const exists = filteredDepartments.some(d => d.id === newTaskData.department);
        if (!exists) {
            const nextDeptId = filteredDepartments.length > 0 ? filteredDepartments[0].id : '';
            setNewTaskData(prev => ({ ...prev, department: nextDeptId }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newTaskData.company, filteredDepartments.length]);

    const currentDeptName = useMemo(() => {
        const found = apiDepartments.find(d => d.id === newTaskData.department);
        return found ? found.name : '';
    }, [apiDepartments, newTaskData.department]);

    const deptTitleMap = useMemo(() => ({
        'business dev': ['Market Research','Client Relations','Sales Support','Proposal Dev','Partnerships','New Business Init','Contract Mgmt','Cust Acq Strategy'],
        'business department': ['Market Research','Client Relations','Sales Support','Proposal Dev','Partnerships','New Business Init','Contract Mgmt','Cust Acq Strategy'],
        'business development': ['Market Research','Client Relations','Sales Support','Proposal Dev','Partnerships','New Business Init','Contract Mgmt','Cust Acq Strategy'],
    }), []);
    const titleOptions = useMemo(() => {
        const key = (currentDeptName || '').trim().toLowerCase();
        return deptTitleMap[key] || [];
    }, [currentDeptName, deptTitleMap]);

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


    const filteredTasks = useMemo(() => {
        const filtered = hydratedTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const assigneeMatch = assigneeFilter === 'all' || task.assigneeIds?.includes(assigneeFilter);
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && assigneeMatch && statusMatch;
        });
        const getTime = (t: any) => {
            const fields = ['updatedAt','lastUpdated','modifiedAt','timestamp','createdAt','created_at','created','dueDate'];
            for (const f of fields) {
                const v = t && (t as any)[f];
                if (v) {
                    const ms = new Date(v).getTime();
                    if (!Number.isNaN(ms)) return ms;
                }
            }
            return 0;
        };
        return filtered.slice().sort((a,b) => getTime(b) - getTime(a));
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
                        {allEmployees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                    <p className="text-slate-500 mt-2">No tasks were found or there was an issue fetching them.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                    <TaskCard
                            key={task.id}
                            task={task}
                            assigneeNames={task.assigneeNames}
                            projectName={task.projectName}
                            onDelete={handleRequestDelete}
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
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assignee</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => {
                                const statusStyles = {
                                    [TaskStatus.TODO]: 'bg-yellow-100 text-yellow-800', [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
                                    [TaskStatus.ON_HOLD]: 'bg-slate-100 text-slate-800', [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
                                };
                                return (
                                    <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-800">{task.name}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.projectName}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.companyName || 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.departmentName || 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.assigneeNames.join(', ')}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[task.status]}`}>{task.status}</span>
                                        </td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/tasks/${task.id}`);
                                                    }} 
                                                    className="text-slate-500 hover:text-indigo-600"
                                                    title="Edit Task"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRequestDelete(task.id);
                                                    }}
                                                    className="text-slate-500 hover:text-red-600"
                                                    title="Delete Task"
                                                >
                                                    <TrashIcon />
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
             <Modal title="Create New Task" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateTask} className="space-y-4">
                    {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{submitError}</div>}
                    {titleOptions.length > 0 ? (
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700">Task Title</label>
                            <select id="title" name="title" value={newTaskData.title} onChange={handleInputChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="">Select task</option>
                                {titleOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <Input id="title" name="title" type="text" label="Task Title" value={newTaskData.title} onChange={handleInputChange} required />
                    )}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={newTaskData.description} onChange={handleInputChange}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                            <select id="company" name="company" value={newTaskData.company} onChange={handleInputChange} disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                                {dropdownsLoading ? <option>Loading...</option> :
                                 apiCompanies.length > 0 ? apiCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No companies found</option>}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-slate-700">Department</label>
                            <input
                                id="departmentInput-team"
                                type="text"
                                list="department-options-team"
                                value={currentDeptName}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    const match = filteredDepartments.find(d => d.name.toLowerCase() === name.toLowerCase());
                                    setNewTaskData(prev => ({ ...prev, department: match ? match.id : '' }));
                                }}
                                placeholder="Search department..."
                                disabled={dropdownsLoading}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-50"
                            />
                            <datalist id="department-options-team">
                                {filteredDepartments.map(d => (
                                    <option key={d.id} value={d.name} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="project" className="block text-sm font-medium text-slate-700">Project</label>
                            <select id="project" name="project" value={newTaskData.project} onChange={handleInputChange} required disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                                {dropdownsLoading ? <option>Loading...</option> : 
                                 apiProjects.length > 0 ? apiProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">No projects found</option>}
                            </select>
                        </div>
                    </div>
                    <Input id="due_date" name="due_date" type="date" label="Due Date" value={newTaskData.due_date} onChange={handleInputChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" name="priority" value={newTaskData.priority} onChange={e => setNewTaskData(prev => ({...prev, priority: e.target.value as 'low' | 'medium' | 'high'}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="est_time" name="est_time" type="number" label="Est. Time (hours)" value={newTaskData.est_time} onChange={handleInputChange} min="0" />
                    </div>
                    <div>
                        <label htmlFor="assign_to" className="block text-sm font-medium text-slate-700">Assign To</label>
                        <div className="mt-1 max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-2">
                            {allEmployees.map(employee => (
                                <div key={employee.id} className="flex items-center">
                                    <input
                                        id={`assignee-team-${employee.id}`}
                                        type="checkbox"
                                        value={employee.id}
                                        checked={newTaskData.assign_to.includes(employee.id)}
                                        onChange={(e) => {
                                            const { value, checked } = e.target;
                                            setNewTaskData(prev => ({
                                                ...prev,
                                                assign_to: checked
                                                    ? [...prev.assign_to, value]
                                                    : prev.assign_to.filter(id => id !== value)
                                            }));
                                        }}
                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`assignee-team-${employee.id}`} className="ml-3 block text-sm text-slate-800">
                                        {employee.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Task'}</Button>
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
}