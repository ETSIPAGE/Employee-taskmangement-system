import React, { useState } from 'react';
import { OnboardingSubmission } from '../../types';
import * as DataService from '../../services/dataService';
import Input from '../shared/Input';
import Button from '../shared/Button';
import FileInput from '../shared/FileInput';

type FormData = Omit<OnboardingSubmission, 'id' | 'submissionDate' | 'status' | 'steps'>;

const OnboardingForm: React.FC<{ showWrapper?: boolean }> = ({ showWrapper = true }) => {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        fullName: '',
        guardianName: '',
        dateOfBirth: '',
        gender: 'Male',
        phone: '',
        altPhone: '',
        address: '',
        addressProof: '',
        govtId: '',
        collegeName: '',
        gradYear: new Date().getFullYear() + 1,
        cgpa: '',
        collegeCertificates: '',
        collegeId: '',
        photo: '',
        signature: '',
        workTime: '',
        meetingTime: '',
        declaration: false,
        languagesKnown: [],
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox' && name === 'declaration') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFileChange = (name: keyof FormData, file: File | null) => {
        setFormData(prev => ({...prev, [name]: file?.name || ''}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.declaration) {
            setError('You must agree to the declaration to submit the form.');
            return;
        }
        try {
            DataService.createOnboardingSubmission(formData);
            setIsSubmitted(true);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'An error occurred during submission.');
        }
    };
    
    const FormContent = (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 text-center border-b pb-4">Interns Details Collection Form</h1>
            
            {/* Section 1: Personal Details */}
            <fieldset className="space-y-6 border border-slate-200 p-6 rounded-md">
                <legend className="text-xl font-semibold text-slate-700 px-2">Personal Details</legend>
                <Input id="email" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                <Input id="fullName" label="Full Name" name="fullName" type="text" value={formData.fullName} onChange={handleChange} required />
                <Input id="guardianName" label="Father’s / Guardian’s Name" name="guardianName" type="text" value={formData.guardianName} onChange={handleChange} required />
                <Input id="dateOfBirth" label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
                <div>
                    <label className="block text-sm font-medium text-slate-700">Gender *</label>
                    <div className="mt-2 flex space-x-4">
                        {['Male', 'Female', 'Other'].map(gender => (
                            <label key={gender} className="flex items-center">
                                <input type="radio" name="gender" value={gender} checked={formData.gender === gender} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-slate-300"/>
                                <span className="ml-2 text-sm text-slate-800">{gender}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <Input id="phone" label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
                <Input id="altPhone" label="Alternate Contact Number" name="altPhone" type="tel" value={formData.altPhone} onChange={handleChange} required />
                <Input
                    id="languagesKnown"
                    label="Languages Known (comma-separated)"
                    name="languagesKnown"
                    type="text"
                    value={formData.languagesKnown.join(', ')}
                    onChange={(e) => {
                        const languages = e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang);
                        setFormData(prev => ({ ...prev, languagesKnown: languages }));
                    }}
                    placeholder="e.g., Telugu, Hindi, English"
                />
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700">Full Residential Address (with PIN code) *</label>
                    <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={3} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                </div>
                <FileInput id="addressProof" label="Full Residential Address (Proof)" onChange={(file) => handleFileChange('addressProof', file)} required />
                <Input id="govtId" label="Aadhaar Number / Govt ID Number" name="govtId" type="text" value={formData.govtId} onChange={handleChange} required />
            </fieldset>

            {/* Section 2: Educational Details */}
            <fieldset className="space-y-6 border border-slate-200 p-6 rounded-md">
                <legend className="text-xl font-semibold text-slate-700 px-2">Educational Details</legend>
                <Input id="collegeName" label="College / University Name" name="collegeName" type="text" value={formData.collegeName} onChange={handleChange} required />
                <Input id="gradYear" label="Expected Year of Graduation" name="gradYear" type="number" value={formData.gradYear.toString()} onChange={handleChange} required />
                <Input id="cgpa" label="Current CGPA / Percentage" name="cgpa" type="text" value={formData.cgpa} onChange={handleChange} required />
                <FileInput id="collegeCertificates" label="College Study Certificates" onChange={(file) => handleFileChange('collegeCertificates', file)} required />
                <FileInput id="collegeId" label="College ID" onChange={(file) => handleFileChange('collegeId', file)} required />
                <FileInput id="photo" label="Upload Recent Passport Size Photograph (JPG/PNG)" onChange={(file) => handleFileChange('photo', file)} required />
                <FileInput id="signature" label="Digital Signature (Upload Image)" onChange={(file) => handleFileChange('signature', file)} required />
                <Input id="workTime" label="Your Preferrable time to work" name="workTime" type="time" value={formData.workTime} onChange={handleChange} required />
                <Input id="meetingTime" label="Your Preferrable time for meetings" name="meetingTime" type="time" value={formData.meetingTime} onChange={handleChange} required />
            </fieldset>
            
            {/* Declaration */}
            <fieldset className="border border-slate-200 p-6 rounded-md">
                <legend className="text-xl font-semibold text-slate-700 px-2">Declaration</legend>
                <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="declaration" name="declaration" type="checkbox" checked={formData.declaration} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="declaration" className="font-medium text-gray-700">I hereby declare that all the above information is true to the best of my knowledge. I authorize the company to verify these details for onboarding and record-keeping.</label>
                    </div>
                </div>
            </fieldset>
            
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div className="pt-5">
                <Button type="submit" fullWidth>Submit Form</Button>
            </div>
        </form>
    );

    if (isSubmitted) {
        const SuccessMessage = (
             <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <h1 className="text-3xl font-bold text-emerald-600">Submission Successful!</h1>
                <p className="text-slate-600 mt-4">Thank you for submitting your details. Our HR team will review your application and get in touch with you shortly.</p>
            </div>
        );
        return showWrapper ? (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                {SuccessMessage}
            </div>
        ) : SuccessMessage;
    }

    return showWrapper ? (
        <div className="min-h-screen bg-slate-100 flex justify-center p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl w-full">
                {FormContent}
            </div>
        </div>
    ) : FormContent;
};

export default OnboardingForm;