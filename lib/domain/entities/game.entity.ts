export type Platform = 'ps1' | 'dos' | 'snes' | 'gba'

export interface GameEntity {
  id: string
  title: string
  platform: Platform
  genre: string
  coverUrl: string
  romUrl: string
  biosUrl?: string
  description: string
  year: number
  publisher: string
}
