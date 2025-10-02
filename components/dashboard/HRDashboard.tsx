import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { OnboardingSubmission } from '../../types';
import { UsersIcon, ClipboardListIcon, DocumentPlusIcon, ArrowPathIcon } from '../../constants';
import Button from '../shared/Button';

const StatCard = ({ icon, title, value, linkTo }: { icon: React.ReactNode, title: string, value: string, linkTo: string }) => (
    <Link to={linkTo} className="block bg-white rounded-lg shadow-lg p-5 hover:shadow-xl transition-shadow">
        <div className="flex items-start">
            <div className="rounded-lg p-3 bg-slate-100 text-slate-600">
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    </Link>
);

const RecentSubmissionItem: React.FC<{ submission: OnboardingSubmission }> = ({ submission }) => (
    <li className="py-3 sm:py-4">
        <div className="flex items-center space-x-4">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{submission.fullName}</p>
                <p className="text-sm text-slate-500 truncate">{submission.collegeName}</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-slate-600">{new Date(submission.submissionDate).toLocaleDateString()}</p>
                <Link to={`/onboarding/${submission.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    View
                </Link>
            </div>
        </div>
    </li>
);

const HRDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalEmployees: 0, totalProjects: 0, totalSubmissions: 0 });
    const [recentSubmissions, setRecentSubmissions] = useState<OnboardingSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // FIX: Made loadData async to await fetching projects. Added try/catch/finally for robust loading and error handling.
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const employees = AuthService.getUsers();
            const projects = await DataService.getAllProjects();
            const submissions = DataService.getOnboardingSubmissions();
    
            setStats({
                totalEmployees: employees.length,
                totalProjects: projects.length,
                totalSubmissions: submissions.length,
            });
    
            setRecentSubmissions(submissions.slice(0, 5));
        } catch (error) {
            console.error("Failed to load HR dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">HR Dashboard</h1>
                    <p className="text-slate-600">Welcome, {user?.name}! Here's a summary of HR activities.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<DocumentPlusIcon />} title="Onboarding Submissions" value={`${stats.totalSubmissions}`} linkTo="/onboarding" />
                <StatCard icon={<UsersIcon />} title="Total Employees" value={`${stats.totalEmployees}`} linkTo="/users" />
                <StatCard icon={<ClipboardListIcon />} title="Total Projects" value={`${stats.totalProjects}`} linkTo="/projects" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Onboarding Submissions</h2>
                    {recentSubmissions.length > 0 ? (
                        <ul className="divide-y divide-slate-200">
                            {recentSubmissions.map(sub => <RecentSubmissionItem key={sub.id} submission={sub} />)}
                        </ul>
                    ) : (
                        <p className="text-center py-8 text-slate-500">No new submissions yet.</p>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col justify-center">
                     <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Links</h2>
                     <div className="space-y-3">
                         <Link to="/onboarding/form">
                            <Button fullWidth>View Onboarding Form Preview</Button>
                        </Link>
                        <Link to="/users">
                            <Button fullWidth>Manage Employees</Button>
                        </Link>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;