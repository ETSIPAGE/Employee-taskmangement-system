import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import HRDashboard from './HRDashboard';
import RolesDashboard from './RolesDashboard';
import WorkReportsDashboard from './WorkReportsDashboard';
import { useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <div>Not authorized</div>;
    }

    // Check if we're specifically requesting the roles dashboard
    const isRolesView = location.pathname === '/roles';
    
    // Check if we're specifically requesting the work reports dashboard
    const isWorkReportsView = location.pathname === '/work-reports';

    if (user.role === UserRole.ADMIN && isRolesView) {
        return <RolesDashboard />;
    }
    
    if (user.role === UserRole.ADMIN && isWorkReportsView) {
        return <WorkReportsDashboard />;
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
        default:
            return <div>Invalid user role.</div>;
    }
};

export default Dashboard;