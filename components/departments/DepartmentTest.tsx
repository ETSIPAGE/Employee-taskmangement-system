import React, { useState, useEffect } from 'react';
import * as DataService from '../../services/dataService';

const DepartmentTest: React.FC = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentCompanyId, setNewDepartmentCompanyId] = useState('COMP-123');

    const loadDepartments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await DataService.getDepartments();
            setDepartments(data);
        } catch (err) {
            setError('Failed to load departments: ' + (err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createDepartment = async () => {
        if (!newDepartmentName.trim()) {
            setError('Department name is required');
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const newDepartment = await DataService.createDepartment(newDepartmentName, newDepartmentCompanyId);
            console.log('Created department:', newDepartment);
            setNewDepartmentName('');
            await loadDepartments(); // Refresh the list
        } catch (err) {
            setError('Failed to create department: ' + (err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Department API Test</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Create Department</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        placeholder="Department Name"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        disabled={loading}
                    />
                    <input
                        type="text"
                        value={newDepartmentCompanyId}
                        onChange={(e) => setNewDepartmentCompanyId(e.target.value)}
                        placeholder="Company ID"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        disabled={loading}
                    />
                    <button
                        onClick={createDepartment}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
            
            <div>
                <h2 className="text-xl font-semibold mb-2">Departments</h2>
                <button
                    onClick={loadDepartments}
                    disabled={loading}
                    className="mb-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
                
                {departments.length === 0 ? (
                    <p>No departments found.</p>
                ) : (
                    <ul className="border rounded-md divide-y">
                        {departments.map((dept) => (
                            <li key={dept.id} className="p-3 hover:bg-gray-50">
                                <div className="font-medium">{dept.name}</div>
                                <div className="text-sm text-gray-500">ID: {dept.id}</div>
                                <div className="text-sm text-gray-500">Company ID: {dept.companyId}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DepartmentTest;