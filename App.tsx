import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/dashboard/Dashboard';
import MyTeam from './components/team/MyTeam';
import Projects from './components/projects/Projects';
import ProjectDetail from './components/projects/ProjectDetail';
import TeamTasks from './components/tasks/TeamTasks';
import UserManagement from './components/users/UserManagement';
import UserProfile from './components/users/UserProfile';
import AdminTasks from './components/tasks/AdminTasks';
import Attendance from './components/attendance/Attendance';
import Settings from './components/settings/Settings';
import EmployeeTasks from './components/tasks/EmployeeTasks';
import Departments from './components/departments/Departments';
import Companies from './components/companies/Companies';
import CompanyProjects from './components/companies/CompanyProjects';
import DepartmentProjects from './components/departments/DepartmentProjects';
import Profile from './components/profile/Profile';
import TaskDetail from './components/tasks/TaskDetail';
import OnboardingForm from './components/onboarding/OnboardingForm';
import OnboardingSubmissions from './components/onboarding/OnboardingSubmissions';
import SubmissionDetail from './components/onboarding/SubmissionDetail';
import OnboardingFormView from './components/onboarding/OnboardingFormView';
import RolesDashboard from './components/dashboard/RolesDashboard';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-xl font-semibold text-slate-700">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/onboarding-form" element={<OnboardingForm showWrapper={true} />} />
      <Route 
        path="/*"
        element={
          user ? (
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/team" element={<MyTeam />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/team-tasks" element={<TeamTasks />} />
                <Route path="/tasks" element={<EmployeeTasks />} />
                <Route path="/tasks/:taskId" element={<TaskDetail />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/users/:userId" element={<UserProfile />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/companies/:companyId" element={<CompanyProjects />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/departments/:departmentId" element={<DepartmentProjects />} />
                <Route path="/roles" element={<RolesDashboard />} />
                <Route path="/admin-tasks" element={<AdminTasks />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/onboarding" element={<OnboardingSubmissions />} />
                <Route path="/onboarding/form" element={<OnboardingFormView />} />
                <Route path="/onboarding/:submissionId" element={<SubmissionDetail />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
};

export default App;