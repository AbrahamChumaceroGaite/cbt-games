import { GameEntity } from '@/lib/domain/entities/game.entity'
import { GameRepository } from '@/lib/domain/repositories/game.repository'
import { Query, QueryHandler } from '../bus/query-bus'

export interface GetGameByIdQuery extends Query<GameEntity | null> {
  readonly _type: 'GetGameById'
  gameId: string
}

export const mkGetGameByIdQ = (gameId: string): GetGameByIdQuery => ({
  _type: 'GetGameById',
  gameId,
})

export class GetGameByIdHandler implements QueryHandler<GetGameByIdQuery, GameEntity | null> {
  constructor(private readonly gameRepo: GameRepository) {}

  async handle(query: GetGameByIdQuery): Promise<GameEntity | null> {
    return this.gameRepo.findById(query.gameId)
  }
}
