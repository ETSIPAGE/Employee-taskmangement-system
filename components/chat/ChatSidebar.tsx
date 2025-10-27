import React, { useState, useEffect } from 'react';
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
    onClearConversation: (conversation: ChatConversation) => void;
    onDeleteConversation: (conversation: ChatConversation) => void;
    onAddGroupMember: (conversation: ChatConversation) => void;
    onRemoveGroupMember: (conversation: ChatConversation) => void;
    onDeleteGroup: (conversation: ChatConversation) => void;
    onEditGroupName: (conversation: ChatConversation) => void;
    onViewGroupDetails: (conversation: ChatConversation) => void;
    pendingCounts?: Record<string, number>;
    activeConversationId?: string;
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

const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations, users, currentUser, onSelectConversation, onSelectUser, onGroupCreated, onClearConversation, onDeleteConversation, onAddGroupMember, onRemoveGroupMember, onDeleteGroup, onEditGroupName, onViewGroupDetails, pendingCounts = {}, activeConversationId }) => {
    const [tab, setTab] = useState<'chats' | 'users'>('chats');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const [groupMenuOpenFor, setGroupMenuOpenFor] = useState<string | null>(null);

    const canManageGroups = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

    useEffect(() => {
        setMenuOpenFor(null);
        setGroupMenuOpenFor(null);
    }, [tab, canManageGroups]);

    const handleMenuAction = (action: 'clear' | 'delete', conversation: ChatConversation) => {
        if (action === 'clear') {
            onClearConversation(conversation);
        } else {
            onDeleteConversation(conversation);
        }
        setMenuOpenFor(null);
    };

    const handleGroupMenuAction = (
        action: 'addMember' | 'removeMember' | 'editName' | 'viewDetails',
        conversation: ChatConversation,
    ) => {
        if (action === 'addMember') {
            onAddGroupMember(conversation);
        } else if (action === 'removeMember') {
            onRemoveGroupMember(conversation);
        } else if (action === 'editName') {
            onEditGroupName(conversation);
        } else {
            onViewGroupDetails(conversation);
        }
        setGroupMenuOpenFor(null);
    };

    const getConversationDisplay = (conv: ChatConversation) => {
        if (conv.type === 'group') {
            const groupName = conv.name || 'Group Chat';
            console.log('ChatSidebar group conversation display', { conversationId: conv.id, name: groupName });
            return {
                name: groupName,
                initials: (groupName || 'G').charAt(0).toUpperCase(),
                badgeClass: null as string | null,
                presenceStatus: null as string | null,
            };
        }
        const otherUserId = conv.participantIds.find(id => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        const name = formatUserName(otherUser);
        const presenceStatus = otherUser ? DataService.getUserPresenceStatus(otherUser.id) : 'Offline';
        const badgeClass = presenceStatus === 'Active'
            ? 'bg-green-500'
            : presenceStatus === 'Busy'
                ? 'bg-amber-500'
                : 'bg-slate-600';
        console.log('ChatSidebar direct conversation display', { conversationId: conv.id, otherUserId, name, presenceStatus });
        return { name, initials: getInitials(name), badgeClass, presenceStatus };
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
                            const unreadCount = pendingCounts[conv.id] || 0;
                            const isActive = activeConversationId === conv.id;
                            const liClasses = `flex items-center p-3 cursor-pointer transition-colors ${isActive ? 'bg-indigo-100' : unreadCount > 0 ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-100'}`;
                            const display = getConversationDisplay(conv);
                            const lastMessageText = conv.lastMessage?.text || 'No messages yet.';
                            const subtitleText = unreadCount > 0
                                ? `${unreadCount} new message${unreadCount === 1 ? '' : 's'} received`
                                : lastMessageText;
                            console.log('ChatSidebar last message preview', {
                                conversationId: conv.id,
                                conversationName: display.name,
                                lastMessageText,
                                lastMessageTimestamp: conv.lastMessage?.timestamp,
                            });
                            return (
                                <li key={conv.id} className={liClasses}>
                                    <div onClick={() => { setMenuOpenFor(null); onSelectConversation(conv); }} className="flex items-center flex-1 overflow-hidden">
                                        <div className="relative mr-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                                                {display.initials}
                                            </div>
                                            {display.badgeClass && (
                                                <span
                                                    className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white ${display.badgeClass}`}
                                                    title={display.presenceStatus ?? undefined}
                                                ></span>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold text-slate-800 truncate">{display.name}</p>
                                            <p className={`text-sm truncate ${unreadCount > 0 ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>
                                                {subtitleText}
                                            </p>
                                        </div>
                                    </div>
                                    {conv.type === 'direct' && null}
                                    {conv.type === 'group' && canManageGroups && (
                                        <div className="relative flex-shrink-0 ml-2">
                                            <button
                                                className="p-1 text-slate-600 hover:text-slate-800 focus:outline-none"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setGroupMenuOpenFor(prev => prev === conv.id ? null : conv.id);
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                                </svg>
                                            </button>
                                            {groupMenuOpenFor === conv.id && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-20">
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleGroupMenuAction('addMember', conv);
                                                        }}
                                                    >
                                                        Add Member
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleGroupMenuAction('removeMember', conv);
                                                        }}
                                                    >
                                                        Remove Member
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleGroupMenuAction('editName', conv);
                                                        }}
                                                    >
                                                        Edit Name
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleGroupMenuAction('viewDetails', conv);
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                 {tab === 'users' && (
                    <ul>
                        {users.filter(u => u.id !== currentUser.id).map(user => {
                             const displayName = formatUserName(user);
                             const presenceStatus = DataService.getUserPresenceStatus(user.id);
                             const isOnline = presenceStatus === 'Active';
                             const badgeClass = isOnline
                                 ? 'bg-green-500'
                                 : presenceStatus === 'Busy'
                                     ? 'bg-amber-500'
                                     : 'bg-slate-600';
                             console.log('ChatSidebar user entry', { userId: user.id, name: displayName, presenceStatus });
                             return (
                             <li key={user.id} onClick={() => onSelectUser(user)} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer">
                                <div className="relative mr-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                        {getInitials(displayName)}
                                    </div>
                                    <span
                                        className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white ${badgeClass}`}
                                        title={presenceStatus}
                                    ></span>
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
