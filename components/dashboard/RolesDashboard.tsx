import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import { UserRole, User } from '../../types';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, UsersIcon, ChartBarIcon, UserCircleIcon } from '../../constants';

interface RoleStats {
  role: UserRole;
  count: number;
  users: User[];
  color: string;
  bgColor: string;
  description: string;
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

const RoleCard = ({ 
  roleStats, 
  isSelected, 
  onClick 
}: { 
  roleStats: RoleStats, 
  isSelected: boolean, 
  onClick: () => void 
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
      isSelected ? 'ring-2 ring-indigo-500 shadow-xl' : ''
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`w-4 h-4 rounded-full ${roleStats.bgColor}`}></div>
      <span className="text-3xl font-bold text-slate-800">{roleStats.count}</span>
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{roleStats.role}</h3>
    <p className="text-sm text-slate-500 leading-relaxed mb-4">{roleStats.description}</p>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${roleStats.bgColor}`}
        style={{ width: `${Math.min(roleStats.count * 20, 100)}%` }}
      ></div>
    </div>
  </div>
);

const UserListItem = ({ user, roleColor }: { user: User, roleColor: string }) => (
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
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    setIsLoading(true);
    
    try {
      const allUsers = AuthService.getUsers();
      setUsers(allUsers);

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

      // Calculate role statistics
      const stats: RoleStats[] = Object.values(UserRole).map(role => {
        const roleUsers = allUsers.filter(u => u.role === role);
        return {
          role,
          count: roleUsers.length,
          users: roleUsers,
          color: roleInfo[role].color,
          bgColor: roleInfo[role].bgColor,
          description: roleInfo[role].description,
        };
      });

      setRoleStats(stats);
    } catch (error) {
      console.error('Error loading role data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = selectedRole 
    ? users.filter(u => u.role === selectedRole)
    : users;

  const totalUsers = users.length;
  const activeRoles = roleStats.filter(r => r.count > 0).length;

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
        </div>
        <button 
          onClick={loadData} 
          disabled={isLoading} 
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
          aria-label="Refresh data"
        >
          <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<UsersIcon />}
          title="Total Users"
          value={`${totalUsers}`}
          color="text-indigo-600"
          bgColor="bg-indigo-100"
        />
        <StatCard 
          icon={<ChartBarIcon />}
          title="Active Roles"
          value={`${activeRoles}`}
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
              key={stat.role}
              roleStats={stat}
              isSelected={selectedRole === stat.role}
              onClick={() => setSelectedRole(selectedRole === stat.role ? null : stat.role)}
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
                  {totalUsers > 0 ? ((stat.count / totalUsers) * 100).toFixed(1) : '0.0'}%
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
    </div>
  );
};

export default RolesDashboard;