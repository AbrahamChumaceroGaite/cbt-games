import { GameEntity, Platform } from '@/lib/domain/entities/game.entity'
import { GameRepository } from '@/lib/domain/repositories/game.repository'
import { Query, QueryHandler } from '../bus/query-bus'

export interface GetAllGamesQuery extends Query<GameEntity[]> {
  readonly _type: 'GetAllGames'
  platform?: Platform
  search?: string
}

export const mkGetAllGamesQ = (opts: Omit<GetAllGamesQuery, '_type'> = {}): GetAllGamesQuery => ({
  _type: 'GetAllGames',
  ...opts,
})

export class GetAllGamesHandler implements QueryHandler<GetAllGamesQuery, GameEntity[]> {
  constructor(private readonly gameRepo: GameRepository) {}

  async handle(query: GetAllGamesQuery): Promise<GameEntity[]> {
    if (query.search) return this.gameRepo.search(query.search)
    if (query.platform) return this.gameRepo.findByPlatform(query.platform)
    return this.gameRepo.findAll()
  }
}
