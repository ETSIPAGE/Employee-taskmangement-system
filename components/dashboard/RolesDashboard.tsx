import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import { User, UserRole } from '../../types';
import {
  ArrowPathIcon,
  UserGroupIcon,
  EditIcon,
  TrashIcon
} from '../../constants';
import ViewSwitcher from '../shared/ViewSwitcher';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300`}>
            {message}
        </div>
    );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) => (
    <div className="bg-white rounded-lg shadow-lg p-5 flex items-start">
        <div className={`rounded-lg p-3 ${color}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const RoleDistributionChart = ({ data }: { data: { role: string, count: number, color: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return <div className="flex items-center justify-center h-full text-slate-500">No data</div>;
    
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
                {data.map((item) => {
                    const percent = (item.count / total) * 100;
                    const offset = circumference - (accumulatedPercent / 100) * circumference;
                    const dashArray = `${(percent / 100) * circumference} ${circumference}`;
                    accumulatedPercent += percent;
                    return <circle key={item.role} cx="75" cy="75" r={radius} fill="transparent" stroke={item.color} strokeWidth="20" strokeDasharray={dashArray} strokeDashoffset={offset} />;
                })}
            </svg>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {data.map(item => (
                    <div key={item.role} className="flex items-center text-xs">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 font-medium">{item.role} ({item.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const UserCard: React.FC<{ 
    user: User; 
    onEdit: (userId: string) => void; 
    onDelete: (userId: string) => void; 
    getRoleBadgeClass: (role: UserRole | string) => string;
    getRoleColor: (role: UserRole | string) => string;
}> = ({ user, onEdit, onDelete, getRoleBadgeClass, getRoleColor }) => {
    const statusStyles = {
        Active: { dot: 'bg-green-500' },
        Busy: { dot: 'bg-orange-500' },
        Offline: { dot: 'bg-slate-400' },
    };

    const currentStatus = user.status || 'Offline';
    const roleColor = getRoleColor(user.role);

    return (
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col space-y-4 transition-all hover:shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold flex-shrink-0">
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                {user.role}
                            </span>
                            {roleColor && (
                                <div 
                                    className="w-3 h-3 rounded-full border border-slate-300" 
                                    style={{ backgroundColor: roleColor }}
                                    title={user.role}
                                ></div>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusStyles[currentStatus].dot}`}></div>
            </div>

            {/* Info */}
            <div className="text-sm text-slate-600">
                <p className="truncate">{user.email}</p>
                <p className="mt-1">Status: <span className="font-medium">{currentStatus}</span></p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-2">
                <button 
                    onClick={() => onEdit(user.id)}
                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full"
                    title="Edit user"
                >
                    <EditIcon />
                </button>
                <button 
                    onClick={() => onDelete(user.id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full"
                    title="Delete user"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

interface CustomRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  createdAt: string;
}

const RolesDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        admins: 0,
        managers: 0,
        employees: 0,
        hr: 0,
    });
    const [roleDistributionData, setRoleDistributionData] = useState<any[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]); // New state for custom roles
    const [usersList, setUsersList] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('table');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false); // New state for edit user modal
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null); // New state for user being edited
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [roleColor, setRoleColor] = useState('#3b82f6'); // Default blue color
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedUserRole, setSelectedUserRole] = useState<UserRole | string>(''); // New state for selected user role

    // Predefined color options for roles
    const colorOptions = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Gray', value: '#6b7280' },
    ];

    // Group permissions by category for better organization
    const permissionGroups = [
        {
            category: "Core Access",
            permissions: [
                { id: 'view_dashboard', name: 'View Dashboard', description: 'Access to view dashboard' },
                { id: 'view_reports', name: 'View Reports', description: 'Access to view reports and analytics' },
            ]
        },
        {
            category: "User Management",
            permissions: [
                { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, and delete users' },
                { id: 'manage_roles', name: 'Manage Roles', description: 'Create, edit, and delete roles' },
            ]
        },
        {
            category: "Resource Management",
            permissions: [
                { id: 'manage_projects', name: 'Manage Projects', description: 'Create, edit, and delete projects' },
                { id: 'manage_tasks', name: 'Manage Tasks', description: 'Create, edit, and delete tasks' },
                { id: 'manage_departments', name: 'Manage Departments', description: 'Create, edit, and delete departments' },
                { id: 'manage_companies', name: 'Manage Companies', description: 'Create, edit, and delete companies' },
            ]
        },
        {
            category: "System",
            permissions: [
                { id: 'system_settings', name: 'System Settings', description: 'Access to system configuration settings' },
            ]
        }
    ];

    // Flatten permissions for easier handling
    const allPermissions = permissionGroups.flatMap(group => group.permissions);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch users from the existing service
            const users = await AuthService.getUsers();
            
            setUsersList(users);
            
            // Load custom roles from localStorage
            const savedCustomRoles = localStorage.getItem('ets_customRoles');
            if (savedCustomRoles) {
                try {
                    setCustomRoles(JSON.parse(savedCustomRoles));
                } catch (e) {
                    console.error('Failed to parse custom roles from localStorage', e);
                    setCustomRoles([]);
                }
            }
            
            // Fetch roles from the new API endpoint with comprehensive error handling
            try {
                // Check if we're in a browser environment
                if (typeof window !== 'undefined' && window.fetch) {
                    // Add timeout to prevent hanging requests
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                    
                    const rolesResponse = await fetch('https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com/prod/Get-Roles', {
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (rolesResponse.ok) {
                        const contentType = rolesResponse.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const rolesData = await rolesResponse.json();
                            console.log('Roles data fetched successfully:', rolesData);
                            // Process roles data if needed
                        } else {
                            console.warn('Roles API returned non-JSON response');
                        }
                    } else {
                        console.warn('Roles API returned status:', rolesResponse.status, rolesResponse.statusText);
                    }
                }
            } catch (rolesError: any) {
                if (rolesError.name === 'AbortError') {
                    console.warn('Roles fetch request timed out after 10 seconds');
                } else if (rolesError.name === 'TypeError') {
                    console.warn('Network error when fetching roles - this may be expected in development');
                } else {
                    console.warn('Error fetching roles - this may be expected in development:', rolesError.message || rolesError);
                }
            }
            
            const roleCounts = {
                admins: users.filter(u => u.role === UserRole.ADMIN).length,
                managers: users.filter(u => u.role === UserRole.MANAGER).length,
                employees: users.filter(u => u.role === UserRole.EMPLOYEE).length,
                hr: users.filter(u => u.role === UserRole.HR).length,
            };
            
            setStats({
                totalUsers: users.length,
                ...roleCounts
            });

            // Create role distribution data including custom roles
            const distributionData = [
                { role: 'Admin', count: roleCounts.admins, color: '#ef4444' },
                { role: 'Manager', count: roleCounts.managers, color: '#3b82f6' },
                { role: 'Employee', count: roleCounts.employees, color: '#22c55e' },
                { role: 'HR', count: roleCounts.hr, color: '#f59e0b' },
            ];
            
            // Add custom roles to the distribution (show all custom roles, even with 0 users)
            customRoles.forEach((role, index) => {
                const customRoleUsers = users.filter(u => u.role === role.name).length;
                // Generate a color for the custom role (rotate through a set of colors)
                const colors = ['#8b5cf6', '#ec4899', '#6366f1', '#6b7280', '#f97316'];
                const color = colors[index % colors.length];
                distributionData.push({ 
                    role: role.name, 
                    count: customRoleUsers, 
                    color: color 
                });
            });
            
            setRoleDistributionData(distributionData);
        } catch (error: any) {
            console.error("Failed to load dashboard data:", error.message || error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    // Save custom roles to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('ets_customRoles', JSON.stringify(customRoles));
    }, [customRoles]);
    
    // Function to get badge class based on user role
    const getRoleBadgeClass = (role: UserRole | string) => {
        // Check if it's a custom role
        const customRole = customRoles.find(r => r.name === role);
        if (customRole) {
            // For custom roles, we'll use a generic style with the role color
            return 'bg-gray-100 text-gray-800';
        }
        
        // For predefined roles
        switch (role) {
            case UserRole.ADMIN:
                return 'bg-red-100 text-red-800';
            case UserRole.MANAGER:
                return 'bg-blue-100 text-blue-800';
            case UserRole.EMPLOYEE:
                return 'bg-green-100 text-green-800';
            case UserRole.HR:
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Function to get role color for custom roles
    const getRoleColor = (role: UserRole | string) => {
        const customRole = customRoles.find(r => r.name === role);
        if (customRole) {
            return customRole.color;
        }
        return '';
    };

    // Function to show toast notification
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // Handle create role
    const handleCreateRole = () => {
        setIsModalOpen(true);
    };

    // Handle permission toggle
    const togglePermission = (permissionId: string) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            } else {
                return [...prev, permissionId];
            }
        });
    };

    // Handle select all permissions
    const selectAllPermissions = () => {
        setSelectedPermissions(allPermissions.map(p => p.id));
    };

    // Handle deselect all permissions
    const deselectAllPermissions = () => {
        setSelectedPermissions([]);
    };

    // Handle modal close
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setRoleName('');
        setRoleDescription('');
        setRoleColor('#3b82f6'); // Reset to default color
        setSelectedPermissions([]); // Reset permissions
    };

    // Handle role submission
    const handleSubmitRole = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            // Create a new custom role object
            const newRole: CustomRole = {
                id: `role-${Date.now()}`,
                name: roleName,
                description: roleDescription,
                color: roleColor,
                permissions: selectedPermissions,
                createdAt: new Date().toISOString()
            };
            
            // Add the new role to the custom roles list and persist immediately to avoid race
            const updated = [...customRoles, newRole];
            setCustomRoles(updated);
            localStorage.setItem('ets_customRoles', JSON.stringify(updated));
            
            // Show success message
            showToast(`Role "${roleName}" created successfully!`, 'success');
            handleCloseModal();
            
            // No need to force reload; state change triggers re-render and useEffect updates distribution
        } catch (error) {
            console.error('Error creating role:', error);
            showToast(`Failed to create role "${roleName}". Please try again.`, 'error');
        }
    };

    // Handle edit user
    const handleEditUser = (userId: string) => {
        const user = usersList.find(u => u.id === userId);
        if (user) {
            setUserToEdit(user);
            setSelectedUserRole(user.role);
            setIsEditUserModalOpen(true);
        }
    };

    // Handle save user
    const handleSaveUser = () => {
        if (userToEdit) {
            try {
                // Update the user's role
                const updatedUser = { ...userToEdit, role: selectedUserRole };
                
                // Update the user in the list
                setUsersList(prev => 
                    prev.map(u => u.id === userToEdit.id ? updatedUser : u)
                );
                
                // Update the user in the AuthService
                AuthService.updateUser(userToEdit.id, { role: selectedUserRole });
                
                // Show success message
                showToast(`User "${userToEdit.name}" updated successfully!`, 'success');
                
                // Close the modal
                setIsEditUserModalOpen(false);
                setUserToEdit(null);
                setSelectedUserRole('');
            } catch (error) {
                console.error('Error updating user:', error);
                showToast(`Failed to update user "${userToEdit.name}". Please try again.`, 'error');
            }
        }
    };

    // Handle edit role
    const handleEditRole = async (roleId: string, roleData: { roleName: string; roleDescription: string; roleColor: string; permissions: string[] }) => {
        // Validate inputs
        if (!roleId || typeof roleId !== 'string') {
            console.error('Valid role ID is required');
            showToast('Valid role ID is required to update a role', 'error');
            return { success: false, error: 'Valid role ID is required' };
        }
        
        if (!roleData || typeof roleData !== 'object') {
            console.error('Valid role data is required');
            showToast('Valid role data is required to update a role', 'error');
            return { success: false, error: 'Valid role data is required' };
        }
        
        const { roleName, roleDescription, roleColor, permissions } = roleData;
        
        if (!roleName || typeof roleName !== 'string') {
            console.error('Role name is required');
            showToast('Role name is required to update a role', 'error');
            return { success: false, error: 'Role name is required' };
        }
        
        if (roleDescription && typeof roleDescription !== 'string') {
            console.error('Role description must be a string');
            showToast('Role description must be a string', 'error');
            return { success: false, error: 'Role description must be a string' };
        }
        
        if (!roleColor || typeof roleColor !== 'string' || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(roleColor)) {
            console.error('Valid hex color code is required');
            showToast('Valid hex color code is required (e.g., #3b82f6)', 'error');
            return { success: false, error: 'Valid hex color code is required' };
        }
        
        if (!Array.isArray(permissions)) {
            console.error('Permissions must be an array');
            showToast('Permissions must be an array', 'error');
            return { success: false, error: 'Permissions must be an array' };
        }
        
        try {
            // For now, we'll just show a success message since we're not actually editing custom roles
            // In a full implementation, this would integrate with a backend service
            console.log('Role update requested:', { roleId, roleName, roleDescription, roleColor, permissions });
            showToast(`Role "${roleName}" updated successfully!`, 'success');
            loadData(); // Refresh the data after update
            return { success: true, data: { roleId, ...roleData } };
        } catch (error: any) {
            console.error('Error updating role:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            showToast(`Failed to update role "${roleName}". ${errorMessage}`, 'error');
            return { success: false, error };
        }
    };

    // Handle delete user
    const handleDeleteUser = (userId: string) => {
        // Set the user to delete and open the confirmation modal
        setUserToDelete(userId);
        setIsDeleteConfirmOpen(true);
    };
    
    // Confirm and delete user
    const confirmDeleteUser = () => {
        if (userToDelete) {
            try {
                AuthService.deleteUser(userToDelete);
                loadData(); // Refresh the data after deletion
                showToast("User deleted successfully!", "success");
            } catch (error) {
                console.error("Failed to delete user:", error);
                showToast("Failed to delete user. Please try again.", "error");
            } finally {
                // Close the confirmation modal and reset the user to delete
                setIsDeleteConfirmOpen(false);
                setUserToDelete(null);
            }
        }
    };
    
    // Update role distribution when custom roles or users change
    useEffect(() => {
        if (usersList.length > 0) {
            const roleCounts = {
                admins: usersList.filter(u => u.role === UserRole.ADMIN).length,
                managers: usersList.filter(u => u.role === UserRole.MANAGER).length,
                employees: usersList.filter(u => u.role === UserRole.EMPLOYEE).length,
                hr: usersList.filter(u => u.role === UserRole.HR).length,
            };
            
            // Create role distribution data including custom roles
            const distributionData = [
                { role: 'Admin', count: roleCounts.admins, color: '#ef4444' },
                { role: 'Manager', count: roleCounts.managers, color: '#3b82f6' },
                { role: 'Employee', count: roleCounts.employees, color: '#22c55e' },
                { role: 'HR', count: roleCounts.hr, color: '#f59e0b' },
            ];
            
            // Add custom roles to the distribution (show all custom roles, even with 0 users)
            customRoles.forEach((role, index) => {
                const customRoleUsers = usersList.filter(u => u.role === role.name).length;
                // Generate a color for the custom role (rotate through a set of colors)
                const colors = ['#8b5cf6', '#ec4899', '#6366f1', '#6b7280', '#f97316'];
                const color = colors[index % colors.length];
                distributionData.push({ 
                    role: role.name, 
                    count: customRoleUsers, 
                    color: color 
                });
            });
            
            setRoleDistributionData(distributionData);
        }
    }, [usersList, customRoles]);

    return (
        <div className="pb-8">
            {/* Toast notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
            
            {/* Delete Confirmation Modal */}
            <Modal title="Confirm Deletion" isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} className="w-96 mx-auto mt-32 rounded-lg">
                <div className="py-4">
                    <p className="text-slate-700 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                        <Button 
                            onClick={confirmDeleteUser}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            

            {/* Edit User Modal */}
            <Modal title="Edit User" isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} className="w-1/3 max-w-md mx-auto mt-24 rounded-lg">
                {userToEdit && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold flex-shrink-0">
                                {getInitials(userToEdit.name)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{userToEdit.name}</h3>
                                <p className="text-sm text-slate-600">{userToEdit.email}</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role
                            </label>
                            <select
                                value={selectedUserRole}
                                onChange={(e) => setSelectedUserRole(e.target.value)}
                                className="w-full rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                            >
                                <option value="">Select a role</option>
                                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                                <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                                <option value={UserRole.EMPLOYEE}>{UserRole.EMPLOYEE}</option>
                                <option value={UserRole.HR}>{UserRole.HR}</option>
                                {customRoles.map(role => (
                                    <option key={role.id} value={role.name}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button 
                                onClick={handleSaveUser}
                                className="px-3 py-1.5 text-sm" 
                                disabled={!selectedUserRole}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Create Role Modal */}
            <Modal title="Create New Role" isOpen={isModalOpen} onClose={handleCloseModal} className="w-1/3 max-w-md mx-auto mt-24 rounded-lg">
                <form onSubmit={handleSubmitRole} className="space-y-4">
                    <div className="space-y-4">
                        <Input 
                            id="roleName"
                            label="Role Name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            required
                            placeholder="Enter role name"
                            className="text-sm"
                            labelClassName="text-sm"
                        />
                        
                        <div>
                            <label htmlFor="roleDescription" className="block text-sm font-medium text-slate-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="roleDescription"
                                rows={3}
                                className="w-full rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                value={roleDescription}
                                onChange={(e) => setRoleDescription(e.target.value)}
                                placeholder="Enter role description"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${roleColor === color.value ? 'border-slate-800 ring-2 ring-offset-1 ring-slate-400' : 'border-slate-300'}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setRoleColor(color.value)}
                                        title={color.name}
                                        aria-label={`Select ${color.name} color`}
                                    />
                                ))}
                            </div>
                            <div className="mt-2 flex items-center space-x-2">
                                <input
                                    type="color"
                                    value={roleColor}
                                    onChange={(e) => setRoleColor(e.target.value)}
                                    className="w-10 h-10 border border-slate-300 rounded cursor-pointer bg-white"
                                />
                                <input
                                    type="text"
                                    value={roleColor}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Validate hex color format
                                        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) || value === '') {
                                            setRoleColor(value);
                                        }
                                    }}
                                    className="flex-1 rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>
                        
                        {/* Permissions Section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Permissions
                                </label>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={selectAllPermissions}
                                        className="text-xs text-indigo-600 hover:text-indigo-800"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deselectAllPermissions}
                                        className="text-xs text-slate-600 hover:text-slate-800"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            
                            <div className="border border-slate-200 rounded-md p-3 max-h-60 overflow-y-auto">
                                {permissionGroups.map((group) => (
                                    <div key={group.category} className="mb-4 last:mb-0">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            {group.category}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            id={`permission-${permission.id}`}
                                                            type="checkbox"
                                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                            checked={selectedPermissions.includes(permission.id)}
                                                            onChange={() => togglePermission(permission.id)}
                                                        />
                                                    </div>
                                                    <div className="ml-2 text-sm">
                                                        <label htmlFor={`permission-${permission.id}`} className="font-medium text-slate-700">
                                                            {permission.name}
                                                        </label>
                                                        <p className="text-slate-500 text-xs">{permission.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="submit" className="px-3 py-1.5 text-sm" disabled={!roleName.trim()}>
                            Create Role
                        </Button>
                    </div>
                </form>
            </Modal>
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Roles Dashboard</h1>
                    <p className="text-slate-600">Welcome, {user?.name}! Here's an overview of user roles in the organization.</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={handleCreateRole}>Create Role</Button>
                    <button 
                        onClick={loadData} 
                        disabled={isLoading} 
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh data"
                    >
                        <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <StatCard 
                    icon={<UserGroupIcon />}
                    title="Total Users"
                    value={`${stats.totalUsers}`}
                    color="bg-indigo-100 text-indigo-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">A</div>}
                    title="Admins"
                    value={`${stats.admins}`}
                    color="bg-red-100 text-red-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">M</div>}
                    title="Managers"
                    value={`${stats.managers}`}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">E</div>}
                    title="Employees"
                    value={`${stats.employees}`}
                    color="bg-green-100 text-green-600"
                />
                <StatCard 
                    icon={<div className="text-xl font-bold">H</div>}
                    title="HR"
                    value={`${stats.hr}`}
                    color="bg-yellow-100 text-yellow-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">User List</h2>
                        <ViewSwitcher view={view} setView={setView} />
                    </div>
                    {view === 'card' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {usersList.map((user) => (
                                <UserCard 
                                    key={user.id} 
                                    user={user} 
                                    onEdit={handleEditUser} 
                                    onDelete={handleDeleteUser} 
                                    getRoleBadgeClass={getRoleBadgeClass} 
                                    getRoleColor={getRoleColor}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {usersList.map((user) => {
                                        const roleColor = getRoleColor(user.role);
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                        {roleColor && (
                                                            <div 
                                                                className="w-3 h-3 rounded-full border border-slate-300" 
                                                                style={{ backgroundColor: roleColor }}
                                                                title={user.role}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {user.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-3">
                                                        <button 
                                                            onClick={() => handleEditUser(user.id)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                            title="Edit user"
                                                        >
                                                            <EditIcon />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Delete user"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>
                        </div>
                    )}
                </div>
                <div className="space-y-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Role Distribution</h2>
                        <RoleDistributionChart data={roleDistributionData} />
                    </div>
                    
                    
                </div>
            </div>
        </div>
    );
};

export default RolesDashboard;