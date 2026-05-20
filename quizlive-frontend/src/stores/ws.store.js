import { create } from 'zustand'

/**
 * WebSocket connection store.
 * The actual WS logic lives in useWebSocket hook; this store just exposes
 * the send function and connection status globally.
 */
export const useWsStore = create((set) => ({
  status: 'disconnected',   // disconnected | connecting | connected | error
  send: null,               // (type, payload?) => void — set by useWebSocket on connect

  setStatus: (status) => set({ status }),
  setSend: (fn) => set({ send: fn }),
  clearSend: () => set({ send: null, status: 'disconnected' }),
}))
