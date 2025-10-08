import React, { useState } from 'react';
import { User, FamilyMember } from '../../../types';
import ProfileSection from '../ProfileSection';
import Input from '../../shared/Input';
import Button from '../../shared/Button';
import { TrashIcon } from '../../../constants';

interface FamilySectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const FamilySection: React.FC<FamilySectionProps> = ({ user, onSave }) => {
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(user.familyMembers || []);

    const handleSave = () => {
        onSave({ familyMembers });
    };

    const handleCancel = () => {
        setFamilyMembers(user.familyMembers || []);
    };
    
    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newMembers = [...familyMembers];
        newMembers[index] = { ...newMembers[index], [e.target.name]: e.target.value };
        setFamilyMembers(newMembers);
    };

    const handleAddMember = () => {
        setFamilyMembers([...familyMembers, { id: `new-${Date.now()}`, name: '', relationship: '', dateOfBirth: '' }]);
    };
    
    const handleRemoveMember = (id: string) => {
        setFamilyMembers(familyMembers.filter(member => member.id !== id));
    };
    
    const formatDateForInput = (isoDate: string) => isoDate ? isoDate.split('T')[0] : '';

    return (
        <ProfileSection title="Family Information" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => isEditing ? (
                <div className="space-y-4">
                    {familyMembers.map((member, index) => (
                        <div key={member.id} className="p-4 border rounded-md relative space-y-3">
                            <button type="button" onClick={() => handleRemoveMember(member.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            <Input id={`name-${member.id}`} label="Name" name="name" value={member.name} onChange={(e) => handleChange(index, e)} />
                            <Input id={`relationship-${member.id}`} label="Relationship" name="relationship" value={member.relationship} onChange={(e) => handleChange(index, e)} />
                            <Input id={`dob-${member.id}`} label="Date of Birth" name="dateOfBirth" type="date" value={formatDateForInput(member.dateOfBirth)} onChange={(e) => handleChange(index, e)} />
                        </div>
                    ))}
                    <Button onClick={handleAddMember} fullWidth>Add Family Member</Button>
                </div>
            ) : (
                user.familyMembers && user.familyMembers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Name</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Relationship</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Date of Birth</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {user.familyMembers.map(member => (
                                    <tr key={member.id}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{member.name}</td>
                                        <td className="px-4 py-3 text-slate-600">{member.relationship}</td>
                                        <td className="px-4 py-3 text-slate-600">{new Date(member.dateOfBirth).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-sm text-slate-500">No family members listed.</p>
            )}
        </ProfileSection>
    );
};

export default FamilySection;