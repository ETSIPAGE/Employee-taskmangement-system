import React from 'react';
import * as AuthService from '../../services/authService';
import { OnboardingStep, OnboardingStepStatus } from '../../types';
import { CheckCircleIcon } from '../../constants';

interface OnboardingViewProps {
    steps: OnboardingStep[];
    onUpdateStep: (stepId: string) => void;
    canUpdate: boolean;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ steps, onUpdateStep, canUpdate }) => {

    const getCompletedByName = (userId?: string) => {
        if (!userId) return '';
        return AuthService.getUserById(userId)?.name || 'Unknown User';
    };

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {steps.map((step, stepIdx) => (
                    <li key={step.id}>
                        <div className="relative pb-8">
                            {stepIdx !== steps.length - 1 ? (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex items-start space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${step.status === OnboardingStepStatus.COMPLETED ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        {step.status === OnboardingStepStatus.COMPLETED ? (
                                            <CheckCircleIcon className="h-5 w-5 text-white" />
                                        ) : (
                                            <span className="text-white font-bold text-sm">{stepIdx + 1}</span>
                                        )}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5">
                                    <div className="flex justify-between items-center">
                                        <p className={`text-sm font-medium ${step.status === OnboardingStepStatus.COMPLETED ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                            {step.name}
                                        </p>
                                        {canUpdate && step.status === OnboardingStepStatus.PENDING && (
                                            <button 
                                                onClick={() => onUpdateStep(step.id)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-50 transition-colors border border-slate-300 shadow-sm"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                    {step.status === OnboardingStepStatus.COMPLETED && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Completed by {getCompletedByName(step.completedBy)} on {step.completedAt ? new Date(step.completedAt).toLocaleDateString() : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OnboardingView;