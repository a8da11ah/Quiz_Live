import { create } from 'zustand'
import { login as apiLogin } from '../lib/api.js'

const TOKEN_KEY = 'quizlive_token'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const data = await apiLogin(username, password)
      localStorage.setItem(TOKEN_KEY, data.token)
      set({ token: data.token, loading: false })
      return true
    } catch (err) {
      set({ error: err.message || 'Login failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, error: null })
  },
}))
