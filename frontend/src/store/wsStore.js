/**
 * Shared WebSocket store — ONE connection per user, shared across all components.
 * Components subscribe to messages via the `onMessage` callback list.
 * This prevents the "WebSocket active in another session" conflict.
 */
import { create } from 'zustand';

let socketRef = null;
let reconnectTimer = null;
const messageCallbacks = new Set();

const connectWs = (userId, onStatusChange) => {
  if (!userId) return;

  // If already open/connecting for this user, skip
  if (socketRef && (socketRef.readyState === WebSocket.OPEN || socketRef.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = `ws://127.0.0.1:8000/ws/${userId}`;
  console.log(`[WS] Connecting: ${wsUrl}`);

  try {
    socketRef = new WebSocket(wsUrl);

    socketRef.onopen = () => {
      console.log('[WS] Connected');
      onStatusChange?.('connected');
    };

    socketRef.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messageCallbacks.forEach(cb => {
          try { cb(data); } catch (_) {}
        });
      } catch (_) {}
    };

    socketRef.onclose = (event) => {
      console.log(`[WS] Disconnected (code: ${event.code})`);
      socketRef = null;
      onStatusChange?.('disconnected');

      if (event.code === 1008) {
        console.warn('[WS] Rejected — another session active');
        return; // Don't reconnect
      }
      if (event.code !== 1000) {
        console.log('[WS] Reconnecting in 4s...');
        reconnectTimer = setTimeout(() => connectWs(userId, onStatusChange), 4000);
      }
    };

    socketRef.onerror = () => {
      // onclose handles cleanup
    };
  } catch (e) {
    console.error('[WS] Failed to connect:', e);
  }
};

const disconnectWs = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socketRef) {
    socketRef.onclose = null; // Prevent reconnect on manual close
    socketRef.close(1000);
    socketRef = null;
  }
};

export const useWsStore = create((set, get) => ({
  status: 'disconnected',  // 'connected' | 'disconnected'
  notifications: [],

  connect: (userId) => {
    connectWs(userId, (status) => {
      set({ status });
    });
  },

  disconnect: () => {
    disconnectWs();
    set({ status: 'disconnected' });
  },

  /**
   * Subscribe a callback to receive all WS messages.
   * Returns an unsubscribe function.
   */
  subscribe: (callback) => {
    messageCallbacks.add(callback);
    return () => messageCallbacks.delete(callback);
  },

  /**
   * Convenience: push a notification (called internally by the message handler).
   */
  addNotification: (msg) => {
    set(state => ({
      notifications: [
        { id: Date.now(), msg, time: new Date().toLocaleTimeString() },
        ...state.notifications.slice(0, 19)
      ]
    }));
  },

  clearNotifications: () => set({ notifications: [] }),
}));
