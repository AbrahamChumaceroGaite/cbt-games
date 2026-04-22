'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { UserEntity } from '@/lib/domain/entities/user.entity'
import { commandBus } from '@/lib/application/container'
import { mkLoginCmd } from '@/lib/application/commands/login.command'

interface AuthContextValue {
  user: UserEntity | null
  login(email: string, password: string): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserEntity | null>(null)

  async function login(email: string, password: string) {
    const loggedUser = await commandBus.execute<UserEntity>(mkLoginCmd(email, password))
    setUser(loggedUser)
  }

  function logout() {
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
