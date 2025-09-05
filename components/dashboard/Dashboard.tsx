import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import HRDashboard from './HRDashboard';
import RolesDashboard from './RolesDashboard';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return <div>Not authorized</div>;
    }

    switch (user.role) {
        case UserRole.ADMIN:
            return <AdminDashboard />;
        case UserRole.MANAGER:
            return <ManagerDashboard />;
        case UserRole.EMPLOYEE:
            return <EmployeeDashboard />;
        case UserRole.HR:
            return <HRDashboard />;
        case UserRole.PARENT:
            return <RolesDashboard />;
        default:
            return <div>Invalid user role.</div>;
    }
};

export default Dashboard;