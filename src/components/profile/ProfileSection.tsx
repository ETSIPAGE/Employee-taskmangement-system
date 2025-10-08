import React, { useState } from 'react';
import { EditIcon } from '../../constants';

interface ProfileSectionProps {
    title: string;
    children: (isEditing: boolean) => React.ReactNode;
    onSave: () => void;
    onCancel: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children, onSave, onCancel }) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        onSave();
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        onCancel();
        setIsEditing(false);
    };
    
    const handleEdit = () => {
        setIsEditing(true);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                {!isEditing && (
                    <button onClick={handleEdit} className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        <EditIcon />
                        <span>Edit</span>
                    </button>
                )}
            </div>
            <div>{children(isEditing)}</div>
            {isEditing && (
                 <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
                    <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 transition-colors shadow-sm">
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSection;
