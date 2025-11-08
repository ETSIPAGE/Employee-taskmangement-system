import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getDeletedTasks } from '../../services/dataService';
import { Task } from '../../types';
import { DocumentCheckIcon, ExclamationTriangleIcon, ClockIcon, ArrowLeftIcon } from '../../constants';
import Link from 'next/link';

const DeletedTasksPage = () => {
    const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const loadDeletedTasks = async () => {
            try {
                setIsLoading(true);
                const result = await getDeletedTasks(50); // Load more tasks by default
                setDeletedTasks(result.items);
            } catch (err) {
                console.error('Error loading deleted tasks:', err);
                setError('Failed to load deleted tasks. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center mb-6">
                        <button 
                            onClick={() => router.back()}
                            className="mr-4 p-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Deleted Tasks</h1>
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
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center mb-6">
                        <button 
                            onClick={() => router.back()}
                            className="mr-4 p-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Deleted Tasks</h1>
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center mb-6">
                    <button 
                        onClick={() => router.back()}
                        className="mr-4 p-2 rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Deleted Tasks</h1>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Task
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Deleted By
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Deleted At
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {deletedTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No deleted tasks found.
                                        </td>
                                    </tr>
                                ) : (
                                    deletedTasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeletedTasksPage;
