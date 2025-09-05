import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import { UserRole } from '../../types';
import { UsersIcon } from '../../constants';

interface RolesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const RolesSidebar: React.FC<RolesSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  // Get role statistics for admins and managers
  const getRoleStats = () => {
    const users = AuthService.getUsers();
    const roleCount = users.reduce((acc, currentUser) => {
      acc[currentUser.role] = (acc[currentUser.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const roleColors = {
      [UserRole.ADMIN]: 'bg-indigo-500',
      [UserRole.MANAGER]: 'bg-sky-500',
      [UserRole.EMPLOYEE]: 'bg-emerald-500',
      [UserRole.HR]: 'bg-rose-500',
      [UserRole.PARENT]: 'bg-amber-500'
    };

    return Object.entries(roleCount).map(([role, count]) => ({
      role,
      count,
      color: roleColors[role as UserRole] || 'bg-slate-500'
    }));
  };

  const roleStats = getRoleStats();

  // Role-based content
  const renderRoleContent = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return (
          <>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">System Roles</h2>
                  <p className="text-indigo-100 text-sm">Organization role distribution</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-white hover:text-indigo-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {roleStats.length > 0 ? (
                roleStats.map(({ role, count, color }) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${color}`}></div>
                      <span className="font-medium text-slate-700">{role}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-slate-800">{count}</span>
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${Math.min((count / Math.max(...roleStats.map(r => r.count))) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500">
                  <p className="text-sm">No role data available</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/users" className="block w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  Manage Users
                </Link>
                <Link to="/projects" className="block w-full px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  View Projects
                </Link>
                <Link to="/companies" className="block w-full px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                  Manage Companies
                </Link>
              </div>
            </div>
          </>
        );

      case UserRole.MANAGER:
        return (
          <>
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Team Overview</h2>
                  <p className="text-sky-100 text-sm">Manage your team</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-white hover:text-sky-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-sky-50 rounded-lg">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{user?.role}</h3>
                  <p className="text-sm text-slate-600">Manager Access Level</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/team-tasks" className="block w-full px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                  Manage Team Tasks
                </Link>
                <Link to="/team" className="block w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  View Team
                </Link>
                <Link to="/projects" className="block w-full px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  Project Overview
                </Link>
              </div>
            </div>
          </>
        );

      case UserRole.EMPLOYEE:
        return (
          <>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">My Role</h2>
                  <p className="text-emerald-100 text-sm">Employee access level</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-white hover:text-emerald-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-lg">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{user?.role}</h3>
                  <p className="text-sm text-slate-600">Employee Access Level</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/tasks" className="block w-full px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  View My Tasks
                </Link>
                <Link to="/profile" className="block w-full px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                  Edit Profile
                </Link>
                <Link to="/team" className="block w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  View Team
                </Link>
              </div>
            </div>
          </>
        );

      case UserRole.HR:
        return (
          <>
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">HR Panel</h2>
                  <p className="text-rose-100 text-sm">Human resources management</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-white hover:text-rose-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-rose-50 rounded-lg">
                <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HR</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{user?.role}</h3>
                  <p className="text-sm text-slate-600">HR Access Level</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/users" className="block w-full px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                  Manage Employees
                </Link>
                <Link to="/attendance" className="block w-full px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                  Attendance Records
                </Link>
                <Link to="/onboarding" className="block w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  Onboarding
                </Link>
              </div>
            </div>
          </>
        );

      case UserRole.PARENT:
        return (
          <>
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Parent Portal</h2>
                  <p className="text-amber-100 text-sm">Student progress monitoring</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-white hover:text-amber-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{user?.role}</h3>
                  <p className="text-sm text-slate-600">Parent Access Level</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/student-progress" className="block w-full px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                  View Student Progress
                </Link>
                <Link to="/attendance-report" className="block w-full px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                  Attendance Report
                </Link>
                <Link to="/assignments" className="block w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  Assignments & Grades
                </Link>
                <Link to="/meetings" className="block w-full px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                  Schedule Meetings
                </Link>
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="p-4 text-center text-slate-500">
            <p>Role information not available</p>
          </div>
        );
    }
  };

  return (
    <>
      <style>{`
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <aside className="w-80 flex-shrink-0 animate-slide-in bg-white border-l border-slate-200 overflow-y-auto">
        <div className="p-6 sticky top-0 bg-white">
          {renderRoleContent()}
        </div>
      </aside>
    </>
  );
};

export default RolesSidebar;