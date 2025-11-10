import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getToken } from '../../services/authService';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Task, TaskStatus, User, Project, UserRole, Note, Department, Company } from '../../types';

import Button from '../shared/Button';
import { ClockIcon, BriefcaseIcon, UserCircleIcon, TrashIcon } from '../../constants';
import Modal from '../shared/Modal';

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start py-3">
        <div className="w-6 h-6 mr-4 text-slate-500 flex-shrink-0 flex items-center justify-center">{icon}</div>
        <div className="flex-1">
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <div className="text-sm text-slate-800 mt-1">{children}</div>
        </div>
    </div>
);

const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const TaskDetail: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [task, setTask] = useState<Task | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isEditingAssignees, setIsEditingAssignees] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Initial state for editedTask should be based on task, or empty if task is null
    const [editedTask, setEditedTask] = useState<{
        status?: TaskStatus;
        assigneeIds?: string[];
        dueDate?: string;
        estimatedTime?: number;
        description?: string;
    }>({});

    const isDirty = useMemo(() => {
        if (!task) return false;
        const hasStatusChanged = editedTask.status !== undefined && editedTask.status !== task.status;

        // Compare assigneeIds arrays
        const originalAssignees = new Set(task.assigneeIds || []);
        const editedAssignees = new Set(editedTask.assigneeIds || []);

        const hasAssigneeChanged = originalAssignees.size !== editedAssignees.size ||
            ![...originalAssignees].every(id => editedAssignees.has(id));

        const hasDueDateChanged = editedTask.dueDate !== undefined && editedTask.dueDate !== (task.dueDate || undefined);
        const hasEstimatedChanged = editedTask.estimatedTime !== undefined && editedTask.estimatedTime !== (task.estimatedTime || undefined);
        const hasDescriptionChanged = editedTask.description !== undefined && editedTask.description !== (task.description || '');

        return hasStatusChanged || hasAssigneeChanged || hasDueDateChanged || hasEstimatedChanged || hasDescriptionChanged;
    }, [task, editedTask]);

    const loadData = useCallback(async () => {
        if (!taskId) return;
        setIsLoading(true);
        try {
            const currentTask = await DataService.getTaskById(taskId);

            if (!currentTask) {
                setTask(null);
                setProject(null); // Clear project as well
                setAllUsers([]); // Clear users
                setIsLoading(false);
                return;
            }
            setTask(currentTask);
            // Initialize editedTask state with current task values
            setEditedTask({
                status: currentTask.status,
                assigneeIds: currentTask.assigneeIds || [],
                dueDate: currentTask.dueDate || undefined,
                estimatedTime: currentTask.estimatedTime || undefined,
                description: currentTask.description || ''
            });
            setEditedDescription(currentTask.description || '');

            const [taskProject, users] = await Promise.all([
                DataService.getProjectById(currentTask.projectId),
                DataService.getUsers()
            ]);

            setProject(taskProject || null);
            setAllUsers(users);

            if (taskProject) {
                const [allDepts, companies] = await Promise.all([
                    DataService.getDepartments(),
                    DataService.getCompanies().catch(() => [])
                ]);
                const deptSet = new Set(taskProject.departmentIds || []);
                setDepartments(allDepts.filter(d => deptSet.has(d.id)));
                const comp = companies.find((c: Company) => c.id === taskProject.companyId);
                setCompany(comp || null);
            } else {
                setDepartments([]);
                setCompany(null);
            }
            setIsEditingAssignees(false);

        } catch (error) {
            console.error("Failed to load task details:", error);
            // Optionally set error state or display a toast
        } finally {
            setIsLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const { canChangeStatus, canChangeAssignee, canAddNote } = useMemo(() => {

        if (!currentUser || !task || !project) {
            return { canChangeStatus: false, canChangeAssignee: false, canAddNote: false };
        }

        const isAdmin = currentUser.role === UserRole.ADMIN;
        // Project.managerIds is an array, so check if current user is *one of* the managers
        const isProjectManager = project.managerIds?.includes(currentUser.id);
        const isAssignee = (task.assigneeIds || []).includes(currentUser.id);

        // Admins and Project Managers have broad permissions over the task.
        const canManageTask = isAdmin || isProjectManager;

        return {
            // The assignee can also change the status of their own task.
            canChangeStatus: canManageTask || isAssignee,
            // Only managers/admins can re-assign tasks.
            canChangeAssignee: canManageTask,
            // Any authenticated user can add a note per new requirement.
            canAddNote: true
        };
    }, [currentUser, task, project]);

    // Partition users into Managers and Employees, filtered by the task's project departments
    const { managersForProject, employeesForProject } = useMemo(() => {
        const projDeptIds = project?.departmentIds || [];
        const byDept = (u: User) => {
            if (!projDeptIds.length) return true;
            const uDepts = u.departmentIds || [];
            return uDepts.some(id => projDeptIds.includes(id));
        };
        return {
            managersForProject: allUsers.filter(u => u.role === UserRole.MANAGER && byDept(u)),
            employeesForProject: allUsers.filter(u => u.role === UserRole.EMPLOYEE && byDept(u)),
        };
    }, [allUsers, project]);

    const handleAddNote = async () => {
        if (!newNote.trim() || !currentUser || !task || !taskId) return;
        try {
            await DataService.updateTask(taskId, { message: newNote.trim() }, currentUser.id);
            setNewNote('');
            await loadData();
        } catch (e) {
            console.error('Failed to add note:', e);
        }
    };

    const handleSoftDelete = async () => {
        if (!taskId || !currentUser || !deleteReason.trim()) {
            console.error('Missing required fields for task deletion');
            return;
        }
        
        setIsDeleting(true);
        setDeleteError('');
        
        try {
            // 1. First, perform the soft delete
            console.log('Initiating soft delete for task:', taskId);
            const requestBody = {
                taskId: taskId,
                reason: deleteReason.trim(),
                deletedBy: currentUser.id
            };
            
            const apiKey = process.env.REACT_APP_API_KEY || '';
            const token = getToken() || '';
            
            // Make the soft delete request
            const response = await fetch('https://h1fgyiqkmb.execute-api.ap-south-1.amazonaws.com/dev/soft-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': apiKey,
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(requestBody)
            });
            
            const responseData = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                console.error('Soft delete failed:', responseData);
                throw new Error(responseData.message || 'Failed to soft delete task');
            }
            
            console.log('Soft delete successful, proceeding with permanent delete');
            
            // 2. Immediately after successful soft delete, perform the permanent delete
            try {
                console.log('Initiating permanent delete for task:', taskId);
                await DataService.deleteTask(taskId, currentUser.id);
                console.log('Permanent delete successful');
                
                // Show success message
                // You might want to use a toast notification here instead of alert
                alert('Task has been deleted successfully.');
                
            } catch (deleteError) {
                console.error('Permanent delete failed, but soft delete was successful:', deleteError);
                // Even if permanent delete fails, we consider this a success since soft delete worked
                // The task will still be in the deleted tasks list
                alert('Task has been moved to deleted tasks.');
            }
            
            // Close the modal and navigate back
            setShowDeleteModal(false);
            setDeleteReason('');
            navigate(-1);
            
        } catch (error) {
            console.error('Error deleting task:', error);
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!taskId || !currentUser) return;
        
        // Check if there are any changes to save
        const hasStatusChanged = editedTask.status !== undefined && editedTask.status !== task?.status;
        const originalAssignees = new Set(task?.assigneeIds || []);
        const editedAssignees = new Set(editedTask.assigneeIds || []);
        const hasAssigneeChanged = originalAssignees.size !== editedAssignees.size ||
            ![...originalAssignees].every(id => editedAssignees.has(id));
        const hasDueDateChanged = editedTask.dueDate !== undefined && editedTask.dueDate !== (task?.dueDate || undefined);
        const hasEstimatedChanged = editedTask.estimatedTime !== undefined && editedTask.estimatedTime !== (task?.estimatedTime || undefined);
        const hasDescriptionChanged = editedTask.description !== undefined && editedTask.description !== (task?.description || '');

        if (!hasStatusChanged && !hasAssigneeChanged && !hasDueDateChanged && !hasEstimatedChanged && !hasDescriptionChanged) {
            return; // No changes to save
        }

        setIsSaving(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updates: {
                status?: TaskStatus;
                assigneeIds?: string[];
                dueDate?: string;
                estimatedTime?: number;
                description?: string;
            } = {};

            if (hasStatusChanged) {
                updates.status = editedTask.status;
            }

            if (hasAssigneeChanged) {
                updates.assigneeIds = editedTask.assigneeIds;
            }

            if (hasDueDateChanged) {
                updates.dueDate = editedTask.dueDate;
            }

            if (hasEstimatedChanged) {
                updates.estimatedTime = editedTask.estimatedTime;
            }
            
            if (hasDescriptionChanged) {
                updates.description = editedTask.description;
            }

            if (Object.keys(updates).length > 0) {
                await DataService.updateTask(taskId, updates, currentUser.id);

            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            await loadData(); // Reload data to get the latest from the backend
        } catch (error) {
            console.error("Failed to save changes:", error);
            setSaveError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-center p-8">Loading task...</div>;
    if (!task) return <div className="text-center p-8">Task not found.</div>;

    // Check if current user is authorized to view this task.
    // An Admin can view all tasks.
    // A Project Manager can view tasks in their projects.
    // An Employee can view tasks they are assigned to, or tasks in departments they belong to.
    let isAuthorized = true;
    if (currentUser) {
        if (currentUser.role === UserRole.ADMIN) {
            isAuthorized = true;
        } else if (currentUser.role === UserRole.MANAGER && project && project.managerIds?.includes(currentUser.id)) {
            isAuthorized = true;
        } else if (currentUser.role === UserRole.EMPLOYEE) {
            const isAssigned = (task.assigneeIds || []).includes(currentUser.id);
            const isInProjectDepartment = project && currentUser.departmentIds &&
                project.departmentIds.some(projDeptId => currentUser.departmentIds?.includes(projDeptId));
            isAuthorized = isAssigned || isInProjectDepartment;
        } else if (currentUser.role === UserRole.HR) { // Assuming HR can see all tasks, similar to admin but with less control
            isAuthorized = true;
        }
    }

    // Note: View is allowed for all; edit controls are gated via canChange* flags above.

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <button onClick={() => navigate(-1)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center mb-2">
                        &larr; Back
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">{task.name}</h1>
                    {project && (
                        <div className="text-slate-600 mt-2 space-y-1">
                            <p>
                                <span className="text-slate-500">Part of project: </span>
                                <Link to={`/projects/${project.id}`} className="font-semibold text-indigo-600 hover:underline">{project.name}</Link>
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                {departments.length > 0 && (
                                    <p>
                                        <span className="text-slate-500">Departments: </span>
                                        <span className="font-medium text-slate-700">{departments.map(d => d.name).join(', ')}</span>
                                    </p>
                                )}
                                {company && (
                                    <p>
                                        <span className="text-slate-500">Company: </span>
                                        <span className="font-medium text-slate-700">{company.name}</span>
                                    </p>
                                )}
                                <p>
                                    <span className="text-slate-500">Assignees: </span>
                                    <span className="font-medium text-slate-700">{(task.assigneeIds?.length || 0)}</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {(task.assigneeIds && task.assigneeIds.length > 0) ? (
                                    task.assigneeIds.map(id => {
                                        const assignee = allUsers.find(u => u.id === id);
                                        return (
                                            <Link key={id} to={`/users/${id}`} state={{ from: { pathname: location.pathname, state: location.state } }} className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-slate-200 hover:text-slate-900 transition-colors" title={assignee?.name || 'Profile'}>
                                                {assignee?.name || 'Unknown'}
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <span className="text-sm text-slate-500">No assignees</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {saveSuccess && <span className="text-sm font-medium text-green-600">Changes saved!</span>}
                    {saveError && <span className="text-sm font-medium text-red-600">Failed to save changes.</span>}
                    {isDirty && (
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                    {currentUser?.role === UserRole.EMPLOYEE && (task.assigneeIds || []).includes(currentUser.id) && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center"
                            title="Delete Task"
                        >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Delete Task
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Description</h3>
                            {!isEditingDescription && canChangeStatus && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                        {isEditingDescription ? (
                            <div className="space-y-4">
                                <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    rows={6}
                                    className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter task description..."
                                />
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                                        onClick={() => {
                                            setEditedDescription(task.description || '');
                                            setIsEditingDescription(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        onClick={() => {
                                            setEditedTask(prev => ({ ...prev, description: editedDescription }));
                                            setIsEditingDescription(false);
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-700 whitespace-pre-wrap">{editedDescription || 'No description provided.'}</p>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Activity</h3>
                        <div className="max-h-96 overflow-y-auto pr-2 space-y-4 mb-4">
                            {(task.notes || []).length > 0 ? (
                                [...task.notes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((note) => {
                                    const author = allUsers.find(u => u.id === note.authorId);
                                    return (
                                        <div key={`note-${note.id}`} className="flex items-start space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                                {author ? getInitials(author.name) : '?'}
                                            </div>
                                            <div className="flex-1 bg-slate-50 p-3 rounded-md">
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-semibold text-sm text-slate-800">{author?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">{new Date(note.timestamp).toLocaleString()}</p>
                                                </div>
                                                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">No activity on this task yet.</p>
                            )}
                        </div>

                        {canAddNote && (
                            <div className="border-t pt-4">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    rows={4}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Add a new note..."
                                />
                                <div className="text-right mt-3">
                                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Details</h3>
                        <div className="divide-y divide-slate-200">
                            <DetailItem icon={<BriefcaseIcon className="w-5 h-5" />} label="Status">
                                <select
                                    value={editedTask.status}
                                    onChange={(e) => setEditedTask(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                                    disabled={!canChangeStatus}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                                >
                                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </DetailItem>
                            <DetailItem icon={<UserCircleIcon />} label="Assignees">
                                {!isEditingAssignees && (
                                    <div className="flex items-start justify-between">
                                        {canChangeAssignee && (
                                            <Button onClick={() => {
                                                // Start editing with current task assignees
                                                setEditedTask(prev => ({ ...prev, assigneeIds: task.assigneeIds || [] }));
                                                setIsEditingAssignees(true);
                                            }}>
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {canChangeAssignee && isEditingAssignees && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 mb-1">Managers</p>
                                            <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                                                {managersForProject.length === 0 && (
                                                    <p className="text-xs text-slate-500">No managers in project departments.</p>
                                                )}
                                                {managersForProject.map(u => (
                                                    <label key={u.id} htmlFor={`assignee-mgr-${u.id}`} className="flex items-center p-1 rounded hover:bg-slate-50 cursor-pointer">
                                                        <input
                                                            id={`assignee-mgr-${u.id}`}
                                                            type="checkbox"
                                                            value={u.id}
                                                            checked={(editedTask.assigneeIds || []).includes(u.id)}
                                                            onChange={(e) => {
                                                                const { value, checked } = e.target;
                                                                setEditedTask(prev => ({
                                                                    ...prev,
                                                                    assigneeIds: checked
                                                                        ? [...(prev.assigneeIds || []), value]
                                                                        : (prev.assigneeIds || []).filter(id => id !== value)
                                                                }));
                                                            }}
                                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                        />
                                                        <span className="ml-3 text-sm text-slate-800">{u.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 mb-1">Employees</p>
                                            <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                                                {employeesForProject.length === 0 && (
                                                    <p className="text-xs text-slate-500">No employees in project departments.</p>
                                                )}
                                                {employeesForProject.map(u => (
                                                    <label key={u.id} htmlFor={`assignee-emp-${u.id}`} className="flex items-center p-1 rounded hover:bg-slate-50 cursor-pointer">
                                                        <input
                                                            id={`assignee-emp-${u.id}`}
                                                            type="checkbox"
                                                            value={u.id}
                                                            checked={(editedTask.assigneeIds || []).includes(u.id)}
                                                            onChange={(e) => {
                                                                const { value, checked } = e.target;
                                                                setEditedTask(prev => ({
                                                                    ...prev,
                                                                    assigneeIds: checked
                                                                        ? [...(prev.assigneeIds || []), value]
                                                                        : (prev.assigneeIds || []).filter(id => id !== value)
                                                                }));
                                                            }}
                                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                        />
                                                        <span className="ml-3 text-sm text-slate-800">{u.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border"
                                                onClick={() => {
                                                    // Revert assignees and exit edit mode
                                                    setEditedTask(prev => ({ ...prev, assigneeIds: task.assigneeIds || [] }));
                                                    setIsEditingAssignees(false);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <Button
                                                type="button"
                                                onClick={() => setIsEditingAssignees(false)}
                                            >
                                                Done
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </DetailItem>
                            <DetailItem icon={<ClockIcon />} label="Due Date">
                                <input
                                    type="date"
                                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().substring(0, 10) : ''}
                                    onChange={(e) => setEditedTask(prev => ({ ...prev, dueDate: e.target.value }))}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                />
                            </DetailItem>
                            <DetailItem icon={<BriefcaseIcon />} label="Estimated Time">
                                <input
                                    type="number"
                                    min={0}
                                    value={editedTask.estimatedTime ?? ''}
                                    onChange={(e) => setEditedTask(prev => ({ ...prev, estimatedTime: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                />
                            </DetailItem>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteReason('');
                    setDeleteError('');
                }}
                title="Delete Task"
            >
                <div className="space-y-4">
                    <p className="text-slate-700">
                        Are you sure you want to delete this task? This action cannot be undone.
                        Please provide a reason for deletion:
                    </p>
                    
                    <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Enter reason for deletion..."
                        rows={4}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    />
                    
                    {deleteError && (
                        <div className="text-red-600 text-sm">{deleteError}</div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteReason('');
                                setDeleteError('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSoftDelete}
                            disabled={!deleteReason.trim() || isDeleting}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${!deleteReason.trim() || isDeleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Task'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskDetail;