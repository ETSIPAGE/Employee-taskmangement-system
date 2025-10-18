import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { getToken } from '../../services/authService';

interface ChatWindowProps {
    conversation: ChatConversation;
    currentUser: User;
    onBack: () => void;
    allUsers: User[];
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

interface ChatWindowProps {
    conversation: ChatConversation;
    currentUser: User;
    onBack: () => void;
    allUsers: User[];
    onConversationActivity?: (conversationId: string, text: string, timestamp: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onBack, allUsers, onConversationActivity }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const mergeRefreshTimer = useRef<number | null>(null);
    // FIX: Explicitly type usersMap to resolve issues where its values are inferred as 'unknown'.
    const usersMap: Map<string, User> = new Map(allUsers.map(u => [u.id, u]));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { items } = await DataService.getMessagesForConversationApi(conversation.id);
                if (!cancelled) {
                    setMessages((prev: ChatMessage[]) => {
                        const all = [...prev, ...(items as ChatMessage[])];
                        const sorted = all
                            .filter(Boolean)
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                        const kept: ChatMessage[] = [];
                        for (const msg of sorted) {
                            if (kept.some((m) => m.id === msg.id)) continue;
                            const msgTs = new Date(msg.timestamp).getTime();
                            let near: ChatMessage | undefined = undefined;
                            for (let i = kept.length - 1; i >= 0; i--) {
                                const k = kept[i];
                                if (k.senderId === msg.senderId && k.text === msg.text && Math.abs(msgTs - new Date(k.timestamp).getTime()) <= 15000) {
                                    near = k; break;
                                }
                            }
                            if (!near) { kept.push(msg); continue; }
                            const nearIsTemp = String(near.id).startsWith('temp-');
                            const msgIsTemp = String(msg.id).startsWith('temp-');
                            if (nearIsTemp && !msgIsTemp) { kept.splice(kept.indexOf(near), 1, msg); continue; }
                            if (!nearIsTemp && msgIsTemp) { continue; }
                        }
                        const last = kept[kept.length - 1];
                        if (last) { try { onConversationActivity && setTimeout(() => onConversationActivity(conversation.id, last.text, last.timestamp), 0); } catch {} }
                        return kept;
                    });
                }
                console.log(`[ChatWindow] Initial fetch OK for ${conversation.id}, items=${items.length}`);
            } catch {
                const fallback = DataService.getMessagesForConversation(conversation.id);
                if (!cancelled) {
                    setMessages((prev: ChatMessage[]) => {
                        const all = [...prev, ...fallback];
                        const sorted = all
                            .filter(Boolean)
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const kept: ChatMessage[] = [];
                        for (const msg of sorted) {
                            if (kept.some((m) => m.id === msg.id)) continue;
                            kept.push(msg);
                        }
                        return kept;
                    });
                }
                console.log(`[ChatWindow] Initial fetch FAILED for ${conversation.id}, using fallback items=${fallback.length}`);
            }
        })();
        return () => { cancelled = true; };
    }, [conversation.id]);

    // Mark this conversation as read while viewing
    useEffect(() => {
        const markRead = () => {
            try {
                const key = `ets-chat-lastread:${currentUser.id}:${conversation.id}`;
                const now = Date.now();
                localStorage.setItem(key, String(now));
                window.dispatchEvent(new CustomEvent('ets-chat-read', { detail: { conversationId: conversation.id, ts: now } }));
            } catch {}
        };
        // on mount and whenever messages change, mark read
        markRead();
        return () => { /* no-op */ };
    }, [conversation.id, messages.length]);

    useEffect(() => {
        let stopped = false;
        const poll = async () => {
            try {
                const { items } = await DataService.getMessagesForConversationApi(conversation.id);
                if (!stopped) {
                    setMessages((prev: ChatMessage[]) => {
                        const all = [...prev, ...(items as ChatMessage[])];
                        const sorted = all
                            .filter(Boolean)
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                        const kept: ChatMessage[] = [];
                        for (const msg of sorted) {
                            // If exact same id already kept, skip
                            if (kept.some(m => m.id === msg.id)) continue;
                            const msgTs = new Date(msg.timestamp).getTime();
                            // Collapse near-duplicates within 15s window by same sender+text
                            let near: ChatMessage | undefined = undefined;
                            for (let i = kept.length - 1; i >= 0; i--) {
                                const k = kept[i];
                                if (k.senderId === msg.senderId && k.text === msg.text && Math.abs(msgTs - new Date(k.timestamp).getTime()) <= 15000) {
                                    near = k; break;
                                }
                            }
                            if (!near) { kept.push(msg); continue; }
                            const nearIsTemp = String(near.id).startsWith('temp-');
                            const msgIsTemp = String(msg.id).startsWith('temp-');
                            if (nearIsTemp && !msgIsTemp) { kept.splice(kept.indexOf(near), 1, msg); continue; }
                            if (!nearIsTemp && msgIsTemp) { continue; }
                            // If both non-temp, keep the earlier one (already in kept)
                        }
                        const last = kept[kept.length - 1];
                        if (last) { try { onConversationActivity && setTimeout(() => onConversationActivity(conversation.id, last.text, last.timestamp), 0); } catch {} }
                        return kept;
                    });
                }
            } catch {}
        };
        const interval = setInterval(poll, 2000);
        // initial tick
        poll();
        return () => { stopped = true; clearInterval(interval); };
    }, [conversation.id]);

    useEffect(() => {
        const token = getToken() || '';
        const base = 'wss://4axwbl20th.execute-api.ap-south-1.amazonaws.com/dev';
        const wsUrl = `${base}?token=${encodeURIComponent(token)}`;
        let attempt = 0;
        let closed = false;
        let socket: WebSocket | null = null;

        const connect = () => {
            if (closed) return;
            const url = wsUrl;
            try { console.log('WS connect try', attempt + 1, url); } catch {}
            // small delay to mitigate StrictMode double-mount timing
            setTimeout(() => {
                if (closed) return;
                socket = new WebSocket(url);
                socket.onopen = () => {
                    try { console.log('WS open'); } catch {}
                    setWs(socket);
                };
                socket.onclose = () => {
                    try { console.log('WS close'); } catch {}
                    if (!closed) {
                        attempt += 1;
                        setTimeout(connect, Math.min(1000 * Math.pow(2, attempt), 8000));
                    }
                };
                socket.onerror = (e) => { try { console.log('WS error', e); } catch {} };
                socket.onmessage = (evt) => {
                    try {
                        const msg = JSON.parse(evt.data as string);
                        const convId = String((msg && (msg.conversationId || msg.conversation_id || msg.convId)) || '');
                        const text = String((msg && (msg.text || msg.message || msg.body)) || '');
                        const ts = String((msg && (msg.timestamp || msg.createdAt || msg.created_at)) || new Date().toISOString());
                        const sender = String((msg && (msg.senderId || msg.sender_id || msg.userId || msg.user_id)) || '');
                        const looksLikeMessage = msg && (msg.type === 'newMessage' || msg.action === 'broadcastMessage' || convId);
                        if (looksLikeMessage && convId === conversation.id) {
                            const mapped: ChatMessage = {
                                id: String(msg.id || msg.messageId || msg.msgId || `${convId}-${ts || Date.now()}`),
                                conversationId: convId,
                                senderId: sender,
                                text,
                                timestamp: ts,
                            };
                            setMessages((prev: ChatMessage[]) => {
                                // If a message with the same id already exists, ignore
                                if (prev.some((m) => m.id === mapped.id)) return prev;
                                const all = [...prev, mapped];
                                const sorted = all
                                    .filter(Boolean)
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                const kept: ChatMessage[] = [];
                                for (const msg of sorted) {
                                    const msgTs = new Date(msg.timestamp).getTime();
                                    // Find near-duplicates in kept within 3000ms by same sender+text (scan from end)
                                    let near: ChatMessage | undefined = undefined;
                                    for (let i = kept.length - 1; i >= 0; i--) {
                                        const k = kept[i];
                                        if (k.senderId === msg.senderId && k.text === msg.text && Math.abs(msgTs - new Date(k.timestamp).getTime()) <= 3000) {
                                            near = k; break;
                                        }
                                    }

                                    if (!near) {
                                        kept.push(msg);
                                        continue;
                                    }

                                    const nearIsTemp = String(near.id).startsWith('temp-');
                                    const msgIsTemp = String(msg.id).startsWith('temp-');

                                    // Prefer server message over optimistic temp
                                    if (nearIsTemp && !msgIsTemp) {
                                        // Replace the temp with server copy
                                        kept.splice(kept.indexOf(near), 1, msg);
                                        continue;
                                    }
                                    if (!nearIsTemp && msgIsTemp) {
                                        // Ignore temp if server copy already kept
                                        continue;
                                    }
                                    // Both server (different ids) within window -> keep first, drop current duplicate
                                    continue;
                                }
                                return kept;
                            });
                            try { onConversationActivity && onConversationActivity(mapped.conversationId, mapped.text, mapped.timestamp); } catch {}
                            console.log('[ChatWindow] WS receive newMessage:', mapped);
                        }
                    } catch {}
                };
            }, 150);
        };

        connect();

        return () => {
            closed = true;
            try { socket && socket.close(); } catch {}
        };
    }, [conversation.id]);

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {};
            const convId = String(detail.conversationId || '');
            const mapped = detail.message as ChatMessage | undefined;
            if (!convId || convId !== conversation.id) {
                // Debounced merge-refresh to handle servers that don't include convId in broadcast
                if (mergeRefreshTimer.current) { try { clearTimeout(mergeRefreshTimer.current as any); } catch {} }
                mergeRefreshTimer.current = window.setTimeout(async () => {
                    try {
                        const { items } = await DataService.getMessagesForConversationApi(conversation.id);
                        setMessages((prev: ChatMessage[]) => {
                            const all = [...prev, ...(items as ChatMessage[])];
                            const sorted = all
                                .filter(Boolean)
                                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            const kept: ChatMessage[] = [];
                            for (const msg of sorted) {
                                if (kept.some((m) => m.id === msg.id)) continue;
                                const msgTs = new Date(msg.timestamp).getTime();
                                let near: ChatMessage | undefined = undefined;
                                for (let i = kept.length - 1; i >= 0; i--) {
                                    const k = kept[i];
                                    if (k.senderId === msg.senderId && k.text === msg.text && Math.abs(msgTs - new Date(k.timestamp).getTime()) <= 15000) {
                                        near = k; break;
                                    }
                                }
                                if (!near) { kept.push(msg); continue; }
                                const nearIsTemp = String(near.id).startsWith('temp-');
                                const msgIsTemp = String(msg.id).startsWith('temp-');
                                if (nearIsTemp && !msgIsTemp) { kept.splice(kept.indexOf(near), 1, msg); continue; }
                                if (!nearIsTemp && msgIsTemp) { continue; }
                            }
                            return kept;
                        });
                    } catch {}
                }, 300);
                return;
            }
            if (!mapped) return;
            setMessages((prev: ChatMessage[]) => {
                if (prev.some((m) => m.id === mapped.id)) return prev;
                const all = [...prev, mapped];
                const sorted = all
                    .filter(Boolean)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const kept: ChatMessage[] = [];
                for (const msg of sorted) {
                    const msgTs = new Date(msg.timestamp).getTime();
                    let near: ChatMessage | undefined = undefined;
                    for (let i = kept.length - 1; i >= 0; i--) {
                        const k = kept[i];
                        if (k.senderId === msg.senderId && k.text === msg.text && Math.abs(msgTs - new Date(k.timestamp).getTime()) <= 3000) {
                            near = k; break;
                        }
                    }
                    if (!near) { kept.push(msg); continue; }
                    const nearIsTemp = String(near.id).startsWith('temp-');
                    const msgIsTemp = String(msg.id).startsWith('temp-');
                    if (nearIsTemp && !msgIsTemp) { kept.splice(kept.indexOf(near), 1, msg); continue; }
                    if (!nearIsTemp && msgIsTemp) { continue; }
                    continue;
                }
                return kept;
            });
            try { onConversationActivity && onConversationActivity(mapped.conversationId, mapped.text, mapped.timestamp); } catch {}
        };
        window.addEventListener('ets-chat-incoming', handler as any);
        return () => {
            window.removeEventListener('ets-chat-incoming', handler as any);
            if (mergeRefreshTimer.current) { try { clearTimeout(mergeRefreshTimer.current as any); } catch {} }
        };
    }, [conversation.id]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const text = newMessage.trim();
            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    const token = getToken() || '';
                    ws.send(JSON.stringify({ action: 'sendMessage', conversationId: conversation.id, text, token }));
                    const optimistic: ChatMessage = {
                        id: `temp-${Date.now()}`,
                        conversationId: conversation.id,
                        senderId: currentUser.id,
                        text,
                        timestamp: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, optimistic]);
                    try { onConversationActivity && onConversationActivity(conversation.id, text, optimistic.timestamp); } catch {}
                    console.log('[ChatWindow] WS send success:', { conversationId: conversation.id, text });
                    try { window.dispatchEvent(new CustomEvent('ets-chat-sent', { detail: { conversationId: conversation.id, text, ts: Date.now() } })); } catch {}
                    // Removed quick refresh to avoid duplicate renders and multiple copies
                } catch (e) {
                    console.log('[ChatWindow] WS send failed:', e);
                }
                setNewMessage('');
            } else {
                console.log('[ChatWindow] WS not open, message not sent. Waiting for reconnect.');
                // Optionally, you could queue the message here to send on reconnect.
                setNewMessage('');
            }
        }
    };
    
    const getConversationName = () => {
        const isGroup = conversation.type === 'group';
        if (isGroup) return conversation.name || 'Group Chat';
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