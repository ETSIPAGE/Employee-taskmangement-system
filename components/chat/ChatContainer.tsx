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

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userConversations = await DataService.getConversationsForUserApi(user.id);
            const users = await DataService.getUsers();
            const sorted = [...userConversations].sort((a, b) => {
                const at = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                const bt = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                return bt - at;
            });
            const unique: ChatConversation[] = Array.from(
                new Map<string, ChatConversation>(
                    sorted.map((c: ChatConversation) => [c.id, c] as [string, ChatConversation])
                ).values()
            );
            const coalesced = coalesceDirectConversations(unique);
            setConversations(coalesced);
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

    // If notifications arrived while chat UI was closed, refresh once on mount
    useEffect(() => {
        try {
            const flag = sessionStorage.getItem('ets-chat-needs-refresh');
            if (flag === '1') {
                loadData();
                sessionStorage.removeItem('ets-chat-needs-refresh');
            }
        } catch {}
    }, [loadData]);

    // Refresh conversations only when header triggers a refresh on login
    useEffect(() => {
        const handler = () => { loadData(); };
        window.addEventListener('ets-chat-refresh', handler as any);
        return () => {
            window.removeEventListener('ets-chat-refresh', handler as any);
        };
    }, [loadData]);

    // Container-level WebSocket to update sidebar on any incoming message
    useEffect(() => {
        if (!user) return;
        const token = (AuthService as any)?.getToken ? (AuthService as any).getToken() : '';
        const base = 'wss://4axwbl20th.execute-api.ap-south-1.amazonaws.com/dev';
        const wsUrl = `${base}?token=${encodeURIComponent(token || '')}`;
        let attempt = 0;
        let closed = false;
        let socket: WebSocket | null = null;

        const connect = () => {
            if (closed) return;
            try { socket = new WebSocket(wsUrl); } catch { return; }
            socket.onopen = () => { /* noop */ };
            socket.onclose = () => {
                if (!closed) {
                    attempt += 1;
                    setTimeout(connect, Math.min(1000 * Math.pow(2, attempt), 8000));
                }
            };
            socket.onerror = () => { /* noop */ };
            socket.onmessage = (evt) => {
                try {
                    const msg = JSON.parse((evt as MessageEvent).data as string);
                    const convId = String((msg && (msg.conversationId || msg.conversation_id || msg.convId)) || '');
                    const text = String((msg && (msg.text || msg.message || msg.body)) || '');
                    const ts = String((msg && (msg.timestamp || msg.createdAt || msg.created_at)) || new Date().toISOString());
                    const looksLikeMessage = msg && (msg.type === 'newMessage' || msg.action === 'broadcastMessage' || convId);
                    if (!looksLikeMessage) return;

                    setConversations(prev => {
                        if (!convId) return prev;
                        const found = prev.find(c => c.id === convId);
                        if (!found) {
                            const placeholder: ChatConversation = {
                                id: convId,
                                type: 'direct',
                                participantIds: [user!.id, String((msg && (msg.senderId || msg.sender_id || msg.userId || msg.user_id)) || '')].filter(Boolean),
                                lastMessage: { text, timestamp: ts } as any,
                            } as ChatConversation;
                            const nextNew = [placeholder, ...prev];
                            const dedupNew: ChatConversation[] = Array.from(
                                new Map<string, ChatConversation>(
                                    nextNew.map((c: ChatConversation) => [c.id, c] as [string, ChatConversation])
                                ).values()
                            );
                            const coalesced = coalesceDirectConversations(dedupNew);
                            return coalesced;
                        }
                        const next = prev.map(c => c.id === convId ? { ...c, lastMessage: { ...(c.lastMessage || {} as any), text, timestamp: ts } } : c);
                        next.sort((a, b) => {
                            const at = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                            const bt = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                            return bt - at;
                        });
                        const dedupNext: ChatConversation[] = Array.from(
                            new Map<string, ChatConversation>(
                                next.map((c: ChatConversation) => [c.id, c] as [string, ChatConversation])
                            ).values()
                        );
                        const coalesced = coalesceDirectConversations(dedupNext);
                        return coalesced;
                    });
                } catch {}
            };
        };

        // small defer to avoid mount/unmount flaps
        const t = setTimeout(connect, 100);
        return () => {
            closed = true;
            clearTimeout(t);
            try { socket && socket.close(); } catch {}
        };
    }, [user, loadData]);

    // Also react to global background events from AuthContext
    useEffect(() => {
        if (!user) return;
        const handler = (e: any) => {
            try {
                const detail = (e && e.detail) || {};
                const convId = String(detail.conversationId || '');
                const text = String(detail.message?.text || '');
                const ts = String(detail.message?.timestamp || new Date().toISOString());
                if (!convId) return;
                setConversations(prev => {
                    const found = prev.find(c => c.id === convId);
                    if (!found) return prev;
                    const next = prev.map(c => c.id === convId ? { ...c, lastMessage: { ...(c.lastMessage || {} as any), text, timestamp: ts } } : c);
                    next.sort((a, b) => {
                        const at = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                        const bt = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                        return bt - at;
                    });
                    return next;
                });
            } catch {}
        };
        window.addEventListener('ets-chat-incoming', handler as any);
        return () => { window.removeEventListener('ets-chat-incoming', handler as any); };
    }, [user]);

    const handleSelectConversation = (conversation: ChatConversation) => {
        setActiveConversation(conversation);
    };

    const handleSelectUser = async (selectedUser: User) => {
        if (!user) return;
        // Try to reuse an existing direct conversation between the two users
        const existing = conversations.find(c => c.type === 'direct' && c.participantIds.length === 2 && c.participantIds.includes(user.id) && c.participantIds.includes(selectedUser.id));
        if (existing) {
            setActiveConversation(existing);
            return;
        }
        // Create a new conversation via API so both users are connected server-side
        try {
            const created = await DataService.createConversationApi('', [user.id, selectedUser.id]);
            setActiveConversation(created);
            // Reload to include it in the sidebar and to fetch lastMessage
            loadData();
        } catch (e) {
            console.error('Failed to create conversation via API:', e);
        }
    };
    
    const handleConversationActivity = (conversationId: string, text: string, timestamp: string) => {
        setConversations(prev => {
            const next = prev.map(c => c.id === conversationId
                ? { ...c, lastMessage: { ...(c.lastMessage || {} as any), text, timestamp } }
                : c);
            next.sort((a, b) => {
                const at = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                const bt = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                return bt - at;
            });
            return next;
        });
    };
    
    const handleGroupCreated = () => {
        loadData();
    };

    if (!user) {
        return null;
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
                        onConversationActivity={handleConversationActivity}
                    />
                )}
            </div>
        </div>
    );
};

export default ChatContainer;

// Helper: collapse multiple direct conversations between same user pair into a single entry
function coalesceDirectConversations(convs: ChatConversation[]): ChatConversation[] {
    const byKey = new Map<string, ChatConversation>();
    for (const c of convs) {
        // Only coalesce true direct conversations; keep groups (even 2-person) separate
        if (c.type !== 'direct' || !Array.isArray(c.participantIds) || c.participantIds.length !== 2) {
            byKey.set(c.id, c);
            continue;
        }
        const [a, b] = c.participantIds.map(String).sort();
        const key = `dm:${a}:${b}`;
        const cur = byKey.get(key);
        if (!cur) { byKey.set(key, c); continue; }
        const ct = cur.lastMessage?.timestamp ? new Date(cur.lastMessage.timestamp).getTime() : 0;
        const nt = c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).getTime() : 0;
        if (nt >= ct) byKey.set(key, c);
    }
    // Sort by latest lastMessage desc
    const list = Array.from(byKey.values());
    list.sort((a, b) => {
        const at = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const bt = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return bt - at;
    });
    return list;
}
