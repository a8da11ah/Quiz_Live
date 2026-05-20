import { create } from 'zustand'

let nextId = 1

/**
 * Lightweight toast/notification store.
 * Use `useToastStore.getState().error('...')` from non-component code
 * (e.g. inside the WebSocket dispatch), and render `<Toast />` once at
 * the app root to display them.
 */
export const useToastStore = create((set, get) => ({
  toasts: [], // [{ id, kind, message }]

  push: (kind, message, duration = 4500) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  error:   (msg) => get().push('error',   msg),
  success: (msg) => get().push('success', msg),
  info:    (msg) => get().push('info',    msg),
}))
