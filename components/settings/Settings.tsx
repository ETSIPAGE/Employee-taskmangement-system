import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import Input from '../shared/Input';
import Button from '../shared/Button';
import Toast from '../shared/Toast';
import * as UserManagementService from '../../services/userManagementService';

const Settings: React.FC = () => {
    const { user, updateProfile, login } = useAuth();
    
    // Profile form state
    const [name, setName] = useState(user?.name || '');
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [isPwLoading, setIsPwLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

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
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'All fields are required.' });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }
        setIsPwLoading(true);
        try {
            await login(user.email, currentPassword);
            await UserManagementService.updateEmployee(user.id, { password: newPassword });
            setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
            setToast({ message: 'Password updated successfully', type: 'success' });
            setTimeout(() => setToast(null), 2500);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to change password.' });
        } finally {
            setIsPwLoading(false);
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
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
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

                {/* Change Password Card */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <Message message={passwordMessage} />
                        <Input 
                            id="current-password"
                            type="password"
                            label="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            showPasswordToggle
                            required
                        />
                        <Input 
                            id="new-password"
                            type="password"
                            label="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            showPasswordToggle
                            required
                        />
                        <Input 
                            id="confirm-password"
                            type="password"
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            showPasswordToggle
                            required
                        />
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isPwLoading}>{isPwLoading ? 'Updating...' : 'Update Password'}</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;