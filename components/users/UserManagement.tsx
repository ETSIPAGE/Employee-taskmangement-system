import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';
import { User, UserRole, Department, Company } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import ViewSwitcher from '../shared/ViewSwitcher';
import { BuildingOfficeIcon, BriefcaseIcon, CheckCircleIcon, ClockIcon, TrendingUpIcon, StarIcon, MailIcon, CalendarIcon, EditIcon, TrashIcon, LoginIcon } from '../../constants';
import StarRating from '../shared/StarRating';

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const StatItem: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string }> = ({ icon, value, label }) => (
    <div className="text-center">
        <div className="flex items-center justify-center space-x-2">
            <span>{icon}</span>
            <span className="text-xl font-bold text-slate-800">{value}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
);

const UserCard: React.FC<{ user: User; companyName?: string; onEdit: (user: User) => void; onDelete: (userId: string) => void; onImpersonate: (userId: string) => void; currentUser: User; }> = ({ user, companyName, onEdit, onDelete, onImpersonate, currentUser }) => {
    const statusStyles = {
        Active: { dot: 'bg-green-500' },
        Busy: { dot: 'bg-orange-500' },
        Offline: { dot: 'bg-slate-400' },
    };

    const roleStyles = {
        [UserRole.ADMIN]: { border: 'border-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-800' },
        [UserRole.MANAGER]: { border: 'border-sky-500', bg: 'bg-sky-100', text: 'text-sky-800' },
        [UserRole.EMPLOYEE]: { border: 'border-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800' },
        [UserRole.HR]: { border: 'border-rose-500', bg: 'bg-rose-100', text: 'text-rose-800' },
    };

    const workloadStyles = {
        Light: { bg: 'bg-green-500', label: 'Light' },
        Normal: { bg: 'bg-blue-500', label: 'Normal' },
        Heavy: { bg: 'bg-orange-500', label: 'Heavy' },
    };

    const currentStatus = user.status || 'Offline';
    const currentWorkload = user.stats?.workload || 'Light';
    const workloadValue = { Light: 33, Normal: 66, Heavy: 100 }[currentWorkload];

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className={`bg-white rounded-xl shadow-md p-5 flex flex-col space-y-5 transition-all hover:shadow-lg border-t-4 ${roleStyles[user.role].border}`}>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold flex-shrink-0">
                        {getInitials(user.name)}
                    </div>
                    <div>
                         <div className="flex items-center gap-x-2">
                            <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
                             <span className={`${roleStyles[user.role].bg} ${roleStyles[user.role].text} text-xs font-semibold px-2 py-0.5 rounded-full`}>
                                {user.role}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                            <BriefcaseIcon className="h-4 w-4" />
                            <span>{user.jobTitle || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="relative">
                     <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusStyles[currentStatus].dot}`}></span>
                        <span>{currentStatus}</span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                     </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border">
                            <a href="#" onClick={(e) => { e.preventDefault(); onEdit(user); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Edit User</a>
                            {currentUser.role === UserRole.ADMIN && currentUser.id !== user.id && (
                                <a href="#" onClick={(e) => { e.preventDefault(); onImpersonate(user.id); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                    Impersonate
                                </a>
                            )}
                            <a href="#" onClick={(e) => { e.preventDefault(); onDelete(user.id); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete User</a>
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
             <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center space-x-2 truncate"><MailIcon className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{user.email}</span></div>
                <div className="flex items-center space-x-2 truncate"><BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{companyName || 'N/A'}</span></div>
                <div className="col-span-2 flex items-center space-x-2 truncate"><CalendarIcon className="h-4 w-4 flex-shrink-0" /> <span>Joined {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'}</span></div>
            </div>

            {/* Skills */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                    {user.skills?.map(skill => (
                        <span key={skill} className="bg-sky-100 text-sky-800 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                    ))}
                     {(!user.skills || user.skills.length === 0) && <p className="text-xs text-slate-400">No skills listed.</p>}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 py-4 border-t border-b border-slate-200">
                <StatItem icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />} value={user.stats?.completedTasks ?? 0} label="Completed" />
                <StatItem icon={<ClockIcon className="h-5 w-5 text-blue-500" />} value={user.stats?.inProgressTasks ?? 0} label="In Progress" />
                <StatItem icon={<TrendingUpIcon className="h-5 w-5 text-indigo-500" />} value={<>{user.stats?.efficiency ?? 0}<span className="text-base">%</span></>} label="Efficiency" />
                <StatItem icon={<StarIcon className="h-5 w-5 text-yellow-500" />} value={<>{user.stats?.totalHours ?? 0}<span className="text-base">h</span></>} label="Total Hours" />
            </div>

            {/* Rating */}
            {user.rating !== undefined && (
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">Performance Rating</h4>
                    <StarRating rating={user.rating} />
                </div>
            )}

            {/* Actions & Workload */}
            <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-shadow shadow-sm hover:shadow-md">Assign Task</button>
                    <Link to={`/users/${user.id}`}>
                         <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-shadow shadow-sm hover:shadow-md">View Profile</button>
                    </Link>
                </div>
                <div className="w-40 flex-shrink-0">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-700">Workload</span>
                        <span className="text-xs font-medium text-slate-500">{workloadStyles[currentWorkload].label}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${workloadStyles[currentWorkload].bg}`} style={{ width: `${workloadValue}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const UserManagement: React.FC = () => {
    const { user: currentUser, impersonateUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [view, setView] = useState<'card' | 'table'>('card');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
    const [managerId, setManagerId] = useState<string | undefined>(undefined);
    const [departmentIds, setDepartmentIds] = useState<string[]>([]);
    const [companyId, setCompanyId] = useState<string | undefined>(undefined);
    const [rating, setRating] = useState(0);

    const loadData = useCallback(() => {
        setIsLoading(true);
        try {
            setUsers(AuthService.getUsers());
            setManagers(AuthService.getManagers());
            setCompanies(DataService.getCompanies());
        } catch (error) {
            console.error("Failed to load user data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const apiDepartments = await DataService.getDepartments();
                setDepartments(apiDepartments);
            } catch (error) {
                console.error("Failed to fetch departments for user management:", error);
            }
        };
        fetchDepartments();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const searchMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const roleMatch = roleFilter === 'all' || u.role === roleFilter;
            return searchMatch && roleMatch;
        });
    }, [users, searchTerm, roleFilter]);

    const resetForm = useCallback(() => {
        setName('');
        setEmail('');
        setPassword('');
        setRole(UserRole.EMPLOYEE);
        setManagerId(managers.length > 0 ? managers[0].id : undefined);
        setEditingUser(null);
        setDepartmentIds([]);
        setCompanyId(companies.length > 0 ? companies[0].id : undefined);
        setRating(0);
    }, [managers, companies]);

    const handleOpenCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (userToEdit: User) => {
        setEditingUser(userToEdit);
        setName(userToEdit.name);
        setEmail(userToEdit.email);
        setPassword(''); // Don't show password
        setRole(userToEdit.role);
        setManagerId(userToEdit.managerId);
        setDepartmentIds(userToEdit.departmentIds || []);
        setCompanyId(userToEdit.companyId);
        setRating(userToEdit.rating || 0);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            AuthService.deleteUser(userId);
            loadData();
        }
    };

    const handleImpersonate = async (userId: string) => {
        try {
            await impersonateUser(userId);
            navigate('/');
        } catch (error) {
            console.error("Impersonation failed", error);
            alert("Could not log in as this user.");
        }
    };

    const handleDepartmentToggle = (deptId: string) => {
        setDepartmentIds(prev => {
            const newIds = new Set(prev);
            if (newIds.has(deptId)) {
                newIds.delete(deptId);
            } else {
                newIds.add(deptId);
            }
            return Array.from(newIds);
        });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const updates: Partial<User> = { 
                    name, 
                    role, 
                    departmentIds,
                    companyId,
                    managerId: role === UserRole.EMPLOYEE ? managerId : undefined,
                    rating: rating,
                };
                AuthService.updateUser(editingUser.id, updates);
            } else {
                if (!password) {
                    alert("Password is required for new users.");
                    return;
                }
                // Register first, which creates a default user
                await AuthService.register({ name, email, password });
                // Then, find that user and update them with the details from the form
                const newUser = AuthService.getUsers().find(u => u.email === email);
                if (newUser) {
                    AuthService.updateUser(newUser.id, {
                        role,
                        departmentIds,
                        companyId,
                        managerId: role === UserRole.EMPLOYEE ? managerId : undefined,
                    });
                }
            }
            loadData();
            handleCloseModal();
        } catch(err) {
            alert(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    if (!currentUser || ![UserRole.ADMIN, UserRole.HR].includes(currentUser.role)) {
        return <Navigate to="/" />;
    }
    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Employees</h1>
                <Button onClick={handleOpenCreateModal}>Add Employee</Button>
            </div>
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full md:w-auto md:flex-1"></div>
                <div className="w-full md:w-64">
                    <ViewSwitcher view={view} setView={setView} />
                </div>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md">
                        <option value="all">All Roles</option>
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            {view === 'card' ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredUsers.map(user => {
                        const company = companies.find(c => c.id === user.companyId);
                        return (<UserCard 
                            key={user.id} 
                            user={user} 
                            companyName={company?.name} 
                            onEdit={handleOpenEditModal} 
                            onDelete={handleDeleteUser}
                            onImpersonate={handleImpersonate}
                            currentUser={currentUser}
                        />);
                    })}
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                         <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Job Title</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rating</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                const company = companies.find(c => c.id === user.companyId);
                                return (
                                <tr key={user.id} onClick={() => navigate(`/users/${user.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 font-semibold whitespace-no-wrap">{user.name}</p>
                                        <p className="text-slate-600 whitespace-no-wrap">{user.email}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{user.jobTitle}</p>
                                        <p className="text-slate-600 whitespace-no-wrap text-xs">{user.departmentIds?.map(id => departments.find(d => d.id === id)?.name).join(', ')}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{company?.name || 'N/A'}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm"><span className="capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">{user.role}</span></td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        {user.rating !== undefined ? <StarRating rating={user.rating} /> : <span className="text-slate-400">Not Rated</span>}
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(user); }} className="text-slate-500 hover:text-indigo-600"><EditIcon /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }} className="text-slate-500 hover:text-red-600"><TrashIcon /></button>
                                            {currentUser?.role === UserRole.ADMIN && currentUser.id !== user.id && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleImpersonate(user.id); }}
                                                    className="text-slate-500 hover:text-green-600"
                                                    title={`Log in as ${user.name}`}
                                                >
                                                    <LoginIcon />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredUsers.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Employees Found</h3>
                    <p className="text-slate-500 mt-2">No users match the current search or filter criteria.</p>
                </div>
            )}

            <Modal title={editingUser ? "Edit User" : "Add New Employee"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input id="name" type="text" label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                    <Input id="email" type="email" label="Email Address" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingUser} />
                    {!editingUser && <Input id="password" type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} required />}
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-700">Role</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                             {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                        <select id="company" value={companyId || ''} onChange={e => setCompanyId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                            <option value="">No Company</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Departments</label>
                        <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded-md p-2 max-h-32 overflow-y-auto">
                            {departments.length > 0 ? departments.map(dept => (
                                <div key={dept.id} className="flex items-center">
                                    <input
                                        id={`dept-${dept.id}`}
                                        type="checkbox"
                                        checked={departmentIds.includes(dept.id)}
                                        onChange={() => handleDepartmentToggle(dept.id)}
                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`dept-${dept.id}`} className="ml-2 block text-sm text-slate-800">
                                        {dept.name}
                                    </label>
                                </div>
                            )) : <p className="text-sm text-slate-500">Loading departments...</p>}
                        </div>
                    </div>

                    {role === UserRole.EMPLOYEE && (
                        <div>
                            <label htmlFor="manager" className="block text-sm font-medium text-slate-700">Assign Manager</label>
                            <select id="manager" value={managerId || ''} onChange={e => setManagerId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                                <option value="">No Manager</option>
                                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {editingUser && (
                        <Input
                            id="rating"
                            label="Performance Rating (0-10)"
                            type="number"
                            value={rating}
                            onChange={(e) => setRating(parseFloat(e.target.value))}
                            min="0"
                            max="10"
                            step="0.1"
                        />
                    )}

                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border">Cancel</button>
                        <Button type="submit">{editingUser ? "Save Changes" : "Create Employee"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagement;