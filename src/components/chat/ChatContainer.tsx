import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { ChatConversation, User } from '../../types';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

interface ChatContainerProps {
    onClose: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        if (!user) return;
        setLoading(true);
        try {
            const userConversations = DataService.getConversationsForUser(user.id);
            const users = AuthService.getUsers();
            setConversations(userConversations);
            setAllUsers(users);
        } catch (error) {
            console.error("Failed to load chat data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSelectConversation = (conversation: ChatConversation) => {
        setActiveConversation(conversation);
    };

    const handleSelectUser = (selectedUser: User) => {
        if (!user) return;
        const conversation = DataService.getOrCreateDirectConversation(user.id, selectedUser.id);
        setActiveConversation(conversation);
        // Refresh conversations list to include the new one if created
        if (!conversations.find(c => c.id === conversation.id)) {
            loadData();
        }
    };
    
    const handleGroupCreated = () => {
        loadData();
    };

    if (loading || !user) {
        return <div className="p-4 text-center">Loading Chat...</div>;
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-800">Messenger</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
                {!activeConversation ? (
                    <ChatSidebar
                        conversations={conversations}
                        users={allUsers}
                        currentUser={user}
                        onSelectConversation={handleSelectConversation}
                        onSelectUser={handleSelectUser}
                        onGroupCreated={handleGroupCreated}
                    />
                ) : (
                    <ChatWindow
                        conversation={activeConversation}
                        currentUser={user}
                        onBack={() => setActiveConversation(null)}
                        allUsers={allUsers}
                    />
                )}
            </div>
        </div>
    );
};

export default ChatContainer;
