import React, { useState } from 'react';
import { User, PersonalDetails } from '../../../types';
import ProfileSection from '../ProfileSection';
import Input from '../../shared/Input';

interface PersonalDetailsSectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-900 col-span-2">{value}</dd>
    </div>
);

const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({ user, onSave }) => {
    const [formData, setFormData] = useState<PersonalDetails>(user.personalDetails || {
        dateOfBirth: '', nationality: '', maritalStatus: 'Single', gender: 'Other'
    });
    const [name, setName] = useState(user.name);

    const handleSave = () => {
        onSave({ name, personalDetails: formData });
    };

    const handleCancel = () => {
        setFormData(user.personalDetails || { dateOfBirth: '', nationality: '', maritalStatus: 'Single', gender: 'Other' });
        setName(user.name);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev!, [e.target.name]: e.target.value }));
    };
    
    const formatDateForInput = (isoDate: string) => isoDate ? isoDate.split('T')[0] : '';

    return (
        <ProfileSection title="Personal Details" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => isEditing ? (
                <div className="space-y-4">
                    <Input id="name" label="Full Name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input id="dateOfBirth" label="Date of Birth" name="dateOfBirth" type="date" value={formatDateForInput(formData.dateOfBirth)} onChange={handleChange} />
                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-slate-700">Gender</label>
                        <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <Input id="nationality" label="Nationality" name="nationality" type="text" value={formData.nationality} onChange={handleChange} />
                    <div>
                        <label htmlFor="maritalStatus" className="block text-sm font-medium text-slate-700">Marital Status</label>
                         <select name="maritalStatus" id="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                            <option>Single</option>
                            <option>Married</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
            ) : (
                <dl>
                    <DetailRow label="Full Name" value={user.name} />
                    <DetailRow label="Date of Birth" value={user.personalDetails ? new Date(user.personalDetails.dateOfBirth).toLocaleDateString() : 'N/A'} />
                    <DetailRow label="Gender" value={user.personalDetails?.gender || 'N/A'} />
                    <DetailRow label="Nationality" value={user.personalDetails?.nationality || 'N/A'} />
                    <DetailRow label="Marital Status" value={user.personalDetails?.maritalStatus || 'N/A'} />
                </dl>
            )}
        </ProfileSection>
    );
};

export default PersonalDetailsSection;
