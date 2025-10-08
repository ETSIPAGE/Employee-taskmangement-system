import React, { useState } from 'react';
import { User, Education } from '../../../types';
import ProfileSection from '../ProfileSection';
import Input from '../../shared/Input';
import Button from '../../shared/Button';
import { TrashIcon } from '../../../constants';

interface EducationSectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const EducationSection: React.FC<EducationSectionProps> = ({ user, onSave }) => {
    const [education, setEducation] = useState<Education[]>(user.education || []);
    const [skills, setSkills] = useState<string[]>(user.skills || []);
    const [newSkill, setNewSkill] = useState('');

    const handleSave = () => {
        onSave({ education, skills });
    };

    const handleCancel = () => {
        setEducation(user.education || []);
        setSkills(user.skills || []);
    };

    const handleEducationChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newEducation = [...education];
        const field = e.target.name as keyof Education;
        const value = field === 'yearOfCompletion' ? parseInt(e.target.value) || 0 : e.target.value;
        (newEducation[index] as any)[field] = value;
        setEducation(newEducation);
    };
    
    const handleAddEducation = () => {
        setEducation([...education, { id: `new-${Date.now()}`, degree: '', institution: '', yearOfCompletion: new Date().getFullYear() }]);
    };
    
    const handleRemoveEducation = (id: string) => {
        setEducation(education.filter(edu => edu.id !== id));
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkills(skills.filter(skill => skill !== skillToRemove));
    };


    return (
        <ProfileSection title="Education & Skills" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => isEditing ? (
                <div className="space-y-6">
                    <div>
                        <h4 className="text-md font-semibold text-slate-700 mb-2">Education</h4>
                        <div className="space-y-4">
                            {education.map((edu, index) => (
                                <div key={edu.id} className="p-4 border rounded-md relative space-y-3">
                                    <button type="button" onClick={() => handleRemoveEducation(edu.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    <Input id={`degree-${edu.id}`} label="Degree" name="degree" value={edu.degree} onChange={(e) => handleEducationChange(index, e)} />
                                    <Input id={`institution-${edu.id}`} label="Institution" name="institution" value={edu.institution} onChange={(e) => handleEducationChange(index, e)} />
                                    <Input id={`year-${edu.id}`} label="Year of Completion" name="yearOfCompletion" type="number" value={edu.yearOfCompletion.toString()} onChange={(e) => handleEducationChange(index, e)} />
                                </div>
                            ))}
                            <Button onClick={handleAddEducation} fullWidth>Add Education</Button>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-md font-semibold text-slate-700 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {skills.map(skill => (
                                <span key={skill} className="bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                                    {skill}
                                    <button onClick={() => handleRemoveSkill(skill)} className="ml-2 text-sky-600 hover:text-sky-800">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input id="newSkill" label="Add a new skill" type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} />
                            <button type="button" onClick={handleAddSkill} className="px-4 py-2 mt-6 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Add</button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <h4 className="text-md font-semibold text-slate-700 mb-2">Education</h4>
                    {user.education && user.education.length > 0 ? (
                        <ul className="space-y-3 mb-6">
                            {user.education.map(edu => (
                                <li key={edu.id} className="border-l-4 border-indigo-500 pl-4 py-1">
                                    <p className="font-bold text-slate-800">{edu.degree}</p>
                                    <p className="text-sm text-slate-600">{edu.institution} - {edu.yearOfCompletion}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-500 mb-6">No educational background listed.</p>}

                    <h4 className="text-md font-semibold text-slate-700 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {user.skills?.map(skill => (
                           <span key={skill} className="bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full">{skill}</span>
                       ))}
                        {(!user.skills || user.skills.length === 0) && <p className="text-sm text-slate-500">No skills listed.</p>}
                    </div>
                </>
            )}
        </ProfileSection>
    );
};

export default EducationSection;