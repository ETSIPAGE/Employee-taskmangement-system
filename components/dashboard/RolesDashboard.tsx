import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import { CustomRole, RoleCreatePayload, RoleUpdatePayload } from '../../services/apiService';
import { UserRole, User } from '../../types';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, UsersIcon, ChartBarIcon, UserCircleIcon, PlusIcon, EditIcon, TrashIcon } from '../../constants';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface RoleStats {
  role: UserRole | string;
  count: number;
  users: User[];
  color: string;
  bgColor: string;
  description: string;
  isCustom?: boolean;
  customRoleData?: CustomRole; // Add the full custom role data
}

const StatCard = ({ icon, title, value, color, bgColor }: { 
  icon: React.ReactNode, 
  title: string, 
  value: string, 
  color: string,
  bgColor: string
}) => (
  <div className="bg-white rounded-lg shadow-lg p-5 flex items-start">
    <div className={`rounded-lg p-3 ${bgColor} ${color}`}>
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const RoleCard: React.FC<{ 
  roleStats: RoleStats, 
  isSelected: boolean, 
  onClick: () => void,
  onEdit?: (role: CustomRole) => void,
  onDelete?: (role: CustomRole) => void
}> = ({ roleStats, isSelected, onClick, onEdit, onDelete }) => (
  <div className={`rounded-xl shadow-lg p-5 transition-all duration-200 ${
    isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-white hover:shadow-xl'
  }`}>
    {roleStats.isCustom && (
      <div className="flex justify-end space-x-1 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit && onEdit(roleStats.customRoleData!);
          }}
          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Edit Role"
        >
          <EditIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete && onDelete(roleStats.customRoleData!);
          }}
          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
          title="Delete Role"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    )}
    
    <div onClick={onClick}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-4 h-4 rounded-full ${roleStats.bgColor}`}></div>
        <span className="text-3xl font-bold text-slate-800">{roleStats.count}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        {roleStats.role}
        {roleStats.isCustom && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
            Custom
          </span>
        )}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">{roleStats.description}</p>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${roleStats.bgColor}`}
          style={{ width: `${Math.min(roleStats.count * 20, 100)}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const UserListItem: React.FC<{ user: User, roleColor: string }> = ({ user, roleColor }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
    <div className="flex items-center space-x-4">
      <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
        <UserCircleIcon />
      </div>
      <div>
        <h3 className="font-medium text-slate-800">{user.name}</h3>
        <p className="text-sm text-slate-500">{user.email}</p>
        {user.jobTitle && (
          <p className="text-xs text-slate-400">{user.jobTitle}</p>
        )}
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${roleColor}`}></div>
        <span className="text-sm font-medium text-slate-700">{user.role}</span>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        user.status === 'Active' 
          ? 'bg-green-100 text-green-800'
          : user.status === 'Busy'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-slate-100 text-slate-600'
      }`}>
        {user.status || 'Active'}
      </div>
    </div>
  </div>
);

const RolesDashboard: React.FC = () => {
  const { user } = useAuth();
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [pendingDeleteRole, setPendingDeleteRole] = useState<CustomRole | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'checking' | 'connected' | 'auth_required' | 'failed'>('checking');
  const [apiKey, setApiKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const allUsers = AuthService.getUsers();
      setUsers(allUsers);
      
      // Simplified API approach with proper error handling
      let loadedCustomRoles: CustomRole[] = [];
      
      try {
        // Import apiService for role operations
        const { apiService } = await import('../../services/apiService');
        
        // Configure authentication if available (silently)
        const savedApiKey = localStorage.getItem('role_api_key');
        const savedBearerToken = localStorage.getItem('role_bearer_token');
        
        if (savedApiKey || savedBearerToken) {
          apiService.configureRoleAPIAuth(savedApiKey || undefined, savedBearerToken || undefined);
        }
        
        // Single API call with timeout
        console.log('🔄 Loading roles from API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const apiResult = await apiService.getRoles();
        clearTimeout(timeoutId);
        
        if (apiResult.success && Array.isArray(apiResult.data)) {
          loadedCustomRoles = apiResult.data;
          console.log('✅ API connected successfully:', loadedCustomRoles.length, 'roles');
          setApiConnectionStatus('connected');
          
          // Sync to localStorage
          localStorage.setItem('custom_roles', JSON.stringify(loadedCustomRoles));
        } else {
          throw new Error(apiResult.error || 'API returned invalid data');
        }
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.warn('⚠️ API failed:', errorMessage);
        
        // Enhanced 403 detection
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          setApiConnectionStatus('auth_required');
          console.log('🔐 403 FORBIDDEN: Authentication required for API access');
          console.log('📝 API Endpoint:', 'https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod');
          console.log('🔑 Solution: Configure API Key or Bearer Token for authentication');
        } else {
          setApiConnectionStatus('failed');
          console.log('🚫 API connection failed, using local storage');
        }
        
        // Load from localStorage as fallback
        const savedCustomRoles = localStorage.getItem('custom_roles');
        loadedCustomRoles = savedCustomRoles ? JSON.parse(savedCustomRoles) : [];
      }
      
      setCustomRoles(loadedCustomRoles);

      // Define role information
      const roleInfo = {
        [UserRole.ADMIN]: { 
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-500', 
          description: 'System administrators with full access' 
        },
        [UserRole.MANAGER]: { 
          color: 'text-sky-600',
          bgColor: 'bg-sky-500', 
          description: 'Team leaders managing projects and employees' 
        },
        [UserRole.EMPLOYEE]: { 
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-500', 
          description: 'Regular employees working on assigned tasks' 
        },
        [UserRole.HR]: { 
          color: 'text-rose-600',
          bgColor: 'bg-rose-500', 
          description: 'Human resources managing employee lifecycle' 
        },
        [UserRole.PARENT]: { 
          color: 'text-amber-600',
          bgColor: 'bg-amber-500', 
          description: 'Parents monitoring student progress' 
        },
      };

      // Calculate role statistics for built-in roles
      const builtInStats: RoleStats[] = Object.values(UserRole).map(role => {
        const roleUsers = allUsers.filter(u => u.role === role);
        return {
          role,
          count: roleUsers.length,
          users: roleUsers,
          color: roleInfo[role].color,
          bgColor: roleInfo[role].bgColor,
          description: roleInfo[role].description,
          isCustom: false,
        };
      });
      
      // Calculate role statistics for custom roles
      const customStats: RoleStats[] = loadedCustomRoles
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Sort by creation date (newest first)
        .map(customRole => {
          const roleUsers = allUsers.filter(u => u.role === customRole.name);
          return {
            role: customRole.name,
            count: roleUsers.length,
            users: roleUsers,
            color: `text-${customRole.color}-600`,
            bgColor: customRole.bgColor,
            description: customRole.description,
            isCustom: true,
            customRoleData: customRole, // Include the full custom role data
          };
        });
      
      // Combine built-in and custom roles, with custom roles appearing first
      setRoleStats([...customStats, ...builtInStats]);
    } catch (error) {
      console.error('Error loading role data:', error);
      toast.error('Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load stored authentication credentials
    const savedApiKey = localStorage.getItem('role_api_key');
    const savedBearerToken = localStorage.getItem('role_bearer_token');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedBearerToken) setBearerToken(savedBearerToken);
    
    loadData();
  }, [loadData]);

  const filteredUsers = selectedRole 
    ? users.filter(u => u.role === selectedRole)
    : users;
    
  const availablePermissions = [
    'view_dashboard',
    'manage_users',
    'manage_projects',
    'manage_tasks',
    'manage_departments',
    'manage_companies',
    'view_reports',
    'manage_roles',
    'system_settings'
  ];
  
  const colorOptions = [
    { name: 'indigo', bgColor: 'bg-indigo-500', textColor: 'text-indigo-600' },
    { name: 'blue', bgColor: 'bg-blue-500', textColor: 'text-blue-600' },
    { name: 'green', bgColor: 'bg-green-500', textColor: 'text-green-600' },
    { name: 'yellow', bgColor: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { name: 'red', bgColor: 'bg-red-500', textColor: 'text-red-600' },
    { name: 'purple', bgColor: 'bg-purple-500', textColor: 'text-purple-600' },
    { name: 'pink', bgColor: 'bg-pink-500', textColor: 'text-pink-600' },
    { name: 'gray', bgColor: 'bg-gray-500', textColor: 'text-gray-600' },
  ];

  const totalUsers = users.length;
  const activeRoles = roleStats.filter(r => r.count > 0).length;
  
  const saveCustomRoles = (roles: CustomRole[]) => {
    localStorage.setItem('custom_roles', JSON.stringify(roles));
    setCustomRoles(roles);
  };
  
  const configureAPIAuthentication = async () => {
    if (!apiKey.trim() && !bearerToken.trim()) {
      toast.error('⚠️ Please provide at least one authentication credential');
      return;
    }
    
    try {
      const { apiService } = await import('../../services/apiService');
      
      // Configure authentication
      apiService.configureRoleAPIAuth(
        apiKey.trim() || undefined,
        bearerToken.trim() || undefined
      );
      
      // Store credentials
      if (apiKey.trim()) {
        localStorage.setItem('role_api_key', apiKey.trim());
        console.log('🔑 API Key configured and stored');
      }
      if (bearerToken.trim()) {
        localStorage.setItem('role_bearer_token', bearerToken.trim());
        console.log('🎩 Bearer Token configured and stored');
      }
      
      console.log('🔗 Testing API connection with authentication...');
      const loadingToastId = toast.loading('🔗 Testing API connection...');
      
      // Test the connection with a simple call
      const testResult = await apiService.testRoleAPI();
      
      if (testResult.success) {
        setApiConnectionStatus('connected');
        toast.update(loadingToastId, {
          render: '✅ Authentication successful! API connected.',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        console.log('✅ API authentication successful!');
        
        // Reload data with new authentication
        await loadData();
      } else {
        toast.update(loadingToastId, {
          render: testResult.error?.includes('403') 
            ? '❌ Authentication failed: Invalid credentials (403)'
            : `❌ Connection failed: ${testResult.error}`,
          type: 'error',
          isLoading: false,
          autoClose: 5000
        });
        
        if (!testResult.error?.includes('403')) {
          setApiConnectionStatus('failed');
        }
      }
    } catch (error) {
      console.error('Error configuring authentication:', error);
      toast.error('❌ Failed to configure authentication');
    }
  };
  
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoleName.trim()) {
      toast.error('Role name is required!');
      return;
    }
    
    if (!newRoleDescription.trim()) {
      toast.error('Role description is required!');
      return;
    }
    
    // Check if role name already exists
    const roleExists = [...Object.values(UserRole), ...customRoles.map(r => r.name)]
      .some(role => role.toLowerCase() === newRoleName.trim().toLowerCase());
      
    if (roleExists) {
      toast.error('A role with this name already exists!');
      return;
    }
    
    try {
      const selectedColorOption = colorOptions.find(c => c.name === selectedColor) || colorOptions[0];
      
      const newRole: CustomRole = {
        id: `custom-role-${Date.now()}`,
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        permissions: selectedPermissions,
        color: selectedColor,
        bgColor: selectedColorOption.bgColor,
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'unknown'
      };
      
      // Simplified API creation with single call
      if (apiConnectionStatus === 'connected') {
        const loadingToastId = toast.loading(`Creating role "${newRoleName}"...`);
        
        try {
          const { apiService } = await import('../../services/apiService');
          
          const apiResult = await apiService.createRole({
            name: newRole.name,
            description: newRole.description,
            permissions: newRole.permissions,
            color: newRole.color,
            bgColor: newRole.bgColor,
            createdBy: newRole.createdBy
          });
          
          if (apiResult.success) {
            console.log('✅ Role created via API');
            // Use the role returned from API if available, otherwise use local role
            const createdRole = apiResult.data || newRole;
            const updatedRoles = [...customRoles, createdRole];
            saveCustomRoles(updatedRoles);
            
            toast.update(loadingToastId, {
              render: `Role "${newRoleName}" created successfully!`,
              type: 'success',
              isLoading: false,
              autoClose: 3000
            });
          } else {
            throw new Error(apiResult.error || 'Creation failed');
          }
        } catch (apiError) {
          console.warn('⚠️ API creation failed:', apiError);
          
          // Fallback to localStorage
          const updatedRoles = [...customRoles, newRole];
          saveCustomRoles(updatedRoles);
          
          toast.update(loadingToastId, {
            render: `Role "${newRoleName}" created locally`,
            type: 'success',
            isLoading: false,
            autoClose: 3000
          });
        }
      } else {
        // Direct localStorage creation when API not connected
        const updatedRoles = [...customRoles, newRole];
        saveCustomRoles(updatedRoles);
        toast.success(`Role "${newRoleName}" created successfully!`);
      }
      
      // Reset form
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions([]);
      setSelectedColor('indigo');
      setIsCreateModalOpen(false);
      
      // Reload data to show new role
      loadData();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(`Failed to create role "${newRoleName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setNewRoleName(role.name);
    setNewRoleDescription(role.description);
    setSelectedPermissions(role.permissions);
    setSelectedColor(role.color);
    setIsEditModalOpen(true);
  };
  
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRole) return;
    
    if (!newRoleName.trim()) {
      toast.error('Role name is required!');
      return;
    }
    
    if (!newRoleDescription.trim()) {
      toast.error('Role description is required!');
      return;
    }
    
    try {
      const selectedColorOption = colorOptions.find(c => c.name === selectedColor) || colorOptions[0];
      
      const updatedRole: CustomRole = {
        ...editingRole,
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        permissions: selectedPermissions,
        color: selectedColor,
        bgColor: selectedColorOption.bgColor,
      };
      
      // Simplified API update
      if (apiConnectionStatus === 'connected') {
        try {
          const { apiService } = await import('../../services/apiService');
          
          console.log('[DEBUG] Calling updateRole with payload:', {
            id: editingRole.id,
            name: updatedRole.name,
            description: updatedRole.description,
            permissions: updatedRole.permissions,
            color: updatedRole.color,
            bgColor: updatedRole.bgColor
          });
          
          const apiResult = await apiService.updateRole({
            id: editingRole.id,
            name: updatedRole.name,
            description: updatedRole.description,
            permissions: updatedRole.permissions,
            color: updatedRole.color,
            bgColor: updatedRole.bgColor
          });
          
          console.log('[DEBUG] updateRole result:', apiResult);
          
          if (apiResult.success) {
            console.log('✅ Role updated via API');
            // Use the role returned from API if available, otherwise use local role
            const apiUpdatedRole = apiResult.data || updatedRole;
            const updatedRoles = customRoles.map(r => r.id === editingRole.id ? apiUpdatedRole : r);
            saveCustomRoles(updatedRoles);
            
            toast.success(`Role "${newRoleName}" updated successfully!`);
          } else {
            console.error('❌ API update failed:', apiResult.error);
            throw new Error(apiResult.error || 'Update failed');
          }
        } catch (apiError) {
          console.warn('⚠️ API update failed, saving locally:', apiError);
          console.error('Detailed error:', apiError instanceof Error ? apiError.message : 'Unknown error', apiError);
          const updatedRoles = customRoles.map(r => r.id === editingRole.id ? updatedRole : r);
          saveCustomRoles(updatedRoles);
          
          toast.success(`Role "${newRoleName}" updated locally!`);
        }
      } else {
        // Direct localStorage update when API not connected
        const updatedRoles = customRoles.map(r => r.id === editingRole.id ? updatedRole : r);
        saveCustomRoles(updatedRoles);
        toast.success(`Role "${newRoleName}" updated successfully!`);
      }
      
      // Reset form
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions([]);
      setSelectedColor('indigo');
      setEditingRole(null);
      setIsEditModalOpen(false);
      
      // Reload data to show updated role
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role "${newRoleName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleDeleteRole = (role: CustomRole) => {
    console.log('🗑️ Initiating delete process for role:', role);
    
    // Show confirmation toast instead of browser alert
    const confirmToastId = toast(
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <TrashIcon className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800">Delete Role</p>
            <p className="text-sm text-slate-600">Are you sure you want to delete "{role.name}"?</p>
          </div>
        </div>
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToastId);
            }}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(confirmToastId);
              executeDeleteRole(role);
            }}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: false,
        closeButton: false,
      }
    );
  };
  
  const executeDeleteRole = async (role: CustomRole) => {
    try {
      // Simplified API delete
      if (apiConnectionStatus === 'connected') {
        try {
          const { apiService } = await import('../../services/apiService');
          
          const apiResult = await apiService.deleteRole(role.id);
          
          if (apiResult.success) {
            console.log('✅ Role deleted via API');
            const updatedRoles = customRoles.filter(r => r.id !== role.id);
            saveCustomRoles(updatedRoles);
            
            toast.success(`Role "${role.name}" deleted successfully!`);
          } else {
            throw new Error(apiResult.error || 'Delete failed');
          }
        } catch (apiError) {
          console.warn('⚠️ API delete failed, deleting locally:', apiError);
          const updatedRoles = customRoles.filter(r => r.id !== role.id);
          saveCustomRoles(updatedRoles);
          
          toast.success(`Role "${role.name}" deleted locally!`);
        }
      } else {
        // Direct localStorage delete when API not connected
        const updatedRoles = customRoles.filter(r => r.id !== role.id);
        saveCustomRoles(updatedRoles);
        toast.success(`Role "${role.name}" deleted successfully!`);
      }
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(`Failed to delete role "${role.name}"`);
    }
  };
  
  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };
  
  const handleCloseCreateModal = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setSelectedPermissions([]);
    setSelectedColor('indigo');
    setIsCreateModalOpen(false);
  };
  
  const handleCloseEditModal = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setSelectedPermissions([]);
    setSelectedColor('indigo');
    setEditingRole(null);
    setIsEditModalOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Please log in to view roles dashboard.</p>
      </div>
    );
  }

  // Check if user has permission to view roles dashboard
  if (!([UserRole.ADMIN, UserRole.MANAGER, UserRole.HR] as UserRole[]).includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UsersIcon />
          <p className="text-slate-500 mt-2">You don't have permission to view roles dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Roles Dashboard</h1>
          <p className="text-slate-600">Manage and monitor user roles across the organization</p>
          
          {/* Critical 403 Error Indicator */}
          {apiConnectionStatus === 'auth_required' && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-700 font-medium text-sm">⚠️ API Authentication Required (403 Forbidden)</span>
                </div>
                <button
                  onClick={() => setApiConnectionStatus('auth_required')}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
                >
                  FIX AUTH NOW!
                </button>
              </div>
              <p className="text-red-600 text-xs mt-1">Your API requires authentication. Click the button above to configure credentials.</p>
              <p className="text-red-600 text-xs mt-1">
                <strong>Endpoint:</strong> https://8sg1s897of.execute-api.ap-south-1.amazonaws.com/prod/Create-Roles
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Role
          </button>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<UsersIcon />}
          title="Total Users"
          value={`${users.length}`}
          color="text-indigo-600"
          bgColor="bg-indigo-100"
        />
        <StatCard 
          icon={<ChartBarIcon />}
          title="Active Roles"
          value={`${roleStats.filter(r => r.count > 0).length}`}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <StatCard 
          icon={<UserCircleIcon />}
          title="Admins"
          value={`${roleStats.find(r => r.role === UserRole.ADMIN)?.count || 0}`}
          color="text-indigo-600"
          bgColor="bg-indigo-100"
        />
        <StatCard 
          icon={<UsersIcon />}
          title="Employees"
          value={`${roleStats.find(r => r.role === UserRole.EMPLOYEE)?.count || 0}`}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
      </div>

      {/* Role Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Role Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {roleStats.map((stat) => (
            <RoleCard
              key={stat.role.toString()}
              roleStats={stat}
              isSelected={selectedRole === stat.role}
              onClick={() => setSelectedRole(selectedRole === stat.role ? null : stat.role)}
              onEdit={stat.isCustom ? handleEditRole : undefined}
              onDelete={stat.isCustom ? handleDeleteRole : undefined}
            />
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UsersIcon />
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {selectedRole ? `${selectedRole} Users` : 'All Users'}
                </h2>
                <p className="text-slate-600">
                  {selectedRole 
                    ? `Showing ${filteredUsers.length} users with ${selectedRole} role`
                    : `Showing all ${filteredUsers.length} users`
                  }
                </p>
              </div>
            </div>
            {selectedRole && (
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Show All Roles
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((userItem) => {
                const userRoleInfo = roleStats.find(r => r.role === userItem.role);
                return (
                  <UserListItem
                    key={userItem.id}
                    user={userItem}
                    roleColor={userRoleInfo?.bgColor || 'bg-slate-500'}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <UsersIcon />
              <p className="text-slate-500 mt-2">
                {selectedRole 
                  ? `No users found with ${selectedRole} role`
                  : 'No users found'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Role Distribution Chart */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <ChartBarIcon />
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Role Distribution Chart</h2>
            <p className="text-slate-600">Visual breakdown of user roles across the organization</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {roleStats.map((stat) => (
            <div key={stat.role} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${stat.bgColor}`}></div>
                <span className="font-medium text-slate-700">{stat.role}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-32 bg-slate-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${stat.bgColor}`}
                    style={{ 
                      width: `${Math.min((stat.count / Math.max(...roleStats.map(r => r.count), 1)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-800 w-8 text-right">
                  {stat.count}
                </span>
                <span className="text-sm text-slate-500 w-12 text-right">
                  {users.length > 0 ? ((stat.count / users.length) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/users" 
            className="flex items-center justify-center px-4 py-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
          >
            <UsersIcon className="mr-2" />
            Manage Users
          </Link>
          <Link 
            to="/companies" 
            className="flex items-center justify-center px-4 py-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
          >
            <ChartBarIcon className="mr-2" />
            View Companies
          </Link>
          <Link 
            to="/projects" 
            className="flex items-center justify-center px-4 py-3 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors font-medium"
          >
            <UserCircleIcon className="mr-2" />
            View Projects
          </Link>
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal title="Create New Role" isOpen={isCreateModalOpen} onClose={handleCloseCreateModal}>
        <form onSubmit={handleCreateRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="roleName"
              label="Role Name"
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Team Lead, Analyst"
              required
            />
            
            <div>
              <label htmlFor="roleColor" className="block text-sm font-medium text-slate-700 mb-2">
                Role Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.name}
                    type="button"
                    onClick={() => setSelectedColor(colorOption.name)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      selectedColor === colorOption.name 
                        ? 'border-slate-400 scale-105' 
                        : 'border-slate-200 hover:border-slate-300'
                    } ${colorOption.bgColor}`}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="roleDescription" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="roleDescription"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe the role's responsibilities and purpose..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {permission.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <Button type="submit">
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal title="Edit Role" isOpen={isEditModalOpen} onClose={handleCloseEditModal}>
        <form onSubmit={handleUpdateRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="editRoleName"
              label="Role Name"
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Team Lead, Analyst"
              required
            />
            
            <div>
              <label htmlFor="editRoleColor" className="block text-sm font-medium text-slate-700 mb-2">
                Role Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.name}
                    type="button"
                    onClick={() => setSelectedColor(colorOption.name)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      selectedColor === colorOption.name 
                        ? 'border-slate-400 scale-105' 
                        : 'border-slate-200 hover:border-slate-300'
                    } ${colorOption.bgColor}`}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="editRoleDescription" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="editRoleDescription"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe the role's responsibilities and purpose..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {permission.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <Button type="submit">
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enhanced Authentication Modal for 403 Errors */}
      {apiConnectionStatus === 'auth_required' && (
        <Modal title="🔒 API Authentication Required" isOpen={true} onClose={() => setApiConnectionStatus('failed')}>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-red-800 font-semibold text-sm">403 Forbidden Error Detected</h3>
                  <p className="text-red-700 text-sm mt-1">
                    Your API endpoint requires authentication to access role data.
                  </p>
                  <p className="text-red-600 text-xs mt-2">
                    <strong>Endpoint:</strong> https://xo3txgkwkb.execute-api.ap-south-1.amazonaws.com/prod
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Input
                id="apiKey"
                label="API Key 🔑"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
              
              <div className="text-center text-sm text-slate-500 py-1">OR</div>
              
              <Input
                id="bearerToken"
                label="Bearer Token 🎩"
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Enter your bearer token"
              />
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-700 text-xs">
                📝 <strong>Need help?</strong> Contact your system administrator for API credentials.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setApiConnectionStatus('failed')}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
              >
                Use Offline Mode
              </button>
              <Button onClick={configureAPIAuthentication} className="bg-red-600 hover:bg-red-700">
                🔗 Connect API
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastClassName="custom-toast"
        aria-label="Notifications"
      />
    </div>
  );
};

export default RolesDashboard;