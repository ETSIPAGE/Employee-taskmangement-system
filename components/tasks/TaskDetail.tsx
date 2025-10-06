import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Task, TaskStatus, User, Project, UserRole, Note } from '../../types';
import Button from '../shared/Button';
import { ClockIcon, BriefcaseIcon, UserCircleIcon } from '../../constants';

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

    const [task, setTask] = useState<Task | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);


    const [editedTask, setEditedTask] = useState<{ status?: TaskStatus; assigneeId?: string }>({});
    
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
                setIsLoading(false);
                return;
            }
            setTask(currentTask);
            setEditedTask({ status: currentTask.status, assigneeId: currentTask.assigneeId || '' });

            const [taskProject, users] = await Promise.all([
                DataService.getProjectById(currentTask.projectId),
                DataService.getAllUsersFromApi()
            ]);

            setProject(taskProject || null);
            setAllUsers(users);

        } catch (error) {
            console.error("Failed to load task details:", error);
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
        const isProjectManager = currentUser.id === project.managerId;
        const isAssignee = currentUser.id === task.assigneeId;

        // Admins and Project Managers have broad permissions over the task.
        const canManageTask = isAdmin || isProjectManager;

        return {
            // The assignee can also change the status of their own task.
            canChangeStatus: canManageTask || isAssignee,
            // Only managers/admins can re-assign tasks.
            canChangeAssignee: canManageTask,
            // Anyone involved can add a note.
            canAddNote: canManageTask || isAssignee
        };
    }, [currentUser, task, project]);
    
    const handleAddNote = () => {
        if (!newNote.trim() || !currentUser || !task || !taskId) return;

        const noteToAdd: Note = {
            id: `note-${Date.now()}`,
            authorId: currentUser.id,
            content: newNote.trim(),
            timestamp: new Date().toISOString(),
        };

        const updatedNotes = [...(task.notes || []), noteToAdd];
        DataService.updateTaskLocally(taskId, { notes: updatedNotes });
        loadData();
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


    if (isLoading) return <div className="text-center p-8">Loading task...</div>;
    if (!task) return <div className="text-center p-8">Task not found.</div>;

    return (
        <div>
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
                            {(task.notes || []).length > 0 ? (
                                [...task.notes].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((note) => {
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
                            <DetailItem icon={<ClockIcon />} label="Due Date">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                            </DetailItem>
                            <DetailItem icon={<BriefcaseIcon />} label="Estimated Time">
                                {task.estimatedTime ? `${task.estimatedTime} hours` : 'Not set'}
                            </DetailItem>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;