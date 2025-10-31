import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole, Project, Task } from '../../types';
import * as DataService from '../../services/dataService'; // Ensure this import is correct
import { Navigate, Link, useLocation } from 'react-router-dom';
import StarRating from '../shared/StarRating';

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const EmployeeCard: React.FC<{ employee: User; fromState: any }> = ({ employee, fromState }) => {
    // Note: DataService.isUserOnline(employee.id) would be better here for real-time status.
    // For now, keeping the random logic as in your original code.
    const isOnline = useMemo(() => Math.random() > 0.5, []); 

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
            <Link to={`/users/${employee.id}`} state={{ from: fromState }} className="w-full mt-2 px-4 py-2 text-sm font-medium rounded-md bg-white text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 shadow-sm text-center">
                View Profile
            </Link>
        </div>
    );
};

const MyTeam: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (user && user.role === UserRole.MANAGER) {
                setLoading(true);
                try {
                    // Load users, projects, tasks to infer team members comprehensively
                    const [apiUsers, projects, allTasks] = await Promise.all([
                        DataService.getUsers(),
                        DataService.getAllProjects(),
                        DataService.getAllTasks(),
                    ]);

                    const me = apiUsers.find(u => u.id === user.id);

                    // Direct reports by explicit managerId
                    const directReports = apiUsers.filter(u => u.role === UserRole.EMPLOYEE && u.managerId === user.id);

                    // Employees working on projects managed by this manager (via tasks)
                    const managedProjects = projects.filter(p => (p.managerIds || []).includes(user.id));
                    const managedProjectIds = new Set(managedProjects.map(p => p.id));
                    const managedDeptIds = new Set<string>(managedProjects.flatMap(p => p.departmentIds || []));
                    const employeeIdsFromManagedTasks = new Set<string>();
                    allTasks.forEach((t: Task) => {
                        if (managedProjectIds.has(t.projectId)) {
                            (t.assigneeIds || []).forEach(id => employeeIdsFromManagedTasks.add(id));
                        }
                    });
                    const employeesFromManagedTasks = apiUsers.filter(
                        u => u.role === UserRole.EMPLOYEE && employeeIdsFromManagedTasks.has(u.id)
                    );

                    // Employees in departments of manager's projects
                    const employeesInManagedDepts = apiUsers.filter(u => {
                        if (u.role !== UserRole.EMPLOYEE) return false;
                        const uDepts = u.departmentIds || [];
                        return uDepts.some(id => managedDeptIds.has(id));
                    });

                    // Union of employees
                    const byId: Record<string, User> = {};
                    [...directReports, ...employeesFromManagedTasks, ...employeesInManagedDepts].forEach(u => { byId[u.id] = u; });
                    const members = Object.values(byId);

                    setTeamMembers(me ? [me, ...members] : members);
                } catch (error) {
                    console.error("Failed to fetch team members", error);
                    // Optionally, add a toast notification here
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
                        <EmployeeCard key={member.id} employee={member} fromState={location} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTeam;