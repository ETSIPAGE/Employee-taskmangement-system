const WEBSOCKET_URL = 'wss://4axwbl20th.execute-api.ap-south-1.amazonaws.com/dev';

type OutgoingMessage = {
    action: string;
    conversationId: string;
    text?: string;
};

export interface ChatSocketEvent {
    type?: string;
    action?: string;
    conversationId?: string;
    senderId?: string;
    text?: string;
    timestamp?: string;
}

type ChatSocketListener = (event: ChatSocketEvent) => void;

class ChatSocket {
    private socket: WebSocket | null = null;
    private listeners = new Set<ChatSocketListener>();
    private pendingQueue: OutgoingMessage[] = [];
    private reconnectTimeout: number | null = null;
    private shouldReconnect = false;
    private lastToken?: string;

    connect(token?: string) {
        this.lastToken = token;
        this.shouldReconnect = true;
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const endpoint = token ? `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}` : WEBSOCKET_URL;
        this.socket = new WebSocket(endpoint);
        this.socket.onopen = () => {
            console.log('Chat WebSocket connected');
            if (!this.shouldReconnect) {
                // Connection was requested to close before it opened
                this.socket?.close();
                return;
            }
            this.flushPending();
        };
        this.socket.onclose = () => {
            console.log('Chat WebSocket disconnected');
            this.socket = null;
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        };
        this.socket.onerror = event => {
            console.error('Chat WebSocket error', event);
            if (this.socket && this.socket.readyState === WebSocket.CLOSING) {
                return;
            }
        };
        this.socket.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                this.listeners.forEach(listener => listener(data));
            } catch (error) {
                console.error('Failed to parse chat WebSocket message', error);
            }
        };
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimeout !== null) {
            window.clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.socket) {
            const socketToClose = this.socket;
            if (socketToClose.readyState === WebSocket.CONNECTING) {
                socketToClose.addEventListener('open', () => {
                    console.log('Chat WebSocket closing after pending open');
                    socketToClose.close();
                }, { once: true });
            } else if (socketToClose.readyState === WebSocket.OPEN || socketToClose.readyState === WebSocket.CLOSING) {
                console.log('Chat WebSocket closing');
                socketToClose.close();
            }
            this.socket = null;
        }
        this.pendingQueue = [];
    }

    private enqueue(payload: OutgoingMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
            return true;
        }
        this.pendingQueue.push(payload);
        this.connect(this.lastToken);
        return false;
    }

    sendMessage(conversationId: string, text: string) {
        return this.enqueue({
            action: 'sendMessage',
            conversationId,
            text,
        });
    }

    notifyConversationCleared(conversationId: string) {
        return this.enqueue({
            action: 'conversationCleared',
            conversationId,
        });
    }

    notifyConversationDeleted(conversationId: string) {
        return this.enqueue({
            action: 'conversationDeleted',
            conversationId,
        });
    }

    addListener(listener: ChatSocketListener) {
        this.listeners.add(listener);
    }

    removeListener(listener: ChatSocketListener) {
        this.listeners.delete(listener);
    }

    isConnected() {
        return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    private flushPending() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        while (this.pendingQueue.length) {
            const message = this.pendingQueue.shift();
            if (message) {
                this.socket.send(JSON.stringify(message));
            }
        }
    }

    private scheduleReconnect() {
        console.log('Chat WebSocket scheduling reconnect');
        if (this.reconnectTimeout !== null) {
            return;
        }
        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            console.log('Chat WebSocket reconnecting');
            this.connect(this.lastToken);
        }, 2000);
    }
}

export const chatSocket = new ChatSocket();
