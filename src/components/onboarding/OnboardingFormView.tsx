import React from 'react';
import { Link } from 'react-router-dom';
import OnboardingForm from './OnboardingForm';
import Button from '../shared/Button';

const OnboardingFormView: React.FC = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Onboarding Form Preview</h1>
                <Link to="/onboarding-form" target="_blank" rel="noopener noreferrer">
                    <Button>Open Public Form</Button>
                </Link>
            </div>
            <div className="bg-slate-100 p-4 sm:p-6 lg:p-8 rounded-lg">
                <p className="text-center text-slate-600 mb-4">This is a preview of the public-facing intern collection form.</p>
                <OnboardingForm showWrapper={false} />
            </div>
        </div>
    );
};

export default OnboardingFormView;
