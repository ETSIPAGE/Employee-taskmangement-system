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

const isPlaceholderConversationName = (value?: string) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === 'direct chat' || normalized === 'chat' || normalized === 'chat conversation') {
        return true;
    }
    if (normalized.startsWith('direct chat')) {
        return true;
    }
    return false;
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

const normalizeParticipantIds = (ids?: (string | number | undefined)[]) =>
    (ids || [])
        .map(id => (id === null || id === undefined ? null : String(id)))
        .filter((value): value is string => Boolean(value));

const buildParticipantKey = (ids?: (string | number | undefined)[]) => {
    const normalized = normalizeParticipantIds(ids);
    return normalized.slice().sort().join('|');
};

const shouldTreatAsDirect = (conversation: ChatConversation, normalizedParticipantIds?: string[]) => {
    const participantIds = normalizedParticipantIds ?? normalizeParticipantIds(conversation.participantIds);
    const participantCount = participantIds.length;
    if (participantCount === 0 || participantCount > 2) {
        return false;
    }
    const rawType = conversation.type?.toLowerCase();
    if (rawType === 'group' && (conversation.adminIds?.length ?? 0) > 0) {
        // Some backends mark direct chats as group with admin metadata; prefer participant count.
        return true;
    }
    return true;
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

const dedupeConversations = (conversations: ChatConversation[]): ChatConversation[] => {
    const directMap = new Map<string, ChatConversation>();
    const groupMap = new Map<string, ChatConversation>();

    const resolveTimestampSafe = (conversation: ChatConversation) =>
        resolveTimestamp(conversation.lastMessage?.timestamp) ?? 0;

    for (const conversation of conversations) {
        const normalizedParticipants = normalizeParticipantIds(conversation.participantIds);
        const normalizedConversation: ChatConversation = {
            ...conversation,
            participantIds: normalizedParticipants,
        };

        if (shouldTreatAsDirect(normalizedConversation, normalizedParticipants)) {
            const key = buildParticipantKey(normalizedParticipants) || normalizedConversation.id;
            if (!key) {
                continue;
            }
            const existing = directMap.get(key);
            if (!existing || resolveTimestampSafe(normalizedConversation) > resolveTimestampSafe(existing)) {
                directMap.set(key, normalizedConversation);
            }
            continue;
        }

        const groupKey = normalizedConversation.id || buildParticipantKey(normalizedParticipants) || `group-${groupMap.size}`;
        const existingGroup = groupMap.get(groupKey);
        if (!existingGroup || resolveTimestampSafe(normalizedConversation) > resolveTimestampSafe(existingGroup)) {
            groupMap.set(groupKey, normalizedConversation);
        }
    }

    return [...groupMap.values(), ...directMap.values()];
};

const enrichConversation = (
    conversation: ChatConversation,
    userLookup: Map<string, User>,
    currentUserId: string
): ChatConversation => {
    const participantIds = normalizeParticipantIds(conversation.participantIds);
    const participantCount = participantIds.length;
    const rawType = conversation.type?.toLowerCase();
    const cleanName = conversation.name?.trim();
    const nameLooksSystem = cleanName && (
        looksLikeSystemId(cleanName) ||
        cleanName.toLowerCase().startsWith('direct-') ||
        isPlaceholderConversationName(cleanName)
    );
    const treatAsDirect = shouldTreatAsDirect({ ...conversation, participantIds }, participantIds);

    if (treatAsDirect) {
        const otherUserId = participantIds.find(id => id !== currentUserId);
        const otherUser = otherUserId ? userLookup.get(otherUserId) : undefined;
        const displayName = formatUserDisplayName(otherUser);
        return {
            ...conversation,
            type: 'direct',
            name: displayName || (conversation.name && !looksLikeSystemId(conversation.name) ? conversation.name : 'Direct Chat'),
            participantIds,
        };
    }

    const otherParticipantNames = participantIds
        .filter(id => id !== currentUserId)
        .map(id => formatUserDisplayName(userLookup.get(id)))
        .filter(Boolean);
    const derivedGroupName = otherParticipantNames.slice(0, 3).join(', ');

    return {
        ...conversation,
        type: 'group',
        name: !cleanName || nameLooksSystem ? (derivedGroupName || cleanName || 'Group Chat') : cleanName,
        participantIds,
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
        const deduped = dedupeConversations(list);
        const sorted = deduped.slice().sort((a, b) => getConversationRecency(b) - getConversationRecency(a));
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
            const directChats = enrichedConversations
                .filter(conv => conv.type === 'direct')
                .map(conv => ({ id: conv.id, name: conv.name || 'Direct Chat' }));
            console.log('ChatContainer direct chat list', directChats);
            const groupNames = enrichedConversations
                .filter(conv => conv.type === 'group')
                .map(conv => conv.name || 'Group Chat');
            const totalChats = dedupeConversations(enrichedConversations).length;
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
            const dedupedConversations = dedupeConversations(conversationsWithCache);
            setAllUsers(users);
            setConversations(prev => sortConversationsByRecency(dedupedConversations, prev));
            setActiveConversation(prev => {
                if (!prev) return prev;
                const updated = dedupedConversations.find(c => c.id === prev.id) || enrichedConversations.find(c => c.id === prev.id);
                return updated ? updated : hydrateConversation(prev, freshLookup);
            });
        } catch (error) {
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
                        const deduped = dedupeConversations(updated);
                        return sortConversationsByRecency(deduped, prev);
                    });
                }
            }
        } catch (error) {
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
            const lastMessage = {
                id: `${event.conversationId}-${event.timestamp}`,
                conversationId: event.conversationId,
                senderId: event.senderId || '',
                text: event.text,
                timestamp: event.timestamp,
            };
            let shouldRefreshConversations = false;
            setConversations(prev => {
                const existingIndex = prev.findIndex(conv => conv.id === event.conversationId);
                if (existingIndex === -1) {
                    shouldRefreshConversations = true;
                    return prev;
                }
                const updatedConversation = hydrateConversation({
                    ...prev[existingIndex],
                    lastMessage,
                });
                const remaining = prev.filter((_, idx) => idx !== existingIndex);
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
            if (shouldRefreshConversations) {
                loadData({ suppressLoading: true });
            }
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

    const buildDirectConversationKey = useCallback((ids: (string | number | undefined)[]) => {
        return ids
            .map(id => (id === null || id === undefined ? null : String(id)))
            .filter((id): id is string => Boolean(id))
            .sort()
            .join('|');
    }, []);

    const findExistingDirectConversation = useCallback((selectedUserId: string) => {
        if (!user) return null;
        const desiredKey = buildDirectConversationKey([user.id, selectedUserId]);
        return conversations.find(conv => {
            if (!shouldTreatAsDirect(conv)) {
                return false;
            }
            const key = buildDirectConversationKey(conv.participantIds || []);
            return key === desiredKey;
        }) || null;
    }, [buildDirectConversationKey, conversations, user]);

    const handleSelectConversation = (conversation: ChatConversation) => {
        setActiveConversation(hydrateConversation(conversation));
    };

    const handleSelectUser = useCallback(async (selectedUser: User) => {
        if (!user) return;
        const existing = findExistingDirectConversation(selectedUser.id);
        if (existing) {
            const hydrated = hydrateConversation(existing);
            updateConversationRecency(existing.id, existing.lastMessage?.timestamp, true);
            setActiveConversation(hydrated);
            setConversations(prev => {
                const index = prev.findIndex(conv => conv.id === hydrated.id);
                const nextList = index === -1
                    ? [...prev, hydrated]
                    : prev.map(conv => (conv.id === hydrated.id ? hydrated : conv));
                return sortConversationsByRecency(nextList, prev);
            });
            setMessagesRefreshTrigger(Date.now());
            return;
        }
        try {
            const baseConversation = await DataService.getOrCreateDirectConversation(user.id, selectedUser.id);
            const conversation = hydrateConversation(baseConversation);
            updateConversationRecency(conversation.id, conversation.lastMessage?.timestamp, true);
            setActiveConversation(conversation);
            setConversations(prev => {
                const exists = prev.some(c => c.id === conversation.id);
                const nextList = exists ? prev.map(conv => (conv.id === conversation.id ? conversation : conv)) : [...prev, conversation];
                return sortConversationsByRecency(nextList, prev);
            });
            setMessagesRefreshTrigger(Date.now());
        } catch (error) {
        }
    }, [user, findExistingDirectConversation, hydrateConversation, sortConversationsByRecency, updateConversationRecency]);
    
    const handleGroupCreated = useCallback((createdConversation?: ChatConversation) => {
        if (createdConversation) {
            const hydrated = hydrateConversation(createdConversation);
            updateConversationRecency(hydrated.id, hydrated.lastMessage?.timestamp, true);
            setConversations(prev => {
                const exists = prev.some(conv => conv.id === hydrated.id);
                const nextList = exists
                    ? prev.map(conv => (conv.id === hydrated.id ? hydrated : conv))
                    : [...prev, hydrated];
                return sortConversationsByRecency(nextList, prev);
            });
            setActiveConversation(hydrated);
            setMessagesRefreshTrigger(Date.now());
        }
        loadData({ suppressLoading: true });
    }, [hydrateConversation, updateConversationRecency, sortConversationsByRecency, loadData]);

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