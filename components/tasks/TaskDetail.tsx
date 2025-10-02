import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService'; // These functions return Promises
import * as AuthService from '../../services/authService';
import { Task, TaskStatus, User, Project, UserRole, Note, DependencyLog } from '../../types';
import Button from '../shared/Button';
import { ClockIcon, BriefcaseIcon, UserCircleIcon, LinkIcon } from '../../constants'; // Added LinkIcon for dependency

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

interface ActivityItem {
    type: 'note' | 'log';
    timestamp: string;
    data: Note | DependencyLog;
}

const TaskDetail: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [editedTask, setEditedTask] = useState<{ status?: TaskStatus; assigneeId?: string }>({});
    const [isSettingDependency, setIsSettingDependency] = useState(false);
    const [dependencyUserId, setDependencyUserId] = useState('');
    const [dependencyReason, setDependencyReason] = useState('');
    
    const isDirty = useMemo(() => {
        if (!task) return false;
        const hasStatusChanged = editedTask.status !== undefined && editedTask.status !== task.status;
        const hasAssigneeChanged = editedTask.assigneeId !== undefined && editedTask.assigneeId !== (task.assigneeId || '');
        return hasStatusChanged || hasAssigneeChanged;
    }, [task, editedTask]);


    const loadData = useCallback(async () => {
        if (!taskId) return;
        setIsLoading(true);
        try {
            const currentTask = await DataService.getTaskById(taskId);
            if (!currentTask) {
                setTask(null);
                setProject(null);
                setAllUsers([]);
                navigate('/tasks'); // Redirect or show a specific "not found" message
                return;
            }
 
            setTask(currentTask);
            setEditedTask({ status: currentTask.status, assigneeId: currentTask.assigneeId || '' });

            const [taskProject, users] = await Promise.all([
                DataService.getProjectById(currentTask.projectId),
                AuthService.getUsers() // Changed to AuthService.getUsers
            ]);

            setProject(taskProject || null);
            setAllUsers(users);

            // Initialize dependencyUserId if a dependency is set, or for new dependency creation
            if (currentTask.dependency) {
                setDependencyUserId(currentTask.dependency.userId);
                setDependencyReason(currentTask.dependency.reason || '');
            } else if (users.length > 0 && !dependencyUserId) {
                setDependencyUserId(currentTask.assigneeId || users[0].id); // Default to assignee or first user
            } else if (users.length === 0) {
                setDependencyUserId('');
            }

        } catch (error) {
            console.error("Failed to load task details:", error);
            setTask(null);
            setProject(null);
            setAllUsers([]);
            alert("Failed to load task details. Please try again."); // User feedback
        } finally {
            setIsLoading(false);
        }
    }, [taskId, navigate, dependencyUserId]); 

    useEffect(() => {
        loadData();
    }, [loadData]);

    const { canChangeStatus, canChangeAssignee, canAddNote, canEdit } = useMemo(() => {
        if (!currentUser || !task || !project) {
            return { canChangeStatus: false, canChangeAssignee: false, canAddNote: false, canEdit: false };
        }
        
        const isAdmin = currentUser.role === UserRole.ADMIN;
        const isProjectManager = currentUser.id === project.managerId;
        const isAssignee = currentUser.id === task.assigneeId;

        const canManageTask = isAdmin || isProjectManager;

        return {
            canChangeStatus: canManageTask || isAssignee,
            canChangeAssignee: canManageTask,
            canAddNote: canManageTask || isAssignee,
            canEdit: canManageTask // General permission for setting/clearing dependency
        };
    }, [currentUser, task, project]);

    const activityFeed = useMemo(() => {
        if (!task) return [];
        const notes: ActivityItem[] = (task.notes || []).map(note => ({
            type: 'note',
            timestamp: note.timestamp,
            data: note
        }));
        const logs: ActivityItem[] = (task.dependencyLogs || []).map(log => ({
            type: 'log',
            timestamp: log.timestamp,
            data: log
        }));

        // Sort by timestamp for a chronological activity feed
        return [...notes, ...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [task]);


    const handleUpdateTask = async (updates: Partial<Task>) => {
        if (!taskId || !currentUser) return; // Ensure currentUser is available for updaterId
        setIsLoading(true); 
        try {
            await DataService.updateTask(taskId, updates, currentUser.id); // Pass currentUser.id as updaterId
            await loadData(); 
        } catch (error) {
            console.error("Failed to update task:", error);
            alert("Failed to update task. Please try again.");
        } finally {
            setIsLoading(false); 
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !currentUser || !task) return;

        const noteToAdd: Note = {
            id: `note-${Date.now()}`, // Simple unique ID for mock, use uuid for real
            authorId: currentUser.id,
            content: newNote.trim(),
            timestamp: new Date().toISOString(),
        };
 
        await handleUpdateTask({ notes: [...(task.notes || []), noteToAdd] });
        setNewNote('');
    };
    
    const handleSaveChanges = async () => {
        if (!taskId || !currentUser || !isDirty) return;
        setIsSaving(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updates: { status?: TaskStatus; assigneeId?: string | undefined } = {};
            if (editedTask.status !== task?.status) {
                updates.status = editedTask.status;
            }
             if (editedTask.assigneeId !== (task?.assigneeId || '')) {
                updates.assigneeId = editedTask.assigneeId === '' ? undefined : editedTask.assigneeId;
            }

            // Corrected: DataService.updateTask expects updaterId as the third argument
            await DataService.updateTask(taskId, updates, currentUser.id); 
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            await loadData();
        } catch (error) {
            console.error("Failed to save changes:", error);
            setSaveError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetDependency = async () => { 
        if (!dependencyUserId || !dependencyReason.trim() || !currentUser || !task) {
            alert("Please select a person and provide a reason for the dependency.");
            return;
        }

        const newLog: DependencyLog = {
            authorId: currentUser.id,
            action: 'set',
            reason: dependencyReason,
            dependencyOnUserId: dependencyUserId,
            timestamp: new Date().toISOString()
        };

        await handleUpdateTask({
            dependency: {
                userId: dependencyUserId,
                reason: dependencyReason,
            },
            dependencyLogs: [...(task.dependencyLogs || []), newLog],
            status: TaskStatus.ON_HOLD
        });
        setIsSettingDependency(false);
        setDependencyReason('');
    };

    const handleClearDependency = async () => { 
        if (!currentUser || !task) {
            alert("Failed to clear dependency: current user or task not found.");
            return;
        }
        if (window.confirm("Are you sure you want to clear this dependency? The task will be moved back to 'To-Do'.")) {
             const newLog: DependencyLog = {
                authorId: currentUser.id,
                action: 'cleared',
                timestamp: new Date().toISOString()
            };
            await handleUpdateTask({
                dependency: undefined,
                dependencyLogs: [...(task.dependencyLogs || []), newLog],
                status: TaskStatus.TODO
            });
        }
    };

    const dependencyUser = useMemo(() => allUsers.find(u => u.id === task?.dependency?.userId), [allUsers, task?.dependency?.userId]);

    if (isLoading) return <div className="text-center p-8 text-lg text-slate-600">Loading task...</div>;
    if (!task) return <div className="text-center p-8 text-lg text-slate-600">Task not found.</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <button onClick={() => navigate(-1)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center mb-2">
                        &larr; Back
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">{task.name}</h1>
                    {project && (
                        <p className="text-slate-500 mt-1">
                            Part of project: <Link to={`/projects/${project.id}`} className="font-semibold text-indigo-600 hover:underline">{project.name}</Link>
                        </p>
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
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Description</h3>
                        <p className="text-slate-700 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Activity</h3>
                        <div className="max-h-96 overflow-y-auto pr-2 space-y-4 mb-4">
                            {activityFeed.length > 0 ? (
                                activityFeed.map((item, index) => {
                                    const author = allUsers.find(u => u.id === item.data.authorId);
                                    if (item.type === 'note') {
                                        const note = item.data as Note;
                                        return (
                                            <div key={`note-${note.id}-${index}`} className="flex items-start space-x-3">
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
                                    } else { // type === 'log'
                                        const log = item.data as DependencyLog;
                                        const dependentUser = allUsers.find(u => u.id === log.dependencyOnUserId);
                                        return (
                                            <div key={`log-${index}`} className="flex items-start space-x-3 text-sm text-slate-600">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                                                    <LinkIcon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 bg-indigo-50 p-3 rounded-md">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-semibold text-sm text-indigo-800">{author?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                                                    </div>
                                                    <p className="mt-1">
                                                        {log.action === 'set' 
                                                            ? `set a dependency on ${dependentUser?.name || 'an unknown user'} for reason: "${log.reason}"`
                                                            : 'cleared a dependency.'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
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
                             <DetailItem icon={<BriefcaseIcon className="w-5 h-5"/>} label="Status">
                                 <select 
                                    value={editedTask.status} 
                                    onChange={(e) => setEditedTask(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                                    disabled={!canChangeStatus}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                                >
                                     {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                            </DetailItem>
                             <DetailItem icon={<UserCircleIcon />} label="Assignee">
                                 <select 
                                    value={editedTask.assigneeId} 
                                    onChange={(e) => setEditedTask(prev => ({ ...prev, assigneeId: e.target.value || undefined }))}
                                    disabled={!canChangeAssignee}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                                >
                                     <option value="">Unassigned</option>
                                     {allUsers.filter(u => u.role !== UserRole.ADMIN).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                 </select>
                            </DetailItem>
                            <DetailItem icon={<ClockIcon className="w-5 h-5"/>} label="Due Date">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                            </DetailItem>
                            <DetailItem icon={<BriefcaseIcon className="w-5 h-5"/>} label="Estimated Time">
                                {task.estimatedTime ? `${task.estimatedTime} hours` : 'Not set'}
                            </DetailItem>
                         </div>
                    </div>
 
                    <div className="bg-white p-6 rounded-lg shadow">
                         <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Dependency</h3>
                        {task.dependency ? (
                             <div>
                                 <DetailItem icon={<LinkIcon className="w-5 h-5" />} label="Waiting For">
                                     <div className="font-semibold">{dependencyUser?.name || 'Unknown User'}</div>
                                </DetailItem>
                                 <div className="mt-2 text-sm text-slate-600 p-3 bg-slate-50 rounded-md border">
                                    <p className="font-semibold text-slate-800">Reason:</p>
                                    <p className="whitespace-pre-wrap">{task.dependency.reason}</p>
                                </div>
                                {canEdit && ( 
                                     <Button onClick={handleClearDependency} fullWidth>Clear Dependency</Button>
                                )}
                             </div>
                        ) : isSettingDependency ? (
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="dependencyUser" className="text-sm font-semibold text-slate-600 block mb-1">Waiting For</label>
                                     <select id="dependencyUser" value={dependencyUserId} onChange={(e) => setDependencyUserId(e.target.value)} className="w-full p-1 border-slate-300 rounded-md shadow-sm">
                                         {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                     </select>
                                </div>
                                 <div>
                                    <label htmlFor="dependencyReason" className="text-sm font-semibold text-slate-600 block mb-1">Reason</label>
                                    <textarea id="dependencyReason" value={dependencyReason} onChange={(e) => setDependencyReason(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 rounded-md"></textarea>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button type="button" onClick={() => setIsSettingDependency(false)} className="px-3 py-1 text-sm rounded-md bg-slate-100 hover:bg-slate-200">Cancel</button>
                                    <Button onClick={handleSetDependency}>Save</Button>
                                </div>
                            </div>
                        ) : (
                             <div>
                                <p className="text-sm text-slate-500 mb-3">No dependencies are set for this task.</p>
                                {canEdit && ( 
                                    <Button onClick={() => setIsSettingDependency(true)} fullWidth>Set Dependency</Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;