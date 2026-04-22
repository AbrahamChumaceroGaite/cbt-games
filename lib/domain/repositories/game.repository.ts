import { GameEntity, Platform } from '../entities/game.entity'

export interface GameRepository {
  findAll(): Promise<GameEntity[]>
  findById(id: string): Promise<GameEntity | null>
  findByPlatform(platform: Platform): Promise<GameEntity[]>
  search(query: string): Promise<GameEntity[]>
}
