import { SaveStateEntity } from '@/lib/domain/entities/save-state.entity'
import { SaveStateRepository } from '@/lib/domain/repositories/save-state.repository'

export class InMemorySaveStateRepository implements SaveStateRepository {
  private saves: SaveStateEntity[] = []
  private nextId = 1

  async findByUserAndGame(userId: string, gameId: string): Promise<SaveStateEntity[]> {
    return this.saves.filter(s => s.userId === userId && s.gameId === gameId)
  }

  async save(state: Omit<SaveStateEntity, 'id' | 'savedAt'>): Promise<SaveStateEntity> {
    const existing = this.saves.findIndex(
      s => s.userId === state.userId && s.gameId === state.gameId && s.slot === state.slot,
    )

    const entity: SaveStateEntity = {
      ...state,
      id: existing >= 0 ? this.saves[existing].id : `save-${this.nextId++}`,
      savedAt: new Date(),
    }

    if (existing >= 0) {
      this.saves[existing] = entity
    } else {
      this.saves.push(entity)
    }

    return entity
  }

  async delete(id: string): Promise<void> {
    this.saves = this.saves.filter(s => s.id !== id)
  }
}
