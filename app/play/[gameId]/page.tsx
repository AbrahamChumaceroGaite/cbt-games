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
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { ArrowLeft, Save, Loader2, HardDrive, CheckCircle2, Trash2 } from 'lucide-react'

const DosEmulator = dynamic(
  () => import('@/components/emulator/dos-emulator').then(m => ({ default: m.DosEmulator })),
  { ssr: false, loading: () => <EmulatorSkeleton /> },
)
const EmulatorJSPlayer = dynamic(
  () =>
    import('@/components/emulator/emulatorjs-player').then(m => ({ default: m.EmulatorJSPlayer })),
  { ssr: false, loading: () => <EmulatorSkeleton /> },
)

function EmulatorSkeleton() {
  return (
    <div
      className="w-full bg-black rounded-lg flex items-center justify-center"
      style={{ minHeight: 400, aspectRatio: '4/3' }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
    </div>
  )
}

const PLATFORM_LABEL: Record<string, string> = {
  ps1: 'PlayStation 1', dos: 'MS-DOS', snes: 'SNES', gba: 'Game Boy Advance',
}

// ─── Save modal state ─────────────────────────────────────────────────────────
interface SaveModalState {
  open: boolean
  slot: number | null
  existingSave: SaveStateEntity | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlayPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { gameId } = useParams<{ gameId: string }>()

  const [game, setGame]               = useState<GameEntity | null>(null)
  const [saves, setSaves]             = useState<SaveStateEntity[]>([])
  const [loadingPage, setLoadingPage] = useState(true)

  // Modal states
  const [saveModal, setSaveModal] = useState<SaveModalState>({
    open: false, slot: null, existingSave: null,
  })
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [savedSlot, setSavedSlot]         = useState<number | null>(null)   // success flash

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    async function load() {
      setLoadingPage(true)
      const [g, s] = await Promise.all([
        queryBus.execute<GameEntity | null>(mkGetGameByIdQ(gameId)),
        queryBus.execute<SaveStateEntity[]>(mkGetSaveStatesQ(user!.id, gameId)),
      ])
      if (!g) { router.replace('/catalog'); return }
      setGame(g)
      setSaves(s)
      setLoadingPage(false)
    }
    load()
  }, [user, gameId, router])

  // ── Open save modal ──────────────────────────────────────────────────────
  function openSaveModal(slot: number) {
    const existing = saves.find(s => s.slot === slot) ?? null
    setSaveModal({ open: true, slot, existingSave: existing })
  }

  // ── Confirm save ─────────────────────────────────────────────────────────
  async function confirmSave() {
    if (!user || !game || saveModal.slot === null) return
    setConfirmSaving(true)
    const mockData = btoa(`save-${game.id}-slot${saveModal.slot}-${Date.now()}`)
    const saved = await commandBus.execute<SaveStateEntity>(
      mkSaveStateCmd(user.id, game.id, saveModal.slot, mockData),
    )
    setSaves(prev => {
      const idx = prev.findIndex(s => s.slot === saveModal.slot)
      return idx >= 0 ? prev.map((s, i) => (i === idx ? saved : s)) : [...prev, saved]
    })
    setConfirmSaving(false)
    setSaveModal({ open: false, slot: null, existingSave: null })
    setSavedSlot(saved.slot)
    setTimeout(() => setSavedSlot(null), 2500)
  }

  function closeSaveModal() {
    if (confirmSaving) return
    setSaveModal({ open: false, slot: null, existingSave: null })
  }

  if (!user) return null

  if (loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117]">
      {/* ── Header ── */}
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

      {/* ── Main ── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Emulator */}
          <div className="flex-1 min-w-0">
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

          {/* ── Sidebar ── */}
          <aside className="w-full xl:w-72 flex flex-col gap-4 shrink-0">
            {/* Game info */}
            <Card variant="elevated" p="md">
              <h2 className="text-base font-semibold text-white mb-2">{game.title}</h2>
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
                  const isFlashing = savedSlot === slot
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-300">Slot {slot}</p>
                        {existing ? (
                          <p className="text-xs text-slate-500">
                            {new Date(existing.savedAt).toLocaleString('es', {
                              dateStyle: 'short', timeStyle: 'short',
                            })}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600">Vacío</p>
                        )}
                      </div>

                      <Button
                        variant={isFlashing ? 'success' : existing ? 'outline' : 'outline'}
                        sz="sm"
                        onClick={() => openSaveModal(slot)}
                      >
                        {isFlashing ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {isFlashing ? '¡Guardado!' : existing ? 'Sobreescribir' : 'Guardar'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Controls */}
            <Card p="sm" className="border-slate-700 bg-slate-800/30">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Controles
              </h3>
              <ul className="text-xs text-slate-500 space-y-1">
                <li><kbd className="bg-slate-700 px-1 rounded text-slate-300">F11</kbd> Pantalla completa</li>
                <li><kbd className="bg-slate-700 px-1 rounded text-slate-300">Esc</kbd> Menú del emulador</li>
                <li>Clic en pantalla para capturar teclado</li>
              </ul>
            </Card>
          </aside>
        </div>
      </main>

      {/* ─── Save State Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={saveModal.open}
        onClose={closeSaveModal}
        variant={saveModal.existingSave ? 'warning' : 'default'}
        size="sm"
      >
        <ModalHeader
          title={saveModal.existingSave ? `Sobreescribir Slot ${saveModal.slot}` : `Guardar en Slot ${saveModal.slot}`}
          onClose={closeSaveModal}
        />
        <ModalBody>
          {saveModal.existingSave ? (
            <div className="flex flex-col gap-3">
              <p>
                Este slot ya tiene una partida guardada el{' '}
                <span className="text-white font-medium">
                  {new Date(saveModal.existingSave.savedAt).toLocaleString('es', {
                    dateStyle: 'long', timeStyle: 'short',
                  })}
                </span>
                .
              </p>
              <div className="flex items-center gap-2 rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-amber-300 text-xs">
                <Trash2 className="h-4 w-4 shrink-0" />
                El guardado anterior se perderá permanentemente.
              </div>
            </div>
          ) : (
            <p>
              Se guardará el estado actual del emulador en el{' '}
              <span className="text-white font-medium">Slot {saveModal.slot}</span>.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" sz="sm" onClick={closeSaveModal} disabled={confirmSaving}>
            Cancelar
          </Button>
          <Button
            variant={saveModal.existingSave ? 'destructive' : 'default'}
            sz="sm"
            onClick={confirmSave}
            disabled={confirmSaving}
          >
            {confirmSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmSaving ? 'Guardando…' : saveModal.existingSave ? 'Sobreescribir' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
