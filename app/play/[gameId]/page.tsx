'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/context/auth-context'
import { queryBus, commandBus } from '@/lib/application/container'
import { mkGetGameByIdQ } from '@/lib/application/queries/get-game-by-id.query'
import { mkGetSaveStatesQ } from '@/lib/application/queries/get-save-states.query'
import { mkSaveStateCmd } from '@/lib/application/commands/save-state.command'
import { GameEntity } from '@/lib/domain/entities/game.entity'
import { SaveStateEntity } from '@/lib/domain/entities/save-state.entity'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, HardDrive } from 'lucide-react'

// Dynamic imports to avoid SSR for WASM-heavy components
const DosEmulator = dynamic(
  () => import('@/components/emulator/dos-emulator').then(m => ({ default: m.DosEmulator })),
  { ssr: false, loading: () => <EmulatorSkeleton /> },
)
const EmulatorJSPlayer = dynamic(
  () =>
    import('@/components/emulator/emulatorjs-player').then(m => ({
      default: m.EmulatorJSPlayer,
    })),
  { ssr: false, loading: () => <EmulatorSkeleton /> },
)

function EmulatorSkeleton() {
  return (
    <div className="w-full bg-black rounded-lg flex items-center justify-center" style={{ minHeight: 400, aspectRatio: '4/3' }}>
      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
    </div>
  )
}

const PLATFORM_LABEL: Record<string, string> = {
  ps1: 'PlayStation 1', dos: 'MS-DOS', snes: 'SNES', gba: 'Game Boy Advance',
}

export default function PlayPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { gameId } = useParams<{ gameId: string }>()

  const [game, setGame] = useState<GameEntity | null>(null)
  const [saves, setSaves] = useState<SaveStateEntity[]>([])
  const [loadingGame, setLoadingGame] = useState(true)
  const [savingSlot, setSavingSlot] = useState<number | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    async function load() {
      setLoadingGame(true)
      const [g, s] = await Promise.all([
        queryBus.execute<GameEntity | null>(mkGetGameByIdQ(gameId)),
        queryBus.execute<SaveStateEntity[]>(mkGetSaveStatesQ(user!.id, gameId)),
      ])
      if (!g) { router.replace('/catalog'); return }
      setGame(g)
      setSaves(s)
      setLoadingGame(false)
    }
    load()
  }, [user, gameId, router])

  async function handleSave(slot: number) {
    if (!user || !game) return
    setSavingSlot(slot)
    // In production: read actual emulator state blob via EJS_onSaveState / js-dos API
    const mockData = btoa(`save-${game.id}-slot${slot}-${Date.now()}`)
    const saved = await commandBus.execute<SaveStateEntity>(mkSaveStateCmd(user.id, game.id, slot, mockData))
    setSaves(prev => {
      const idx = prev.findIndex(s => s.slot === slot)
      return idx >= 0 ? prev.map((s, i) => (i === idx ? saved : s)) : [...prev, saved]
    })
    setSavingSlot(null)
  }

  if (!user) return null

  if (loadingGame) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f1117]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/catalog">
            <Button variant="ghost" sz="sm">
              <ArrowLeft className="h-4 w-4" />
              Catálogo
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-white truncate">{game.title}</span>
            <Badge variant="platform">{PLATFORM_LABEL[game.platform] ?? game.platform}</Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Emulator */}
          <div className="flex-1 relative">
            {game.platform === 'dos' ? (
              <DosEmulator romUrl={game.romUrl} title={game.title} />
            ) : (
              <EmulatorJSPlayer
                platform={game.platform as 'ps1' | 'snes' | 'gba'}
                romUrl={game.romUrl}
                biosUrl={game.biosUrl}
                title={game.title}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full xl:w-72 flex flex-col gap-4 shrink-0">
            {/* Game info */}
            <Card variant="elevated" p="md">
              <h2 className="text-base font-semibold text-white mb-3">{game.title}</h2>
              <p className="text-slate-400 text-sm mb-3">{game.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="genre">{game.genre}</Badge>
                <Badge variant="year">{game.year}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">{game.publisher}</p>
            </Card>

            {/* Save states */}
            <Card variant="elevated" p="md">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Partidas guardadas</h3>
              </div>

              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(slot => {
                  const existing = saves.find(s => s.slot === slot)
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-300">Slot {slot}</p>
                        {existing ? (
                          <p className="text-xs text-slate-500">
                            {new Date(existing.savedAt).toLocaleString('es', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600">Vacío</p>
                        )}
                      </div>
                      <Button
                        variant={existing ? 'success' : 'outline'}
                        sz="sm"
                        onClick={() => handleSave(slot)}
                        disabled={savingSlot !== null}
                      >
                        {savingSlot === slot ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {existing ? 'Guardar' : 'Crear'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Controls hint */}
            <Card p="md" className="border-slate-700 bg-slate-800/30">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Controles
              </h3>
              <ul className="text-xs text-slate-500 space-y-1">
                <li><kbd className="bg-slate-700 px-1 rounded text-slate-300">F11</kbd> Pantalla completa</li>
                <li><kbd className="bg-slate-700 px-1 rounded text-slate-300">Esc</kbd> Menú del emulador</li>
                <li>Haz clic en el emulador para capturar el teclado</li>
              </ul>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}
