import { SaveStateEntity } from '@/lib/domain/entities/save-state.entity'
import { SaveStateRepository } from '@/lib/domain/repositories/save-state.repository'
import { Command, CommandHandler } from '../bus/command-bus'

export interface SaveStateCommand extends Command<SaveStateEntity> {
  readonly _type: 'SaveState'
  userId: string
  gameId: string
  slot: number
  data: string
}

export const mkSaveStateCmd = (
  userId: string,
  gameId: string,
  slot: number,
  data: string,
): SaveStateCommand => ({
  _type: 'SaveState',
  userId,
  gameId,
  slot,
  data,
})

export class SaveStateHandler implements CommandHandler<SaveStateCommand, SaveStateEntity> {
  constructor(private readonly saveRepo: SaveStateRepository) {}

  async handle(command: SaveStateCommand): Promise<SaveStateEntity> {
    return this.saveRepo.save({
      userId: command.userId,
      gameId: command.gameId,
      slot: command.slot,
      data: command.data,
    })
  }
}
