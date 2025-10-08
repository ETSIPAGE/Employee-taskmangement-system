import React, { useState } from 'react';
import { User, Compensation } from '../../../types';
import ProfileSection from '../ProfileSection';
import Input from '../../shared/Input';

interface WorkSectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-900 col-span-2">{value}</dd>
    </div>
);

const WorkSection: React.FC<WorkSectionProps> = ({ user, onSave }) => {
    const [compensation, setCompensation] = useState<Compensation>(user.compensation || {
        salary: 0, payFrequency: 'Monthly', bankDetails: { bankName: '', accountNumber: '', ifscCode: '' }
    });

    const handleSave = () => {
        onSave({ compensation });
    };

    const handleCancel = () => {
        setCompensation(user.compensation || { salary: 0, payFrequency: 'Monthly', bankDetails: { bankName: '', accountNumber: '', ifscCode: '' }});
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (['salary'].includes(name)) {
             setCompensation(prev => ({ ...prev!, [name]: parseInt(value) || 0 }));
        } else if (['bankName', 'accountNumber', 'ifscCode'].includes(name)) {
             setCompensation(prev => ({
                ...prev!,
                bankDetails: { ...prev!.bankDetails, [name]: value }
            }));
        }
        else {
            setCompensation(prev => ({ ...prev!, [name]: value as 'Monthly' | 'Bi-Weekly' }));
        }
    };

    return (
        <ProfileSection title="Work & Compensation" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => (
                <>
                    <h4 className="text-md font-semibold text-slate-700 mb-3">Employment Details</h4>
                    <dl className="mb-6">
                        <DetailRow label="Employee ID" value={user.id} />
                        <DetailRow label="Joined Date" value={user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'} />
                    </dl>

                    <h4 className="text-md font-semibold text-slate-700 mb-3">Compensation</h4>
                    {isEditing ? (
                        <div className="space-y-4">
                            <Input id="salary" label="Salary (Annual)" name="salary" type="number" value={compensation.salary} onChange={handleChange} />
                             <div>
                                <label htmlFor="payFrequency" className="block text-sm font-medium text-slate-700">Pay Frequency</label>
                                <select name="payFrequency" id="payFrequency" value={compensation.payFrequency} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md">
                                    <option>Monthly</option>
                                    <option>Bi-Weekly</option>
                                </select>
                            </div>
                            <Input id="bankName" label="Bank Name" name="bankName" value={compensation.bankDetails.bankName} onChange={handleChange} />
                            <Input id="accountNumber" label="Account Number" name="accountNumber" value={compensation.bankDetails.accountNumber} onChange={handleChange} />
                            <Input id="ifscCode" label="IFSC Code" name="ifscCode" value={compensation.bankDetails.ifscCode} onChange={handleChange} />
                        </div>
                    ) : (
                        <dl>
                            <DetailRow label="Salary" value={user.compensation ? `$${user.compensation.salary.toLocaleString()} / year` : 'N/A'} />
                            <DetailRow label="Pay Frequency" value={user.compensation?.payFrequency || 'N/A'} />
                            <DetailRow label="Bank Name" value={user.compensation?.bankDetails.bankName || 'N/A'} />
                            <DetailRow label="Account Number" value={user.compensation?.bankDetails.accountNumber || 'N/A'} />
                        </dl>
                    )}
                </>
            )}
        </ProfileSection>
    );
};

export default WorkSection;