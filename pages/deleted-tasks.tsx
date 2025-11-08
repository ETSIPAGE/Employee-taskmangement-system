import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeletedTasks, getUserById } from '../services/dataService';
import { Task, TaskStatus } from '../types';
import { 
    ClockIcon, 
    TrashIcon, 
    BriefcaseIcon, 
    ExclamationTriangleIcon,
    DocumentCheckIcon
} from '../constants';

// Custom ArrowLeftIcon since it's not exported from constants
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

interface DeletedTask extends Task {
    deletedAt?: string;
    deletedBy?: string;
    deletedByEmail?: string;
    deleteReason?: string;
}

const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const DeletedTasksPage = () => {
    const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<DeletedTask | null>(null);
    const [deletedByNames, setDeletedByNames] = useState<Record<string, string>>({});
    const navigate = useNavigate();

    // Helper function to get deleted by name from the userId
    const getDeletedByName = (userId?: string): string => {
        if (!userId) return 'Unknown User';
        return deletedByNames[userId] || userId; // Fallback to ID if name not found
    };

    const statusStyles: Record<string, string> = {
        [TaskStatus.TODO]: 'bg-yellow-100 text-yellow-800',
        [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
        [TaskStatus.ON_HOLD]: 'bg-slate-100 text-slate-800',
        [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
        DELETED: 'bg-red-100 text-red-800',
    };

    const priorityStyles = {
        low: 'bg-slate-100 text-slate-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-red-100 text-red-800',
    };

    useEffect(() => {
        const loadDeletedTasks = async () => {
            try {
                setIsLoading(true);
                const result = await getDeletedTasks(100);
                const tasks = result.items || [];
                setDeletedTasks(tasks);
                
                // Fetch user names for deletedBy fields
                const userIds = [...new Set(tasks.map(task => task.deletedBy).filter(Boolean))] as string[];
                await fetchUserNames(userIds);
            } catch (err) {
                console.error('Error loading deleted tasks:', err);
                setError('Failed to load deleted tasks. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        
        const fetchUserNames = async (userIds: string[]) => {
            try {
                const users = await Promise.all(
                    userIds.map(id => getUserById(id))
                );
                
                const namesMap = users.reduce((acc, user) => {
                    if (user) {
                        acc[user.id] = user.name || 'Unknown User';
                    }
                    return acc;
                }, {} as Record<string, string>);
                
                setDeletedByNames(prev => ({
                    ...prev,
                    ...namesMap
                }));
            } catch (error) {
                console.error('Error fetching user names:', error);
            }
        };
        
        loadDeletedTasks();
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleWhyDeletedClick = (e: React.MouseEvent, task: DeletedTask) => {
        e.stopPropagation();
        setSelectedTask(task);
        // @ts-ignore - showModal is a method on the dialog element
        document.getElementById('deleteReasonModal')?.showModal();
    };

    const renderDeleteReason = (reason?: string) => {
        if (!reason || reason.trim() === '') return 'No reason provided for deletion.';
        return reason;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <button 
                                onClick={() => navigate(-1)}
                                className="mr-4 p-2 rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Deleted Tasks</h1>
                        </div>
                    </div>
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <button 
                                onClick={() => navigate(-1)}
                                className="mr-4 p-2 rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Deleted Tasks</h1>
                        </div>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                            <p className="ml-3 text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center mb-6">
                    <button 
                        onClick={() => navigate(-1)}
                        className="mr-4 p-2 rounded-full hover:bg-slate-100"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Deleted Tasks</h1>
                        <p className="text-sm text-slate-500">
                            {deletedTasks.length} task{deletedTasks.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                </div>

                {deletedTasks.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-slate-200">
                        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <TrashIcon className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No deleted tasks</h3>
                        <p className="mt-1 text-slate-500">There are no deleted tasks to display.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {deletedTasks.map((task) => (
                            <div 
                                key={task.id} 
                                className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={(e) => handleWhyDeletedClick(e, task)}
                            >
                                {/* Status & Deleted Badge */}
                                {/* Task Title & Description */}
                                <div className="mb-3">
                                    <h3 className="font-semibold text-slate-800 text-base mb-1 line-clamp-1">
                                        {task.name}
                                    </h3>
                                    {task.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                {/* Priority & Deleted Info */}
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                    {task.priority && (
                                        <span className={`capitalize px-2 py-0.5 rounded-full ${priorityStyles[task.priority] || 'bg-slate-100'}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                    <div className="flex items-center">
                                        {task.deletedAt && (
                                            <div className="flex items-center text-slate-500">
                                                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                                                <span className="text-xs">{formatDate(task.deletedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Deleted By */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="flex items-center">
                                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-800">
                                            {getInitials(getDeletedByName(task.deletedBy))}
                                        </div>
                                        <span className="ml-2 text-xs text-slate-600">
                                            {getDeletedByName(task.deletedBy)}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => handleWhyDeletedClick(e, task)}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        View Reason
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Reason Modal */}
                <dialog id="deleteReasonModal" className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
                    <div className="modal-box max-w-2xl p-0 overflow-hidden shadow-xl">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Delete Details</h3>
                                <form method="dialog">
                                    <button className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                        
                        {selectedTask && (
                            <div className="p-6 space-y-6">
                                <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                                    <h4 className="font-semibold text-slate-800 text-lg mb-4 flex items-center">
                                        <DocumentCheckIcon className="h-5 w-5 text-indigo-600 mr-2" />
                                        Task Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Task Name</p>
                                            <p className="font-medium text-slate-900 text-base">{selectedTask.name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Project</p>
                                            <p className="font-medium text-slate-900 text-base">{selectedTask.projectName || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Status</p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                statusStyles[selectedTask.status || 'DELETED'] || 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {selectedTask.status?.toLowerCase() || 'deleted'}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Priority</p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                priorityStyles[selectedTask.priority || 'medium'] || 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {selectedTask.priority?.toLowerCase() || 'medium'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 text-lg flex items-center">
                                        <TrashIcon className="h-5 w-5 text-red-500 mr-2" />
                                        Delete Details
                                    </h4>
                                    <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
                                        <div className="flex items-start">
                                            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                                <TrashIcon className="h-6 w-6 text-red-500" />
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            Deleted by: {getDeletedByName(selectedTask.deletedBy)}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {selectedTask.deletedAt ? formatDate(selectedTask.deletedAt) : 'Unknown date'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                    <h5 className="text-sm font-medium text-slate-700 mb-2">Reason for Deletion:</h5>
                                                    <p className="text-slate-800 bg-white p-3 rounded border border-slate-200">
                                                        {renderDeleteReason(selectedTask.deleteReason)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                            <form method="dialog" className="flex justify-end">
                                <button className="btn btn-ghost hover:bg-slate-200 text-slate-700">Close</button>
                            </form>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button className="cursor-default">close</button>
                    </form>
                </dialog>
            </div>
        </div>
    );
};

export default DeletedTasksPage;