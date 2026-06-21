import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface WebSocketContextType {
  connected: boolean
  subscribe: (event: string, callback: (data: unknown) => void) => void
  unsubscribe: (event: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map())

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
      return
    }

    const socket = io(import.meta.env.VITE_WS_URL || '/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach(cb => socket.on(event, cb))
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [token])

  const subscribe = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set())
    }
    listenersRef.current.get(event)!.add(callback)
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  const unsubscribe = useCallback((event: string) => {
    listenersRef.current.delete(event)
    if (socketRef.current) {
      socketRef.current.off(event)
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ connected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider')
  return ctx
}
