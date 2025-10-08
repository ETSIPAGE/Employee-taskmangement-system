import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { OnboardingSubmission, UserRole, OnboardingStatus, OnboardingStep, OnboardingStepStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../shared/Button';
import OnboardingView from './OnboardingView';

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-slate-100">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-900 sm:col-span-2">{value || 'N/A'}</dd>
    </div>
);

const SubmissionDetail: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const { user } = useAuth();
    const [submission, setSubmission] = useState<OnboardingSubmission | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(() => {
        if (!submissionId) return;
        setIsLoading(true);
        try {
            const sub = DataService.getOnboardingSubmissionById(submissionId);
            setSubmission(sub || null);
        } catch (error) {
            console.error("Failed to load submission:", error);
        } finally {
            setIsLoading(false);
        }
    }, [submissionId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartOnboarding = () => {
        if (!submission || !submissionId) return;

        const defaultSteps: OnboardingStep[] = DataService.DEFAULT_ONBOARDING_STEPS.map((name, index) => ({
            id: `step-${index + 1}`,
            name,
            status: OnboardingStepStatus.PENDING
        }));

        DataService.updateOnboardingSubmission(submissionId, {
            status: OnboardingStatus.IN_PROGRESS,
            steps: defaultSteps
        });
        loadData();
    };
    
    const handleUpdateStep = (stepId: string) => {
        if (!submission || !submission.steps || !user || !submissionId) return;

        const newSteps = submission.steps.map(step => 
            step.id === stepId ? {
                ...step,
                status: OnboardingStepStatus.COMPLETED,
                completedBy: user.id,
                completedAt: new Date().toISOString()
            } : step
        );
        
        const allStepsCompleted = newSteps.every(s => s.status === OnboardingStepStatus.COMPLETED);
        
        DataService.updateOnboardingSubmission(submissionId, {
            steps: newSteps,
            status: allStepsCompleted ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS
        });

        loadData();
    };

    if (!user || user.role !== UserRole.HR) {
        return <Navigate to="/" />;
    }
    if (isLoading) return <div className="text-center p-8">Loading submission details...</div>;
    if (!submission) return <div className="text-center p-8">Submission not found.</div>;

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link to="/onboarding" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center mb-2">
                        &larr; Back to Submissions
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">Onboarding: {submission.fullName}</h1>
                    <p className="text-slate-500 mt-1">Submitted on {new Date(submission.submissionDate).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Right Column: Onboarding Process */}
                <div className="lg:col-span-2 lg:order-last">
                    <div className="bg-white p-6 rounded-lg shadow sticky top-6">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">Onboarding Checklist</h3>
                        {submission.status === OnboardingStatus.PENDING_REVIEW && (
                            <div className="text-center">
                                <p className="text-slate-600 mb-4">Review the applicant's details and start the onboarding process.</p>
                                <Button onClick={handleStartOnboarding} fullWidth>Start Onboarding Process</Button>
                            </div>
                        )}
                        {submission.steps && (
                             <OnboardingView 
                                steps={submission.steps}
                                onUpdateStep={handleUpdateStep}
                                canUpdate={submission.status !== OnboardingStatus.COMPLETED}
                            />
                        )}
                    </div>
                </div>

                {/* Left Column: Details */}
                <div className="lg:col-span-3 lg:order-first space-y-8">
                    {/* Personal Details */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">Personal Details</h3>
                        <dl>
                            <DetailRow label="Full Name" value={submission.fullName} />
                            <DetailRow label="Email" value={submission.email} />
                            <DetailRow label="Father's / Guardian's Name" value={submission.guardianName} />
                            <DetailRow label="Date of Birth" value={new Date(submission.dateOfBirth).toLocaleDateString()} />
                            <DetailRow label="Gender" value={submission.gender} />
                            <DetailRow label="Phone Number" value={submission.phone} />
                            <DetailRow label="Alternate Contact" value={submission.altPhone} />
                            <DetailRow label="Languages Known" value={submission.languagesKnown?.join(', ')} />
                            <DetailRow label="Residential Address" value={submission.address} />
                            <DetailRow label="Address Proof" value={submission.addressProof} />
                            <DetailRow label="Aadhaar / Govt ID" value={submission.govtId} />
                        </dl>
                    </div>
                    
                    {/* Educational Details */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">Educational & Professional Details</h3>
                        <dl>
                            <DetailRow label="College / University" value={submission.collegeName} />
                            <DetailRow label="Expected Graduation Year" value={submission.gradYear} />
                            <DetailRow label="Current CGPA / Percentage" value={submission.cgpa} />
                            <DetailRow label="College Study Certificates" value={submission.collegeCertificates} />
                            <DetailRow label="College ID" value={submission.collegeId} />
                            <DetailRow label="Passport Size Photo" value={submission.photo} />
                            <DetailRow label="Digital Signature" value={submission.signature} />
                            <DetailRow label="Preferrable Work Time" value={submission.workTime} />
                            <DetailRow label="Preferrable Meeting Time" value={submission.meetingTime} />
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetail;