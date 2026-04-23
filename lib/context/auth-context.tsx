'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserEntity } from '@/lib/domain/entities/user.entity'
import { commandBus } from '@/lib/application/container'
import { mkLoginCmd } from '@/lib/application/commands/login.command'

const SESSION_KEY = 'retrovault_session'

interface AuthContextValue {
  user: UserEntity | null
  /** true while restoring session from localStorage (avoid flash-redirect) */
  hydrated: boolean
  login(email: string, password: string): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): UserEntity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as UserEntity) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer reads localStorage synchronously on first client render,
  // avoiding setState inside a useEffect (react-hooks/set-state-in-effect).
  const [user, setUser]         = useState<UserEntity | null>(readSession)
  const [hydrated, setHydrated] = useState(false)

  // Only sets hydrated after mount so guards know SSR is done.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])

  async function login(email: string, password: string) {
    const loggedUser = await commandBus.execute<UserEntity>(mkLoginCmd(email, password))
    localStorage.setItem(SESSION_KEY, JSON.stringify(loggedUser))
    setUser(loggedUser)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
