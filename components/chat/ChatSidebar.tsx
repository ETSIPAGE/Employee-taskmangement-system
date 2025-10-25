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
    onGroupCreated: (conversation?: ChatConversation) => void;
}

const getInitials = (name: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(' ').filter(Boolean);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const looksLikeSystemId = (value?: string) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const hexCandidate = trimmed.replace(/-/g, '');
    return /^[0-9a-fA-F]+$/.test(hexCandidate) && (trimmed.includes('-') || hexCandidate.length >= 16);
};

const deriveNameFromEmail = (email?: string) => {
    if (!email) return null;
    const [localPart] = email.split('@');
    if (!localPart) return null;
    return localPart
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
};

const formatUserName = (user?: User) => {
    if (!user) return 'Unknown User';
    if (user.name && !looksLikeSystemId(user.name) && !user.name.toLowerCase().startsWith('direct-')) {
        return user.name;
    }
    const emailName = deriveNameFromEmail(user.email);
    if (emailName) {
        return emailName;
    }
    if (user.name) {
        return user.name;
    }
    return user.id || 'Unknown User';
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations, users, currentUser, onSelectConversation, onSelectUser, onGroupCreated }) => {
    const [tab, setTab] = useState<'chats' | 'users'>('chats');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const getConversationDisplay = (conv: ChatConversation) => {
        if (conv.type === 'group') {
            const groupName = conv.name || 'Group Chat';
            console.log('ChatSidebar group conversation display', { conversationId: conv.id, name: groupName });
            return { name: groupName, initials: (groupName || 'G').charAt(0).toUpperCase() };
        }
        const otherUserId = conv.participantIds.find(id => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        const name = formatUserName(otherUser);
        console.log('ChatSidebar direct conversation display', { conversationId: conv.id, otherUserId, name });
        return { name, initials: getInitials(name) };
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
                            console.log('ChatSidebar last message preview', {
                                conversationId: conv.id,
                                conversationName: display.name,
                                lastMessageText,
                                lastMessageTimestamp: conv.lastMessage?.timestamp,
                            });
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
                        {users.filter(u => u.id !== currentUser.id).map(user => {
                             const displayName = formatUserName(user);
                             console.log('ChatSidebar user entry', { userId: user.id, name: displayName });
                             return (
                             <li key={user.id} onClick={() => onSelectUser(user)} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer">
                                <div className="relative mr-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                        {getInitials(displayName)}
                                    </div>
                                    {DataService.isUserOnline(user.id) && (
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold text-slate-800 truncate">{displayName}</p>
                                    <p className="text-sm text-slate-500 truncate">{user.role}</p>
                                </div>
                            </li>
                        );
                        })}
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
                onGroupCreated={(conversation) => {
                    setIsGroupModalOpen(false);
                    onGroupCreated(conversation);
                }}
            />
        </div>
    );
};

export default ChatSidebar;
