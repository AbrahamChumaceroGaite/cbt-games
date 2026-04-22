import { SaveStateEntity } from '../entities/save-state.entity'

export interface SaveStateRepository {
  findByUserAndGame(userId: string, gameId: string): Promise<SaveStateEntity[]>
  save(state: Omit<SaveStateEntity, 'id' | 'savedAt'>): Promise<SaveStateEntity>
  delete(id: string): Promise<void>
}
