import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatConversation, ChatMessage, User } from '../../types';
import * as DataService from '../../services/dataService';
import { chatSocket, ChatSocketEvent } from '../../services/chatSocket';

interface ChatWindowProps {
    conversation: ChatConversation;
    currentUser: User;
    onBack: () => void;
    allUsers: User[];
    refreshKey?: number;
    pendingMessages?: ChatMessage[];
    cachedMessages?: ChatMessage[];
    onPendingConsumed?: (conversationId: string) => void;
    onMessagesFetched?: (conversationId: string, messages: ChatMessage[], append: boolean) => void;
    onLocalMessage?: (conversationId: string, message: ChatMessage) => void;
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const normalizeMessageText = (text?: string) => (text || '').trim().toLowerCase();

const DUPLICATE_WINDOW_MS = 60 * 1000;
const LOCAL_ECHO_WINDOW_MS = 5 * 1000;
const REMOTE_DUP_WINDOW_MS = 800;

const getMessageTime = (message: ChatMessage) => {
    const value = new Date(message.timestamp).getTime();
    return Number.isFinite(value) ? value : 0;
};

export const areMessagesEquivalent = (a: ChatMessage, b: ChatMessage) => {
    if (a === b) return true;
    if (a.id && b.id && a.id === b.id) return true;
    if (a.conversationId !== b.conversationId) return false;
    if (normalizeMessageText(a.text) !== normalizeMessageText(b.text)) return false;

    const isLocalA = Boolean(a.isLocal);
    const isLocalB = Boolean(b.isLocal);
    if (isLocalA === isLocalB) {
        return false;
    }

    const localMessage = isLocalA ? a : b;
    const remoteMessage = isLocalA ? b : a;

    const localTime = getMessageTime(localMessage);
    const remoteTime = getMessageTime(remoteMessage);
    if (!localTime || !remoteTime) return false;
    if (Math.abs(remoteTime - localTime) > LOCAL_ECHO_WINDOW_MS) return false;
    
    if (localMessage.senderId && remoteMessage.senderId && localMessage.senderId !== remoteMessage.senderId) return false;
    return true;
};

export const dedupeMessages = (messages: ChatMessage[]): ChatMessage[] => {
    const sorted = messages.slice().sort((a, b) => getMessageTime(a) - getMessageTime(b));
    const result: ChatMessage[] = [];

    const getRemoteDedupKey = (message: ChatMessage) => {
        const timestampKey = message.timestamp ? new Date(message.timestamp).toISOString() : String(getMessageTime(message));
        return `${message.conversationId}|${timestampKey}|${normalizeMessageText(message.text)}|${message.senderId || ''}`;
    };

    for (const msg of sorted) {
        const duplicateIndex = result.findIndex(existing => areMessagesEquivalent(existing, msg));
        if (duplicateIndex !== -1) {
            const existing = result[duplicateIndex];
            if (existing.isLocal && !msg.isLocal) {
                result[duplicateIndex] = msg;
            }
            continue;
        }

        if (!msg.isLocal) {
            const remoteIndex = result.findIndex(existing => !existing.isLocal && getRemoteDedupKey(existing) === getRemoteDedupKey(msg));
            if (remoteIndex !== -1) {
                const existing = result[remoteIndex];
                if (getMessageTime(msg) >= getMessageTime(existing)) {
                    result[remoteIndex] = msg;
                }
                continue;
            }
        }
        result.push(msg);
    }
    return result;
};

export const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    return dedupeMessages([...existing, ...incoming]);
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onBack, allUsers, refreshKey, pendingMessages = [], cachedMessages = [], onPendingConsumed, onMessagesFetched, onLocalMessage }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageLoading, setMessageLoading] = useState(false);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // FIX: Explicitly type usersMap to resolve issues where its values are inferred as 'unknown'.
    const usersMap: Map<string, User> = new Map(allUsers.map(u => [u.id, u]));

    const loadMessages = useCallback(async (conversationId: string, token?: string | null, append: boolean = false) => {
        setMessageLoading(true);
        try {
            const response = await DataService.getMessagesForConversation(conversationId, token || undefined);
            console.log('ChatWindow loadMessages fetched items', {
                conversationId,
                fetchedCount: response.items?.length || 0,
                append,
            });
            const incoming = response.items || [];
            setMessages(prev => {
                const merged = mergeMessages(prev, incoming);
                console.log('ChatWindow loadMessages merged result', {
                    conversationId,
                    totalCount: merged.length,
                    lastMessage: merged[merged.length - 1],
                });
                return merged;
            });
            if (onMessagesFetched && response.items) {
                onMessagesFetched(conversationId, response.items, append);
            }
            setNextToken(response.nextToken);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setMessageLoading(false);
        }
    }, [onMessagesFetched]);

    useEffect(() => {
        setMessages([]);
    }, [conversation.id]);

    useEffect(() => {
        loadMessages(conversation.id);
    }, [conversation.id, loadMessages]);

    useEffect(() => {
        if (refreshKey === undefined) return;
        loadMessages(conversation.id);
    }, [refreshKey, conversation.id, loadMessages]);

    useEffect(() => {
        const combined = [...(cachedMessages || []), ...(pendingMessages || [])];
        if (!combined.length) {
            return;
        }
        setMessages(prev => {
            const merged = mergeMessages(prev, combined);
            console.log('ChatWindow merged external messages', {
                added: combined.length,
                fromPending: pendingMessages?.length || 0,
                fromCached: cachedMessages?.length || 0,
                totalCount: merged.length,
            });
            return merged;
        });
        if (pendingMessages.length && onPendingConsumed) {
            onPendingConsumed(conversation.id);
        }
    }, [pendingMessages, cachedMessages, conversation.id, onPendingConsumed]);

    useEffect(() => {
        const listener = (event: ChatSocketEvent) => {
            if (event.type !== 'newMessage' || event.conversationId !== conversation.id || !event.timestamp) {
                return;
            }
            console.log('Chat message received', event);
            const incoming: ChatMessage = {
                id: `${event.conversationId}-${event.timestamp}`,
                conversationId: event.conversationId,
                senderId: event.senderId || '',
                text: event.text || '',
                timestamp: event.timestamp,
            };
            if ((event.senderId || '') === currentUser.id) {
                console.log('Chat message send success', incoming);
            } else {
                console.log('Chat message receive success', incoming);
            }
            setMessages(prev => {
                const merged = mergeMessages(prev, [incoming]);
                console.log('ChatWindow listener merged messages', {
                    totalCount: merged.length,
                    lastMessage: merged[merged.length - 1],
                });
                return merged;
            });
        };
        chatSocket.addListener(listener);
        return () => {
            chatSocket.removeListener(listener);
        };
    }, [conversation.id]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const messageText = newMessage.trim();
            const optimisticMessage: ChatMessage = {
                id: `local-${Date.now()}`,
                conversationId: conversation.id,
                senderId: currentUser.id,
                text: messageText,
                timestamp: new Date().toISOString(),
                isLocal: true,
            };
            const sent = chatSocket.sendMessage(conversation.id, messageText);
            console.log('Chat message send initiated', { conversationId: conversation.id, messageText, sent });
            setMessages(prev => mergeMessages(prev, [optimisticMessage]));
            if (onLocalMessage) {
                onLocalMessage(conversation.id, optimisticMessage);
            }
            setNewMessage('');
        }
    };

    const handleLoadMore = () => {
        if (nextToken && !messageLoading) {
            loadMessages(conversation.id, nextToken, true);
        }
    };
    
    const getConversationName = () => {
        // FIX: Handle case where a group conversation name may be undefined.
        if (conversation.type === 'group') return conversation.name || 'Group Chat';
        const otherUserId = conversation.participantIds.find(id => id !== currentUser.id);
        return usersMap.get(otherUserId || '')?.name || 'Chat';
    };

    return (
        <div className="w-full flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center p-3 border-b flex-shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 mr-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m7 7H3" /></svg>
                </button>
                <h3 className="font-bold text-slate-800">{getConversationName()}</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                    const sender = usersMap.get(msg.senderId);
                    const isCurrentUser = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUser && (
                                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                    {sender ? getInitials(sender.name) : '?'}
                                </div>
                            )}
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                {!isCurrentUser && sender && conversation.type === 'group' && (
                                    <p className="text-xs font-bold text-indigo-700 mb-1">{sender.name}</p>
                                )}
                                <p>{msg.text}</p>
                                <p className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-500'} text-right`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
