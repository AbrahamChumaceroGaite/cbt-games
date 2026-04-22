export interface SaveStateEntity {
  id: string
  userId: string
  gameId: string
  slot: number
  data: string        // base64 encoded state blob
  screenshotUrl?: string
  savedAt: Date
}
