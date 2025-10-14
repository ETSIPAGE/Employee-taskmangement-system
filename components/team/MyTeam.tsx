import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import * as DataService from '../../services/dataService';
import { Navigate } from 'react-router-dom';
import StarRating from '../shared/StarRating';

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const EmployeeCard: React.FC<{ employee: User }> = ({ employee }) => {
    const isOnline = useMemo(() => Math.random() > 0.5, []); // Randomize status for visual demo

    return (
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold">
                    {getInitials(employee.name)}
                </div>
                <span 
                    className={`absolute bottom-1 right-1 block h-5 w-5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                    title={isOnline ? 'Online' : 'Offline'}
                ></span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{employee.name}</h3>
            <p className="text-sm text-slate-500 mb-2">{employee.email}</p>
            {employee.rating !== undefined && (
                <div className="my-2">
                    <StarRating rating={employee.rating} />
                </div>
            )}
            <button className="w-full mt-2 px-4 py-2 text-sm font-medium rounded-md bg-white text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 shadow-sm">
                View Profile
            </button>
        </div>
    );
};

const MyTeam: React.FC = () => {
    const { user } = useAuth();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (user && user.role === UserRole.MANAGER) {
                setLoading(true);
                try {
                    const apiUsers = await DataService.getAllUsersFromApi();
                    const me = apiUsers.find(u => u.id === user.id);
                    const members = apiUsers.filter(u => u.role === UserRole.EMPLOYEE && u.managerId === user.id);
                    setTeamMembers(me ? [me, ...members] : members);
                } catch (error) {
                    console.error("Failed to fetch team members", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchTeamMembers();
    }, [user]);

    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <div className="text-xl font-semibold text-slate-700">Loading Team...</div>
            </div>
        );
    }

    if (!user || user.role !== UserRole.MANAGER) {
        return <Navigate to="/" />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">My Team</h1>
            {teamMembers.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <h3 className="text-xl font-semibold text-slate-700">No Team Members Found</h3>
                    <p className="text-slate-500 mt-2">You currently have no employees assigned to you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {teamMembers.map(member => (
                        <EmployeeCard key={member.id} employee={member} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTeam;