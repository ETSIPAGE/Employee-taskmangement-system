import React, { useState, useEffect } from 'react';
import * as DataService from '../../services/dataService';

const ApiTest: React.FC = () => {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const testGetDepartments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await DataService.getDepartments();
            setResult({ operation: 'GET Departments', data });
        } catch (err) {
            setError('Failed to get departments: ' + (err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const testCreateDepartment = async () => {
        setLoading(true);
        setError(null);
        try {
            // Create a test department
            const data = await DataService.createDepartment('Test Department', 'comp-1');
            setResult({ operation: 'CREATE Department', data });
        } catch (err) {
            setError('Failed to create department: ' + (err as Error).message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Department API Integration Test</h1>
            
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Test Operations</h2>
                <div className="flex gap-4">
                    <button
                        onClick={testGetDepartments}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? 'Testing...' : 'Test GET Departments'}
                    </button>
                    <button
                        onClick={testCreateDepartment}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                        {loading ? 'Testing...' : 'Test CREATE Department'}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    <strong>Error:</strong> {error}
                </div>
            )}
            
            {result && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Test Result: {result.operation}</h2>
                    <pre className="bg-white p-4 rounded-md overflow-x-auto text-sm">
                        {JSON.stringify(result.data, null, 2)}
                    </pre>
                </div>
            )}
            
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">API Endpoints Used</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>GET Departments:</strong> https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/</li>
                    <li><strong>POST Department:</strong> https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment</li>
                </ul>
            </div>
        </div>
    );
};

export default ApiTest;