import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ChatConversation,
    ChatMessage,
    User,
    UserRole,
} from '../../types';
import * as DataService from '../../services/dataService';
import { chatSocket, ChatSocketEvent } from '../../services/chatSocket';
import { useAuth } from '../../hooks/useAuth';
import ChatSidebar from './ChatSidebar';
import ChatWindow, { areMessagesEquivalent, mergeMessages } from './ChatWindow';

interface ChatContainerProps {
    onClose: () => void;
    refreshKey?: number;
    isOpen?: boolean;
}

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
    message: string;
    type: ToastVariant;
}

type MemberModalMode = 'add' | 'remove' | 'view';

interface MemberOption {
    id: string;
    label: string;
}

interface MemberModalState {
    conversation: ChatConversation;
    mode: MemberModalMode;
    options: MemberOption[];
    selectedIds: string[];
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

const mergeMessagesById = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    return mergeMessages(existing, incoming);
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
    const [renameModal, setRenameModal] = useState<{ conversation: ChatConversation; value: string } | null>(null);
    const [renameSubmitting, setRenameSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [memberModal, setMemberModal] = useState<MemberModalState | null>(null);
    const [memberModalSubmitting, setMemberModalSubmitting] = useState(false);

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

    const removeConversationFromState = useCallback((conversationId: string) => {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        setActiveConversation(prev => (prev?.id === conversationId ? null : prev));
        setCachedMessages(prev => {
            if (!prev[conversationId]) {
                return prev;
            }
            const { [conversationId]: _removed, ...rest } = prev;
            cachedMessagesRef.current = rest;
            return rest;
        });
        setPendingMessages(prev => {
            if (!prev[conversationId]) {
                return prev;
            }
            const { [conversationId]: _removed, ...rest } = prev;
            return rest;
        });
        if (cachedMessagesRef.current[conversationId]) {
            const { [conversationId]: _removed, ...rest } = cachedMessagesRef.current;
            cachedMessagesRef.current = rest;
        }
        if (recencyMapRef.current[conversationId]) {
            delete recencyMapRef.current[conversationId];
            persistRecencyMap();
        }
    }, [persistRecencyMap]);

    const clearConversationState = useCallback((conversationId: string) => {
        setCachedMessages(prev => {
            if (!prev[conversationId]) {
                return prev;
            }
            const { [conversationId]: _removed, ...rest } = prev;
            cachedMessagesRef.current = rest;
            return rest;
        });
        setPendingMessages(prev => {
            if (!prev[conversationId]) {
                return prev;
            }
            const { [conversationId]: _removed, ...rest } = prev;
            return rest;
        });
        setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, lastMessage: undefined } : conv));
        if (recencyMapRef.current[conversationId]) {
            delete recencyMapRef.current[conversationId];
            persistRecencyMap();
        }
    }, [persistRecencyMap]);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        };
    }, []);

    const showToast = useCallback((message: string, type: ToastVariant = 'info') => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToastMessage({ message, type });
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
            toastTimeoutRef.current = null;
        }, 4000);
    }, []);

    const dismissToast = useCallback(() => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastMessage(null);
    }, []);

    const handleConversationDeletion = useCallback(async (conversation: ChatConversation, typeOverride?: 'chat' | 'group') => {
        const conversationType = typeOverride || (conversation.type === 'group' ? 'group' : 'chat');
        try {
            const requesterRole = user?.role;
            await DataService.deleteConversation(conversation.id, conversationType, requesterRole);
            removeConversationFromState(conversation.id);
            loadDataRef.current({ suppressLoading: true });
            chatSocket.notifyConversationDeleted(conversation.id);
            showToast('Conversation deleted.', 'success');
        } catch (error) {
            console.error('Failed to delete conversation', { conversationId: conversation.id, error });
            showToast('Failed to delete conversation. Please try again.', 'error');
        }
    }, [removeConversationFromState, showToast, user]);

    const handleDirectDeletion = useCallback((conversation: ChatConversation) => {
        handleConversationDeletion(conversation, 'chat');
    }, [handleConversationDeletion]);

    const handleGroupDeletion = useCallback((conversation: ChatConversation) => {
        handleConversationDeletion(conversation, 'group');
    }, [handleConversationDeletion]);

    const handleClearConversation = useCallback(async (conversation: ChatConversation) => {
        const conversationType = conversation.type === 'group' ? 'group' : 'chat';
        try {
            const requesterRole = user?.role;
            await DataService.clearConversation(conversation.id, conversationType, requesterRole);
            clearConversationState(conversation.id);
            setActiveConversation(prev => (prev?.id === conversation.id ? { ...prev, lastMessage: undefined } : prev));
            setMessagesRefreshTrigger(Date.now());
            loadDataRef.current({ suppressLoading: true });
            chatSocket.notifyConversationCleared(conversation.id);
            showToast('Conversation cleared.', 'success');
        } catch (error) {
            console.error('Failed to clear conversation', { conversationId: conversation.id, error });
            showToast('Failed to clear conversation. Please try again.', 'error');
        }
    }, [clearConversationState, showToast, user]);

    const handleGroupRename = useCallback((conversation: ChatConversation) => {
        const currentName = conversation.name?.trim() || '';
        setRenameModal({ conversation, value: currentName });
    }, []);

    const handleAddGroupMember = useCallback((conversation: ChatConversation) => {
        const availableUsers = allUsers
            .filter(userRecord => !(conversation.participantIds || []).includes(userRecord.id))
            .map<MemberOption>(userRecord => ({
                id: userRecord.id,
                label: formatUserDisplayName(userRecord),
            }));

        if (availableUsers.length === 0) {
            showToast('All users are already in this group.', 'info');
            return;
        }

        setMemberModal({
            conversation,
            mode: 'add',
            options: availableUsers,
            selectedIds: [availableUsers[0].id],
        });
        setMemberModalSubmitting(false);
    }, [allUsers, showToast]);

    const handleViewGroupDetails = useCallback((conversation: ChatConversation) => {
        const participantOptions = (conversation.participantIds || []).map<MemberOption>(id => {
            const userRecord = allUsers.find(userEntry => userEntry.id === id);
            const displayName = userRecord ? formatUserDisplayName(userRecord) : id;
            const isAdmin = (conversation.adminIds || []).includes(id);
            return {
                id,
                label: `${displayName}${isAdmin ? ' (Admin)' : ''}`,
            };
        });

        setMemberModal({
            conversation,
            mode: 'view',
            options: participantOptions,
            selectedIds: [],
        });
        setMemberModalSubmitting(false);
    }, [allUsers]);

    const handleRemoveGroupMember = useCallback((conversation: ChatConversation) => {
        const participants = (conversation.participantIds || [])
            .map<MemberOption>(id => {
                const userRecord = allUsers.find(userEntry => userEntry.id === id);
                return {
                    id,
                    label: userRecord ? formatUserDisplayName(userRecord) : id,
                };
            });

        if (participants.length === 0) {
            showToast('No members available to remove.', 'info');
            return;
        }

        setMemberModal({
            conversation,
            mode: 'remove',
            options: participants,
            selectedIds: [participants[0].id],
        });
        setMemberModalSubmitting(false);
    }, [allUsers, showToast]);

    const handleRenameValueChange = useCallback((value: string) => {
        setRenameModal(prev => (prev ? { ...prev, value } : prev));
    }, []);

    const handleRenameModalClose = useCallback(() => {
        setRenameModal(null);
        setRenameSubmitting(false);
    }, []);

    const handleRenameModalSubmit = useCallback(async () => {
        if (!renameModal || !user) return;
        const trimmed = renameModal.value.trim();
        if (!trimmed) {
            showToast('Group name cannot be empty.', 'warning');
            return;
        }
        if (trimmed === (renameModal.conversation.name?.trim() || '')) {
            handleRenameModalClose();
            return;
        }
        try {
            setRenameSubmitting(true);
            const requesterRole = user.role;
            await DataService.renameGroupConversation(renameModal.conversation.id, trimmed, requesterRole);
            setConversations(prev => prev.map(conv => (conv.id === renameModal.conversation.id ? { ...conv, name: trimmed } : conv)));
            setActiveConversation(prev => (prev?.id === renameModal.conversation.id ? { ...prev, name: trimmed } : prev));
            showToast('Group name updated.', 'success');
            handleRenameModalClose();
        } catch (error) {
            console.error('Failed to rename group conversation', { conversationId: renameModal.conversation.id, error });
            showToast('Failed to rename group. Please try again.', 'error');
            setRenameSubmitting(false);
        }
    }, [handleRenameModalClose, renameModal, showToast, user]);

    const handleMemberSelectionChange = useCallback((selectedValues: string[]) => {
        setMemberModal(prev => (prev ? { ...prev, selectedIds: selectedValues } : prev));
    }, []);

    const handleMemberModalClose = useCallback(() => {
        setMemberModal(null);
        setMemberModalSubmitting(false);
    }, []);

    const handleMemberModalSubmit = useCallback(async () => {
        if (!memberModal) {
            return;
        }

        if (memberModal.mode === 'view') {
            handleMemberModalClose();
            return;
        }

        if ((memberModal.mode === 'add' || memberModal.mode === 'remove') && (!memberModal.selectedIds.length || !user)) {
            return;
        }

        try {
            setMemberModalSubmitting(true);
            const requesterRole = user.role;
            if (memberModal.mode === 'add') {
                await Promise.all(memberModal.selectedIds.map(id => DataService.addGroupMember(memberModal.conversation.id, id, requesterRole)));
                setConversations(prev => prev.map(conv => (conv.id === memberModal.conversation.id
                    ? {
                        ...conv,
                        participantIds: Array.from(new Set([...(conv.participantIds || []), ...memberModal.selectedIds])),
                    }
                    : conv)));
                setActiveConversation(prev => (prev?.id === memberModal.conversation.id
                    ? {
                        ...prev,
                        participantIds: Array.from(new Set([...(prev.participantIds || []), ...memberModal.selectedIds])),
                    }
                    : prev));
                showToast('Selected members added to the group.', 'success');
            } else {
                await Promise.all(memberModal.selectedIds.map(id => DataService.removeGroupMember(memberModal.conversation.id, id, requesterRole)));
                setConversations(prev => prev.map(conv => (conv.id === memberModal.conversation.id
                    ? {
                        ...conv,
                        participantIds: (conv.participantIds || []).filter(id => !memberModal.selectedIds.includes(id)),
                        adminIds: (conv.adminIds || []).filter(id => !memberModal.selectedIds.includes(id)),
                    }
                    : conv)));
                setActiveConversation(prev => (prev?.id === memberModal.conversation.id
                    ? {
                        ...prev,
                        participantIds: (prev.participantIds || []).filter(id => !memberModal.selectedIds.includes(id)),
                        adminIds: (prev.adminIds || []).filter(id => !memberModal.selectedIds.includes(id)),
                    }
                    : prev));
                showToast('Selected members removed from the group.', 'success');
            }
            handleMemberModalClose();
        } catch (error) {
            console.error('Failed to update group member', {
                conversationId: memberModal.conversation.id,
                memberIds: memberModal.selectedIds,
                mode: memberModal.mode,
                error,
            });
            showToast('Operation failed. Please try again.', 'error');
            setMemberModalSubmitting(false);
        }
    }, [memberModal, user, showToast, handleMemberModalClose, setConversations, setActiveConversation]);

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
            const conversationsWithLastMessage = await Promise.all(userConversations.map(async conv => {
                if (conv.lastMessage?.timestamp) {
                    return conv;
                }
                const cached = cachedMessagesRef.current[conv.id];
                const cachedLast = cached && cached.length ? cached[cached.length - 1] : undefined;
                if (cachedLast?.timestamp) {
                    console.log('ChatContainer resolved last message from cache', {
                        conversationId: conv.id,
                        timestamp: cachedLast.timestamp,
                    });
                    return { ...conv, lastMessage: cachedLast };
                }
                try {
                    const response = await DataService.getMessagesForConversation(conv.id, undefined, 1);
                    const latest = response.items && response.items.length ? response.items[response.items.length - 1] : undefined;
                    if (latest?.timestamp) {
                        console.log('ChatContainer resolved missing last message via fetch', {
                            conversationId: conv.id,
                            timestamp: latest.timestamp,
                        });
                        return { ...conv, lastMessage: latest };
                    }
                } catch (error) {
                    console.error('ChatContainer failed to resolve last message', {
                        conversationId: conv.id,
                        error,
                    });
                }
                return conv;
            }));
            console.log('ChatContainer fetched conversation last messages', conversationsWithLastMessage.map(conv => ({
                conversationId: conv.id,
                lastMessageText: conv.lastMessage?.text || 'No messages yet.',
                lastMessageTimestamp: conv.lastMessage?.timestamp,
            })));
            const freshLookup = new Map(users.map(u => [u.id, u]));
            const enrichedConversations = conversationsWithLastMessage.map(conv => hydrateConversation(conv, freshLookup));
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
            if (!event.conversationId) {
                return;
            }

            const eventType = event.type || event.action;

            if (eventType === 'conversationCleared') {
                clearConversationState(event.conversationId);
                setMessagesRefreshTrigger(Date.now());
                loadData({ suppressLoading: true });
                return;
            }

            if (eventType === 'conversationDeleted') {
                removeConversationFromState(event.conversationId);
                loadData({ suppressLoading: true });
                return;
            }

            if (eventType !== 'newMessage' || !event.text || !event.timestamp) {
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
            const isActiveOpen = isOpen && activeConversation?.id === event.conversationId;
            if (shouldRefreshConversations) {
                loadData({ suppressLoading: true });
            }
            setCachedMessages(prev => {
                if (isActiveOpen) {
                    return prev;
                }
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
                if (isActiveOpen) {
                    return prev;
                }
                const existing = prev[event.conversationId] || [];
                const withoutLocalEcho = filterOutMatchingLocalEchoes(existing, incomingMessage);
                const merged = mergeMessagesById(withoutLocalEcho, [incomingMessage]);
                const updated = { ...prev, [event.conversationId]: merged };
                return updated;
            });
        };
        chatSocket.addListener(listener);
        return () => {
            chatSocket.removeListener(listener);
        };
    }, [user, hydrateConversation, sortConversationsByRecency, updateConversationRecency, isOpen, activeConversation, clearConversationState, loadData, removeConversationFromState]);

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
        <div className="flex h-full flex-col relative">
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
                        onClearConversation={handleClearConversation}
                        onDeleteConversation={handleDirectDeletion}
                        onAddGroupMember={handleAddGroupMember}
                        onRemoveGroupMember={handleRemoveGroupMember}
                        onDeleteGroup={handleGroupDeletion}
                        onEditGroupName={handleGroupRename}
                        onViewGroupDetails={handleViewGroupDetails}
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

            {renameModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Rename Group</h3>
                        <label className="block text-sm font-medium text-slate-600 mb-2" htmlFor="rename-group-input">
                            New group name
                        </label>
                        <input
                            id="rename-group-input"
                            type="text"
                            value={renameModal.value}
                            onChange={(event) => handleRenameValueChange(event.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter a group name"
                            disabled={renameSubmitting}
                            autoFocus
                        />
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleRenameModalClose}
                                className="px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                                disabled={renameSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRenameModalSubmit}
                                className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70"
                                disabled={renameSubmitting}
                            >
                                {renameSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {memberModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                            {memberModal.mode === 'add' ? 'Add Group Member' : 'Remove Group Member'}
                        </h3>
                        <label className="block text-sm font-medium text-slate-600 mb-2" htmlFor="member-select">
                            {memberModal.mode === 'add' ? 'Select a user to add' : 'Select a user to remove'}
                        </label>
                        <select
                            id="member-select"
                                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={memberModal.selectedId ?? ''}
                            onChange={(event) => handleMemberSelectionChange(event.target.value)}
                            disabled={memberModalSubmitting || memberModal.mode === 'view'}
                        >
                            {memberModal.options.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {memberModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        {(() => {
                            const isView = memberModal.mode === 'view';
                            const title = isView
                                ? `Group Members (${memberModal.options.length})`
                                : memberModal.mode === 'add'
                                    ? 'Add Group Members'
                                    : 'Remove Group Members';
                            const helper = isView
                                ? 'All members currently in this group'
                                : memberModal.mode === 'add'
                                    ? 'Select one or more users to add'
                                    : 'Select one or more users to remove';

                            return (
                                <>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
                                    <label className="block text-sm font-medium text-slate-600 mb-2" htmlFor="member-select">
                                        {helper}
                                    </label>
                                    {isView ? (
                                        <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto">
                                            {memberModal.options.length === 0 ? (
                                                <p className="px-3 py-2 text-sm text-slate-500">No members found.</p>
                                            ) : (
                                                <ul className="divide-y divide-slate-200">
                                                    {memberModal.options.map(option => (
                                                        <li key={option.id} className="px-3 py-2 text-sm text-slate-700">
                                                            {option.label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto">
                                            {memberModal.options.length === 0 ? (
                                                <p className="px-3 py-2 text-sm text-slate-500">No users available.</p>
                                            ) : (
                                                <ul className="divide-y divide-slate-200">
                                                    {memberModal.options.map(option => {
                                                        const checked = memberModal.selectedIds.includes(option.id);
                                                        return (
                                                            <li key={option.id} className="px-3 py-2 text-sm text-slate-700 flex items-center space-x-3">
                                                                <label className="inline-flex items-center space-x-2 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                                        checked={checked}
                                                                        onChange={() => {
                                                                            handleMemberSelectionChange(checked
                                                                                ? memberModal.selectedIds.filter(id => id !== option.id)
                                                                                : [...memberModal.selectedIds, option.id]);
                                                                        }}
                                                                        disabled={memberModalSubmitting}
                                                                    />
                                                                    <span>{option.label}</span>
                                                                </label>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                        <div className="mt-6 flex justify-end space-x-3">
                            {memberModal.mode !== 'view' && (
                                <button
                                    type="button"
                                    onClick={handleMemberModalClose}
                                    className="px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
                                    disabled={memberModalSubmitting}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleMemberModalSubmit}
                                className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70"
                                disabled={memberModalSubmitting || (memberModal.mode !== 'view' && memberModal.selectedIds.length === 0)}
                            >
                                {memberModal.mode === 'view' ? 'Close' : memberModalSubmitting ? 'Saving…' : memberModal.mode === 'add' ? 'Add Members' : 'Remove Members'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div
                        className={`px-4 py-3 rounded-md shadow-lg text-white flex items-center space-x-3 ${
                            toastMessage.type === 'success'
                                ? 'bg-green-500'
                                : toastMessage.type === 'error'
                                    ? 'bg-red-500'
                                    : toastMessage.type === 'warning'
                                        ? 'bg-amber-500'
                                        : 'bg-blue-500'
                        }`}
                    >
                        <span>{toastMessage.message}</span>
                        <button
                            type="button"
                            onClick={dismissToast}
                            className="ml-2 text-white/80 hover:text-white"
                            aria-label="Dismiss toast"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatContainer;