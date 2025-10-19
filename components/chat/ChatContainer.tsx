import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { ChatConversation, ChatMessage, User } from '../../types';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { chatSocket, ChatSocketEvent } from '../../services/chatSocket';

interface ChatContainerProps {
    onClose: () => void;
    refreshKey?: number;
    isOpen?: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ onClose, refreshKey, isOpen }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [messagesRefreshTrigger, setMessagesRefreshTrigger] = useState(0);
    const [pendingMessages, setPendingMessages] = useState<Record<string, ChatMessage[]>>({});

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [userConversations, users] = await Promise.all([
                DataService.getConversationsForUser(user.id),
                DataService.getUsers(true),
            ]);
            setConversations(userConversations);
            setAllUsers(users);
            console.log('ChatContainer loadData result', {
                conversationsCount: userConversations.length,
                usersCount: users.length,
            });
            setActiveConversation(prev => {
                if (!prev) return prev;
                const updated = userConversations.find(c => c.id === prev.id);
                if (!updated) {
                    console.warn('ChatContainer active conversation no longer present', { activeId: prev.id });
                } else {
                    console.log('ChatContainer active conversation updated', { activeId: prev.id });
                }
                return updated ? { ...updated } : prev;
            });
        } catch (error) {
            console.error("Failed to load chat data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (isOpen) {
            console.log('ChatContainer detected panel open, refreshing messages');
            setMessagesRefreshTrigger(prev => prev + 1);
        }
    }, [isOpen]);

    useEffect(() => {
        if (refreshKey === undefined) return;
        console.log('ChatContainer refreshKey effect', { refreshKey });
        loadData();
        setMessagesRefreshTrigger(prev => prev + 1);
    }, [refreshKey, loadData]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const listener = (event: ChatSocketEvent) => {
            if (event.type !== 'newMessage' || !event.conversationId || !event.text || !event.timestamp) {
                return;
            }
            console.log('ChatContainer socket listener received', event);
            const lastMessage = {
                id: `${event.conversationId}-${event.timestamp}`,
                conversationId: event.conversationId,
                senderId: event.senderId || '',
                text: event.text,
                timestamp: event.timestamp,
            };
            setConversations(prev => {
                const existingIndex = prev.findIndex(conv => conv.id === event.conversationId);
                if (existingIndex === -1) {
                    loadData();
                    return prev;
                }
                const updatedConversation: ChatConversation = {
                    ...prev[existingIndex],
                    lastMessage,
                };
                const remaining = prev.filter((_, idx) => idx !== existingIndex);
                console.log('ChatContainer conversation updated', { conversationId: event.conversationId });
                return [updatedConversation, ...remaining];
            });
            const incomingMessage: ChatMessage = {
                id: `${event.conversationId}-${event.timestamp}`,
                conversationId: event.conversationId,
                senderId: event.senderId || '',
                text: event.text,
                timestamp: event.timestamp,
            };
            setPendingMessages(prev => {
                if (isOpen && activeConversation?.id === event.conversationId) {
                    return prev;
                }
                const existing = prev[event.conversationId] || [];
                return {
                    ...prev,
                    [event.conversationId]: [...existing, incomingMessage],
                };
            });
            setMessagesRefreshTrigger(prev => {
                const next = prev + 1;
                console.log('ChatContainer messagesRefreshTrigger incremented', { next });
                return next;
            });
        };
        chatSocket.addListener(listener);
        return () => {
            chatSocket.removeListener(listener);
        };
    }, [user, loadData]);

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
                        refreshKey={messagesRefreshTrigger}
                        pendingMessages={pendingMessages[activeConversation.id] || []}
                        onPendingConsumed={(conversationId) => {
                            setPendingMessages(prev => {
                                if (!prev[conversationId]) return prev;
                                const { [conversationId]: _removed, ...rest } = prev;
                                return rest;
                            });
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ChatContainer;