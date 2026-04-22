import { InMemoryGameRepository } from '@/lib/infrastructure/repositories/in-memory-game.repository'
import { InMemoryUserRepository } from '@/lib/infrastructure/repositories/in-memory-user.repository'
import { InMemorySaveStateRepository } from '@/lib/infrastructure/repositories/in-memory-save-state.repository'
import { QueryBus } from './bus/query-bus'
import { CommandBus } from './bus/command-bus'
import { GetAllGamesHandler } from './queries/get-all-games.query'
import { GetGameByIdHandler } from './queries/get-game-by-id.query'
import { GetSaveStatesHandler } from './queries/get-save-states.query'
import { LoginHandler } from './commands/login.command'
import { SaveStateHandler } from './commands/save-state.command'

// Singleton repositories
const gameRepo = new InMemoryGameRepository()
const userRepo = new InMemoryUserRepository()
const saveRepo = new InMemorySaveStateRepository()

// Query Bus
export const queryBus = new QueryBus()
queryBus.register('GetAllGames', new GetAllGamesHandler(gameRepo))
queryBus.register('GetGameById', new GetGameByIdHandler(gameRepo))
queryBus.register('GetSaveStates', new GetSaveStatesHandler(saveRepo))

// Command Bus
export const commandBus = new CommandBus()
commandBus.register('Login', new LoginHandler(userRepo))
commandBus.register('SaveState', new SaveStateHandler(saveRepo))
