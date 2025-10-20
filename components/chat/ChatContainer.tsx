import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

const formatUserDisplayName = (user?: User) => {
    if (!user) return 'Unknown User';
    if (user.name && !looksLikeSystemId(user.name)) {
        return user.name;
    }
    const emailName = deriveNameFromEmail(user.email);
    if (emailName) {
        return emailName;
    }
    return user.name || user.id || 'Unknown User';
};

const normalizeMessageText = (text?: string) => (text || '').trim().toLowerCase();

const mergeMessagesById = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    const mergedMap = new Map<string, ChatMessage>();
    existing.forEach(msg => mergedMap.set(msg.id, msg));
    incoming.forEach(msg => mergedMap.set(msg.id, msg));
    const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const result: ChatMessage[] = [];
    for (const message of merged) {
        if (message.isLocal) {
            const hasServerDuplicate = merged.some(other => other !== message && !other.isLocal && other.conversationId === message.conversationId && normalizeMessageText(other.text) === normalizeMessageText(message.text) && Math.abs(new Date(other.timestamp).getTime() - new Date(message.timestamp).getTime()) <= 5000 && other.senderId === message.senderId);
            if (hasServerDuplicate) {
                continue;
            }
        }
        result.push(message);
    }
    return result;
};

const getCacheStorageKey = (userId: string) => `ets-chat-cache-${userId}`;

const enrichConversation = (
    conversation: ChatConversation,
    userLookup: Map<string, User>,
    currentUserId: string
): ChatConversation => {
    const participantCount = conversation.participantIds?.length || 0;
    const rawType = conversation.type?.toLowerCase();
    const nameLooksSystem = conversation.name && (looksLikeSystemId(conversation.name) || conversation.name.toLowerCase().startsWith('direct-'));
    const hasGroupHints = rawType === 'group' || (conversation.adminIds?.length ?? 0) > 0 || participantCount > 2;

    if (hasGroupHints && !nameLooksSystem) {
        return {
            ...conversation,
            type: 'group',
            name: conversation.name && conversation.name.trim() ? conversation.name : 'Group Chat',
        };
    }

    const isDirect = rawType === 'direct' || !hasGroupHints || nameLooksSystem || participantCount <= 2;
    if (isDirect) {
        const otherUserId = conversation.participantIds.find(id => id !== currentUserId);
        const otherUser = otherUserId ? userLookup.get(otherUserId) : undefined;
        const displayName = formatUserDisplayName(otherUser);
        return {
            ...conversation,
            type: 'direct',
            name: displayName,
        };
    }

    return {
        ...conversation,
        type: hasGroupHints ? 'group' : 'direct',
        name: conversation.name && conversation.name.trim() ? conversation.name : hasGroupHints ? 'Group Chat' : conversation.name,
    };
};

const ChatContainer: React.FC<ChatContainerProps> = ({ onClose, refreshKey, isOpen }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [messagesRefreshTrigger, setMessagesRefreshTrigger] = useState(0);
    const [pendingMessages, setPendingMessages] = useState<Record<string, ChatMessage[]>>({});
    const [cachedMessages, setCachedMessages] = useState<Record<string, ChatMessage[]>>({});
    const cachedMessagesRef = useRef<Record<string, ChatMessage[]>>({});

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const hydrateConversation = useCallback((conversation: ChatConversation, lookup?: Map<string, User>) => {
        if (!user) return conversation;
        const effectiveLookup = lookup || usersMap;
        return enrichConversation(conversation, effectiveLookup, user.id);
    }, [user, usersMap]);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [userConversations, users] = await Promise.all([
                DataService.getConversationsForUser(user.id),
                DataService.getUsers(true),
            ]);
            const freshLookup = new Map(users.map(u => [u.id, u]));
            const enrichedConversations = userConversations.map(conv => hydrateConversation(conv, freshLookup));
            const conversationsWithCache = enrichedConversations.map(conv => {
                const cached = cachedMessagesRef.current[conv.id];
                if (!cached || !cached.length) {
                    return conv;
                }
                const lastMessage = cached[cached.length - 1];
                return hydrateConversation({ ...conv, lastMessage }, freshLookup);
            });
            setAllUsers(users);
            setConversations(conversationsWithCache);
            console.log('ChatContainer loadData result', {
                conversationsCount: userConversations.length,
                usersCount: users.length,
            });
            setActiveConversation(prev => {
                if (!prev) return prev;
                const updated = enrichedConversations.find(c => c.id === prev.id);
                if (!updated) {
                    console.warn('ChatContainer active conversation no longer present', { activeId: prev.id });
                } else {
                    console.log('ChatContainer active conversation updated', { activeId: prev.id });
                }
                return updated ? updated : hydrateConversation(prev, freshLookup);
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
        if (!user) {
            setCachedMessages({});
            return;
        }
        const cacheKey = getCacheStorageKey(user.id);
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    const normalized: Record<string, ChatMessage[]> = {};
                    Object.entries(parsed).forEach(([conversationId, value]) => {
                        if (Array.isArray(value)) {
                            const messages = (value as ChatMessage[]).filter(msg => msg && msg.id && msg.timestamp);
                            normalized[conversationId] = mergeMessagesById([], messages);
                        }
                    });
                    setCachedMessages(normalized);
                    cachedMessagesRef.current = normalized;
                    setConversations(prev => {
                        if (!prev.length) {
                            return prev;
                        }
                        const updated = prev.map(conv => {
                            const messages = normalized[conv.id];
                            if (!messages || !messages.length) {
                                return conv;
                            }
                            const lastMessage = messages[messages.length - 1];
                            return hydrateConversation({ ...conv, lastMessage });
                        });
                        return updated;
                    });
                    console.log('ChatContainer restored cached messages from storage', {
                        conversations: Object.keys(normalized).length,
                    });
                }
            }
        } catch (error) {
            console.warn('ChatContainer failed to restore cached messages', error);
        }
    }, [user, hydrateConversation]);

    useEffect(() => {
        if (!user) return;
        const cacheKey = getCacheStorageKey(user.id);
        try {
            cachedMessagesRef.current = cachedMessages;
            const serialized = JSON.stringify(cachedMessages);
            localStorage.setItem(cacheKey, serialized);
        } catch (error) {
            console.warn('ChatContainer failed to persist cached messages', error);
        }
    }, [cachedMessages, user]);

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
                const updatedConversation = hydrateConversation({
                    ...prev[existingIndex],
                    lastMessage,
                });
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
            setCachedMessages(prev => {
                const existing = prev[event.conversationId] || [];
                const merged = mergeMessagesById(existing, [incomingMessage]);
                return { ...prev, [event.conversationId]: merged };
            });
            setPendingMessages(prev => {
                if (isOpen && activeConversation?.id === event.conversationId) {
                    return prev;
                }
                const existing = prev[event.conversationId] || [];
                const merged = mergeMessagesById(existing, [incomingMessage]);
                return {
                    ...prev,
                    [event.conversationId]: merged,
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
        setActiveConversation(hydrateConversation(conversation));
    };

    const handleSelectUser = (selectedUser: User) => {
        if (!user) return;
        const conversation = hydrateConversation(DataService.getOrCreateDirectConversation(user.id, selectedUser.id));
        setActiveConversation(conversation);
        // Refresh conversations list to include the new one if created
        if (!conversations.find(c => c.id === conversation.id)) {
            loadData();
        }
    };
    
    const handleGroupCreated = () => {
        loadData();
    };

    const handlePendingConsumed = useCallback((conversationId: string) => {
        setPendingMessages(prev => {
            if (!prev[conversationId]) return prev;
            const { [conversationId]: _removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const updateConversationLastMessage = useCallback((conversationId: string, lastMessage: ChatMessage | undefined) => {
        if (!lastMessage) {
            return;
        }
        setConversations(prev => {
            const existingIndex = prev.findIndex(conv => conv.id === conversationId);
            if (existingIndex === -1) {
                return prev;
            }
            const updatedConv = hydrateConversation({
                ...prev[existingIndex],
                lastMessage,
            });
            console.log('ChatContainer last message update', {
                conversationId,
                conversationName: updatedConv.name,
                conversationType: updatedConv.type,
                lastMessageText: lastMessage.text,
                lastMessageTimestamp: lastMessage.timestamp,
            });
            const remaining = prev.filter((_, idx) => idx !== existingIndex);
            return [updatedConv, ...remaining];
        });
    }, [hydrateConversation]);

    const handleMessagesFetched = useCallback((conversationId: string, fetchedMessages: ChatMessage[]) => {
        setCachedMessages(prev => {
            const existing = prev[conversationId] || [];
            const merged = mergeMessagesById(existing, fetchedMessages);
            const lastMessage = merged[merged.length - 1];
            updateConversationLastMessage(conversationId, lastMessage);
            return { ...prev, [conversationId]: merged };
        });
    }, [updateConversationLastMessage]);

    const handleLocalMessage = useCallback((conversationId: string, message: ChatMessage) => {
        setCachedMessages(prev => {
            const existing = prev[conversationId] || [];
            const merged = mergeMessagesById(existing, [message]);
            const lastMessage = merged[merged.length - 1];
            updateConversationLastMessage(conversationId, lastMessage);
            return { ...prev, [conversationId]: merged };
        });
    }, [updateConversationLastMessage]);

    const handleBack = useCallback(() => {
        setActiveConversation(null);
    }, []);

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
                        onBack={handleBack}
                        allUsers={allUsers}
                        refreshKey={messagesRefreshTrigger}
                        pendingMessages={pendingMessages[activeConversation.id] || []}
                        cachedMessages={cachedMessages[activeConversation.id] || []}
                        onPendingConsumed={handlePendingConsumed}
                        onMessagesFetched={handleMessagesFetched}
                        onLocalMessage={handleLocalMessage}
                    />
                )}
            </div>
        </div>
    );
};

export default ChatContainer;