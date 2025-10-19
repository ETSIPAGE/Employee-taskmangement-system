
import React, { useState, useMemo } from 'react';
import { ChatConversation, User, UserRole } from '../../types';
import * as DataService from '../../services/dataService';
import CreateGroupModal from './CreateGroupModal';

interface ChatSidebarProps {
    conversations: ChatConversation[];
    users: User[];
    currentUser: User;
    onSelectConversation: (conversation: ChatConversation) => void;
    onSelectUser: (user: User) => void;
    onGroupCreated: () => void;
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}$${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations, users, currentUser, onSelectConversation, onSelectUser, onGroupCreated }) => {
    const [tab, setTab] = useState<'chats' | 'users'>('chats');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const getConversationDisplay = (conv: ChatConversation) => {
        if (conv.type === 'group') {
            return { name: conv.name || 'Group Chat', initials: (conv.name || 'G').charAt(0).toUpperCase() };
        }
        const otherUserId = conv.participantIds.find(id => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        return { name: otherUser?.name || 'Unknown User', initials: getInitials(otherUser?.name || '?') };
    };

    const canCreateGroup = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

    return (
        <div className="w-full flex flex-col h-full">
            <div className="p-2 border-b">
                <div className="flex bg-slate-100 rounded-md p-1">
                    <button onClick={() => setTab('chats')} className={`w-1/2 py-1 text-sm font-semibold rounded ${tab === 'chats' ? 'bg-white shadow' : 'text-slate-600'}`}>Chats</button>
                    <button onClick={() => setTab('users')} className={`w-1/2 py-1 text-sm font-semibold rounded ${tab === 'users' ? 'bg-white shadow' : 'text-slate-600'}`}>Users</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {tab === 'chats' && (
                    <ul>
                        {conversations.map(conv => {
                            const display = getConversationDisplay(conv);
                            const lastMessageText = conv.lastMessage?.text || 'No messages yet.';
                            return (
                                <li key={conv.id} onClick={() => onSelectConversation(conv)} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 flex-shrink-0">
                                        {display.initials}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold text-slate-800 truncate">{display.name}</p>
                                        <p className="text-sm text-slate-500 truncate">{lastMessageText}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                 {tab === 'users' && (
                    <ul>
                        {users.filter(u => u.id !== currentUser.id).map(user => (
                             <li key={user.id} onClick={() => onSelectUser(user)} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer">
                                <div className="relative mr-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                        {getInitials(user.name)}
                                    </div>
                                    {DataService.isUserOnline(user.id) && (
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                                    <p className="text-sm text-slate-500 truncate">{user.role}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                 )}
            </div>

            {canCreateGroup && tab === 'chats' && (
                <div className="p-3 border-t">
                    <button onClick={() => setIsGroupModalOpen(true)} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 transition-colors">
                        New Group
                    </button>
                </div>
            )}
            
            <CreateGroupModal 
                isOpen={isGroupModalOpen} 
                onClose={() => setIsGroupModalOpen(false)}
                currentUser={currentUser}
                allUsers={users}
                onGroupCreated={() => {
                    setIsGroupModalOpen(false);
                    onGroupCreated();
                }}
            />
        </div>
    );
};

export default ChatSidebar;
