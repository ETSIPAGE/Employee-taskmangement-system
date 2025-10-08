import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { OnboardingSubmission, UserRole, OnboardingStatus } from '../../types';
import Button from '../shared/Button';

const OnboardingSubmissions: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try {
            const subs = DataService.getOnboardingSubmissions();
            setSubmissions(subs);
        } catch (error) {
            console.error("Failed to load submissions:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getStatusPill = (status: OnboardingStatus) => {
        const styles: Record<OnboardingStatus, string> = {
            [OnboardingStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
            [OnboardingStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
            [OnboardingStatus.COMPLETED]: 'bg-green-100 text-green-800',
        };
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
                {status}
            </span>
        );
    };
    
    if (!user || user.role !== UserRole.HR) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div>Loading submissions...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Onboarding Submissions</h1>
                <Link to="/onboarding/form">
                    <Button>View Blank Form</Button>
                </Link>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">College/University</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Submission Date</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub.id} onClick={() => navigate(`/onboarding/${sub.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 font-semibold whitespace-no-wrap">{sub.fullName}</p>
                                        <p className="text-slate-600 whitespace-no-wrap">{sub.email}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{sub.collegeName}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{new Date(sub.submissionDate).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                         {getStatusPill(sub.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {submissions.length === 0 && <p className="text-center py-8 text-slate-500">No submissions have been received yet.</p>}
            </div>
        </div>
    );
};

export default OnboardingSubmissions;