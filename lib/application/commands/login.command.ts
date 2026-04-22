import { UserEntity } from '@/lib/domain/entities/user.entity'
import { UserRepository } from '@/lib/domain/repositories/user.repository'
import { Command, CommandHandler } from '../bus/command-bus'

export interface LoginCommand extends Command<UserEntity> {
  readonly _type: 'Login'
  email: string
  password: string
}

export const mkLoginCmd = (email: string, password: string): LoginCommand => ({
  _type: 'Login',
  email,
  password,
})

export class LoginHandler implements CommandHandler<LoginCommand, UserEntity> {
  constructor(private readonly userRepo: UserRepository) {}

  async handle(command: LoginCommand): Promise<UserEntity> {
    const user = await this.userRepo.findByEmail(command.email)
    // In production: bcrypt.compare(command.password, user.passwordHash)
    if (!user || user.passwordHash !== command.password) {
      throw new Error('Credenciales incorrectas')
    }
    return user
  }
}
