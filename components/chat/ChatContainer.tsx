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

const DUPLICATE_WINDOW_MS = 60 * 1000;

const getMessageTime = (message: ChatMessage) => {
    const value = new Date(message.timestamp).getTime();
    return Number.isFinite(value) ? value : 0;
};

const areMessagesEquivalent = (a: ChatMessage, b: ChatMessage) => {
    if (a === b) return true;
    if (a.conversationId !== b.conversationId) return false;
    if (normalizeMessageText(a.text) !== normalizeMessageText(b.text)) return false;
    const timeA = getMessageTime(a);
    const timeB = getMessageTime(b);
    if (!timeA || !timeB) return false;
    if (Math.abs(timeA - timeB) > DUPLICATE_WINDOW_MS) return false;
    if (a.senderId && b.senderId && a.senderId !== b.senderId) return false;
    return true;
};

const dedupeMessages = (messages: ChatMessage[]): ChatMessage[] => {
    const sorted = messages.slice().sort((a, b) => getMessageTime(a) - getMessageTime(b));
    const result: ChatMessage[] = [];
    for (const message of sorted) {
        const duplicateIndex = result.findIndex(existing => areMessagesEquivalent(existing, message));
        if (duplicateIndex !== -1) {
            const existing = result[duplicateIndex];
            if (existing.isLocal && !message.isLocal) {
                result[duplicateIndex] = message;
            }
            continue;
        }
        result.push(message);
    }
    return result;
};

const mergeMessagesById = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    return dedupeMessages([...existing, ...incoming]);
};

const filterOutMatchingLocalEchoes = (messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
    if (incoming.isLocal) {
        return messages;
    }
    return messages.filter(message => !(message.isLocal && areMessagesEquivalent(message, incoming)));
};

const getCacheStorageKey = (userId: string) => `ets-chat-cache-${userId}`;
const getRecencyStorageKey = (userId: string) => `ets-chat-recency-${userId}`;

const resolveTimestamp = (value?: string | number | Date): number | null => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = new Date(value).getTime();
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

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
    const recencyMapRef = useRef<Record<string, number>>({});
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const loadInProgressRef = useRef(false);

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const hydrateConversation = useCallback((conversation: ChatConversation, lookup?: Map<string, User>) => {
        if (!user) return conversation;
        const effectiveLookup = lookup || usersMap;
        return enrichConversation(conversation, effectiveLookup, user.id);
    }, [user, usersMap]);

    const persistRecencyMap = useCallback(() => {
        if (!user) return;
        try {
            const key = getRecencyStorageKey(user.id);
            localStorage.setItem(key, JSON.stringify(recencyMapRef.current));
        } catch (error) {
            console.warn('ChatContainer failed to persist recency map', error);
        }
    }, [user]);

    const updateConversationRecency = useCallback((conversationId: string, timestamp?: string | number | Date, fallbackToNow = false) => {
        const normalized = resolveTimestamp(timestamp);
        const nextValue = normalized ?? (fallbackToNow && !recencyMapRef.current[conversationId] ? Date.now() : null);
        if (nextValue === null) {
            return recencyMapRef.current[conversationId];
        }
        const current = recencyMapRef.current[conversationId];
        if (!current || nextValue > current) {
            recencyMapRef.current[conversationId] = nextValue;
            persistRecencyMap();
        }
        return recencyMapRef.current[conversationId];
    }, [persistRecencyMap]);

    const getConversationRecency = useCallback((conversation: ChatConversation) => {
        if (conversation.lastMessage?.timestamp) {
            return updateConversationRecency(conversation.id, conversation.lastMessage.timestamp);
        }
        return recencyMapRef.current[conversation.id] || 0;
    }, [updateConversationRecency]);

    const sortConversationsByRecency = useCallback((list: ChatConversation[], previous?: ChatConversation[]) => {
        const sorted = list.slice().sort((a, b) => getConversationRecency(b) - getConversationRecency(a));
        if (previous && previous.length === sorted.length) {
            let identical = true;
            for (let i = 0; i < sorted.length; i += 1) {
                if (previous[i].id !== sorted[i].id) {
                    identical = false;
                    break;
                }
            }
            if (identical) {
                return previous;
            }
        }
        return sorted;
    }, [getConversationRecency]);

    const loadData = useCallback(async (options?: { suppressLoading?: boolean }) => {
        if (!user) return;
        if (loadInProgressRef.current) {
            console.debug('ChatContainer loadData skipped: already in progress');
            return;
        }
        const suppressLoading = options?.suppressLoading ?? hasLoadedOnce;
        if (!suppressLoading) {
            setLoading(true);
        }
        loadInProgressRef.current = true;
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
                    updateConversationRecency(conv.id, conv.lastMessage?.timestamp, true);
                    return conv;
                }
                const lastMessage = cached[cached.length - 1];
                updateConversationRecency(conv.id, lastMessage.timestamp, true);
                return hydrateConversation({ ...conv, lastMessage }, freshLookup);
            });
            setAllUsers(users);
            setConversations(prev => sortConversationsByRecency(conversationsWithCache, prev));
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
            loadInProgressRef.current = false;
            if (!suppressLoading) {
                setLoading(false);
            }
            if (!hasLoadedOnce) {
                setHasLoadedOnce(true);
            }
        }
    }, [user, hydrateConversation, sortConversationsByRecency, updateConversationRecency, hasLoadedOnce]);

    const loadDataRef = useRef(loadData);
    const lastUserIdRef = useRef<string | undefined>();
    const panelRefreshTriggeredRef = useRef(false);
    const lastRefreshKeyRef = useRef<number | undefined>();

    useEffect(() => {
        loadDataRef.current = loadData;
    }, [loadData]);

    useEffect(() => {
        const currentUserId = user?.id;
        if (!currentUserId) {
            lastUserIdRef.current = undefined;
            return;
        }
        if (lastUserIdRef.current === currentUserId) {
            return;
        }
        lastUserIdRef.current = currentUserId;
        loadDataRef.current();
    }, [user?.id]);

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
                            updateConversationRecency(conv.id, lastMessage.timestamp, true);
                            return hydrateConversation({ ...conv, lastMessage });
                        });
                        return sortConversationsByRecency(updated, prev);
                    });
                    console.log('ChatContainer restored cached messages from storage', {
                        conversations: Object.keys(normalized).length,
                    });
                }
            }
        } catch (error) {
            console.warn('ChatContainer failed to restore cached messages', error);
        }
    }, [user, hydrateConversation, sortConversationsByRecency, updateConversationRecency]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const recencyKey = getRecencyStorageKey(user.id);
        try {
            const stored = localStorage.getItem(recencyKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    recencyMapRef.current = parsed as Record<string, number>;
                }
            }
        } catch (error) {
            console.warn('ChatContainer failed to restore recency map', error);
        }
    }, [user]);

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
        if (!isOpen) {
            panelRefreshTriggeredRef.current = false;
            return;
        }
        if (panelRefreshTriggeredRef.current) {
            return;
        }
        panelRefreshTriggeredRef.current = true;
        console.log('ChatContainer detected panel open, refreshing conversations');
        loadDataRef.current({ suppressLoading: true });
    }, [isOpen]);

    useEffect(() => {
        if (refreshKey === undefined) {
            return;
        }
        if (lastRefreshKeyRef.current === refreshKey) {
            return;
        }
        lastRefreshKeyRef.current = refreshKey;
        console.log('ChatContainer refreshKey effect', { refreshKey });
        loadDataRef.current();
    }, [refreshKey]);

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
                    return prev;
                }
                const updatedConversation = hydrateConversation({
                    ...prev[existingIndex],
                    lastMessage,
                });
                const remaining = prev.filter((_, idx) => idx !== existingIndex);
                console.log('ChatContainer conversation updated', { conversationId: event.conversationId });
                updateConversationRecency(event.conversationId, lastMessage.timestamp, true);
                return sortConversationsByRecency([updatedConversation, ...remaining], prev);
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
                const withoutLocalEcho = filterOutMatchingLocalEchoes(existing, incomingMessage);
                const merged = mergeMessagesById(withoutLocalEcho, [incomingMessage]);
                const updated = { ...prev, [event.conversationId]: merged };
                cachedMessagesRef.current = updated;
                const latest = merged[merged.length - 1];
                if (latest) {
                    updateConversationRecency(event.conversationId, latest.timestamp, true);
                    setConversations(prevConvs => sortConversationsByRecency(prevConvs, prevConvs));
                }
                return updated;
            });
            setPendingMessages(prev => {
                if (isOpen && activeConversation?.id === event.conversationId) {
                    return prev;
                }
                const existing = prev[event.conversationId] || [];
                const withoutLocalEcho = filterOutMatchingLocalEchoes(existing, incomingMessage);
                const merged = mergeMessagesById(withoutLocalEcho, [incomingMessage]);
                const updated = {
                    ...prev,
                    [event.conversationId]: merged,
                };
                const latest = merged[merged.length - 1];
                if (latest) {
                    updateConversationRecency(event.conversationId, latest.timestamp, true);
                    setConversations(prevConvs => sortConversationsByRecency(prevConvs, prevConvs));
                }
                return updated;
            });
        };
        chatSocket.addListener(listener);
        return () => {
            chatSocket.removeListener(listener);
        };
    }, [user, hydrateConversation, sortConversationsByRecency, updateConversationRecency, isOpen, activeConversation]);

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
            updateConversationRecency(conversationId, lastMessage.timestamp, true);
            return sortConversationsByRecency([updatedConv, ...remaining], prev);
        });
    }, [hydrateConversation, sortConversationsByRecency, updateConversationRecency]);

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