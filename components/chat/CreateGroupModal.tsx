import React, { useState } from 'react';
import { User } from '../../types';
import * as DataService from '../../services/dataService';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    allUsers: User[];
    onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, currentUser, allUsers, onGroupCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const handleMemberToggle = (userId: string) => {
        const newSelection = new Set(selectedMembers);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedMembers(newSelection);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!groupName.trim()) {
            setError('Group name is required.');
            return;
        }
        if (selectedMembers.size < 1) {
            setError('You must select at least one other member.');
            return;
        }

        try {
            const participants = Array.from(new Set([currentUser.id, ...Array.from(selectedMembers)]));
            await DataService.createConversationApi(groupName, participants);
            onGroupCreated();
            setGroupName('');
            setSelectedMembers(new Set());
        } catch (err: any) {
            setError(err?.message || 'Failed to create conversation.');
        }
    };

    return (
        <Modal title="Create New Group" isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="groupName"
                    label="Group Name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Members</label>
                    <div className="max-h-60 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-2">
                        {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                            <div key={user.id} className="flex items-center">
                                <input
                                    id={`user-${user.id}`}
                                    type="checkbox"
                                    checked={selectedMembers.has(user.id)}
                                    onChange={() => handleMemberToggle(user.id)}
                                    className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={`user-${user.id}`} className="ml-3 block text-sm text-slate-800">
                                    {user.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border">Cancel</button>
                    <Button type="submit">Create Group</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateGroupModal;
