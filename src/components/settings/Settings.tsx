
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import Input from '../shared/Input';
import Button from '../shared/Button';
import * as AuthService from '../../services/authService';

const Settings: React.FC = () => {
    const { user, updateProfile } = useAuth();
    
    // Profile form state
    const [name, setName] = useState(user?.name || '');
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    if (!user) {
        return <Navigate to="/login" />;
    }
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });
        try {
            await updateProfile({ name });
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setProfileMessage({ type: 'error', text: error instanceof Error ? error.message : 'An error occurred.' });
        }
    };
    
    const Message = ({ message }: { message: { type: string, text: string } }) => {
        if (!message.text) return null;
        const colors = message.type === 'success' 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : 'bg-red-100 border-red-400 text-red-700';
        return <div className={`border px-4 py-3 rounded relative mb-4 ${colors}`} role="alert">{message.text}</div>;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Settings</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Settings Card */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Profile Information</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <Message message={profileMessage} />
                        <Input id="email-display" type="email" label="Email Address" value={user.email} disabled />
                        <Input 
                            id="name" 
                            type="text" 
                            label="Full Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                        />
                        <div className="flex justify-end pt-2">
                             <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;