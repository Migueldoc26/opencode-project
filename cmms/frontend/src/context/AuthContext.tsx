import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('cmms_token'))
  const [loading, setLoading] = useState(true)

  const setAuthHeader = useCallback((t: string | null) => {
    if (t) {
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [])

  useEffect(() => {
    if (token) {
      setAuthHeader(token)
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('cmms_token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, setAuthHeader])

  api.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('cmms_token')
        setToken(null)
        setUser(null)
      }
      return Promise.reject(err)
    }
  )

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('cmms_token', newToken)
    setToken(newToken)
    setUser(userData)
    setAuthHeader(newToken)
  }, [setAuthHeader])

  const logout = useCallback(() => {
    localStorage.removeItem('cmms_token')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { api }
