import { SaveStateEntity } from '@/lib/domain/entities/save-state.entity'
import { SaveStateRepository } from '@/lib/domain/repositories/save-state.repository'
import { Query, QueryHandler } from '../bus/query-bus'

export interface GetSaveStatesQuery extends Query<SaveStateEntity[]> {
  readonly _type: 'GetSaveStates'
  userId: string
  gameId: string
}

export const mkGetSaveStatesQ = (userId: string, gameId: string): GetSaveStatesQuery => ({
  _type: 'GetSaveStates',
  userId,
  gameId,
})

export class GetSaveStatesHandler implements QueryHandler<GetSaveStatesQuery, SaveStateEntity[]> {
  constructor(private readonly saveRepo: SaveStateRepository) {}

  async handle(query: GetSaveStatesQuery): Promise<SaveStateEntity[]> {
    return this.saveRepo.findByUserAndGame(query.userId, query.gameId)
  }
}
