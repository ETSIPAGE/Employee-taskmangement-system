import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';

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

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onBack, allUsers }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const usersMap = new Map(allUsers.map(u => [u.id, u]));

    useEffect(() => {
        const conversationMessages = DataService.getMessagesForConversation(conversation.id);
        setMessages(conversationMessages);
    }, [conversation.id]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const sentMessage = DataService.sendMessage(conversation.id, currentUser.id, newMessage.trim());
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
        }
    };
    
    const getConversationName = () => {
        if (conversation.type === 'group') return conversation.name;
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
