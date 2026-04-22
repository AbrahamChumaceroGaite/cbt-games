import { UserEntity } from '@/lib/domain/entities/user.entity'
import { UserRepository } from '@/lib/domain/repositories/user.repository'

// Demo credentials: demo@retro.dev / demo1234
// Password stored as plain text only for demo — never do this in production
const USERS: UserEntity[] = [
  {
    id: 'user-1',
    email: 'demo@retro.dev',
    name: 'Demo Player',
    passwordHash: 'demo1234',
    createdAt: new Date('2024-01-01'),
  },
]

export class InMemoryUserRepository implements UserRepository {
  private users = USERS

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find(u => u.id === id) ?? null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.find(u => u.email === email) ?? null
  }
}
