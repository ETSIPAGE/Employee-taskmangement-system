import React, { useState, useEffect } from 'react';
import { getDeletedTasks } from '../../services/dataService';
import { Task } from '../../types';
import { DocumentCheckIcon, ExclamationTriangleIcon, ClockIcon } from '../../constants';

const DeletedTasks: React.FC = () => {
    const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const loadDeletedTasks = async (loadMore = false) => {
        try {
            if (!loadMore) {
                setIsLoading(true);
                setError(null);
            }

            const { items, pagination } = await getDeletedTasks(
                10, // Limit to 10 items per page
                loadMore ? lastEvaluatedKey : null
            );
            
            setDeletedTasks(prev => loadMore ? [...prev, ...items] : items);
            setLastEvaluatedKey(pagination.lastEvaluatedKey || null);
            setHasMore(!!pagination.lastEvaluatedKey);
        } catch (err) {
            console.error('Error loading deleted tasks:', err);
            setError('Failed to load deleted tasks. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDeletedTasks();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <DocumentCheckIcon className="h-5 w-5 text-green-500" />;
            case 'PENDING':
                return <ClockIcon className="h-5 w-5 text-yellow-500" />;
            default:
                return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    // Loading state
    if (isLoading && deletedTasks.length === 0) {
        return (
            <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading deleted tasks...
                </td>
            </tr>
        );
    }

    // Error state
    if (error) {
        return (
            <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500">
                    {error}
                </td>
            </tr>
        );
    }

    // Empty state
    if (deletedTasks.length === 0) {
        return (
            <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No deleted tasks found.
                </td>
            </tr>
        );
    }

    // Main content
    return (
        <>
            {deletedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{task.name}</div>
                                {task.description && (
                                    <div className="text-sm text-gray-500">
                                        {task.description.length > 50 
                                            ? `${task.description.substring(0, 50)}...` 
                                            : task.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{task.projectName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{task.deletedBy || 'System'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                            {task.deletedAt ? formatDate(task.deletedAt) : 'N/A'}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            {getStatusIcon(task.status || '')}
                            <span className="ml-2 text-sm text-gray-500 capitalize">
                                {task.status?.toLowerCase() || 'unknown'}
                            </span>
                        </div>
                    </td>
                </tr>
            ))}
            
            {hasMore && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                        <button
                            onClick={() => loadDeletedTasks(true)}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading more...' : 'Load More'}
                        </button>
                    </td>
                </tr>
            )}
        </>
    );
};

export default DeletedTasks;
