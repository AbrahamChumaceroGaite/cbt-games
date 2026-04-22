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
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import {
  ArrowLeft, Save, Loader2, HardDrive,
  CheckCircle2, Trash2, Keyboard, Maximize2, Info,
} from 'lucide-react'

// Single player component for all platforms — DOS uses dosbox core, others use their own
const EmulatorJSPlayer = dynamic(
  () =>
    import('@/components/emulator/emulatorjs-player').then(m => ({ default: m.EmulatorJSPlayer })),
  { ssr: false, loading: () => <EmulatorSkeleton /> },
)

function EmulatorSkeleton() {
  return (
    <div
      className="w-full bg-black rounded-xl flex items-center justify-center"
      style={{ minHeight: 360, aspectRatio: '4/3' }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
    </div>
  )
}

const PLATFORM_LABEL: Record<string, string> = {
  ps1: 'PlayStation 1', dos: 'MS-DOS', snes: 'SNES', gba: 'Game Boy Advance',
}

const CONTROLS: Record<string, { key: string; label: string }[]> = {
  dos: [
    { key: 'F11',     label: 'Pantalla completa' },
    { key: 'Ctrl+F1', label: 'Asignar teclas' },
    { key: 'Ctrl+F10', label: 'Capturar ratón' },
  ],
  ps1: [
    { key: 'F11',  label: 'Pantalla completa' },
    { key: 'Esc',  label: 'Menú EmulatorJS' },
    { key: 'F1',   label: 'Save state' },
    { key: 'F3',   label: 'Load state' },
  ],
  snes: [
    { key: 'F11', label: 'Pantalla completa' },
    { key: 'Esc', label: 'Menú EmulatorJS' },
    { key: 'F1',  label: 'Save state' },
  ],
  gba: [
    { key: 'F11', label: 'Pantalla completa' },
    { key: 'Esc', label: 'Menú EmulatorJS' },
  ],
}

interface SaveModalState {
  open: boolean
  slot: number | null
  existingSave: SaveStateEntity | null
}

export default function PlayPage() {
  const { user, hydrated } = useAuth()
  const router = useRouter()
  const { gameId } = useParams<{ gameId: string }>()

  const [game, setGame]               = useState<GameEntity | null>(null)
  const [saves, setSaves]             = useState<SaveStateEntity[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [sidebarTab, setSidebarTab]   = useState<'saves' | 'controls' | 'info'>('saves')

  const [saveModal, setSaveModal] = useState<SaveModalState>({
    open: false, slot: null, existingSave: null,
  })
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [savedSlot, setSavedSlot]         = useState<number | null>(null)

  useEffect(() => {
    if (!hydrated) return
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
  }, [hydrated, user, gameId, router])

  function openSaveModal(slot: number) {
    const existing = saves.find(s => s.slot === slot) ?? null
    setSaveModal({ open: true, slot, existingSave: existing })
  }

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

  if (!hydrated || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  if (!user || !game) return null

  const controls = CONTROLS[game.platform] ?? []

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f1117]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <Link href="/catalog">
            <Button variant="ghost" sz="sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Catálogo</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <span className="font-semibold text-white text-sm truncate">{game.title}</span>
          <Badge variant="platform" className="shrink-0">{PLATFORM_LABEL[game.platform]}</Badge>
          <Badge variant="genre" className="hidden sm:flex shrink-0">{game.genre}</Badge>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-5">
        <div className="flex flex-col xl:flex-row gap-5">

          {/* ── Emulator — all platforms via EmulatorJS ── */}
          <div className="flex-1 min-w-0">
            <EmulatorJSPlayer
              platform={game.platform}
              romUrl={game.romUrl}
              biosUrl={game.biosUrl}
              title={game.title}
            />
          </div>

          {/* ── Sidebar ── */}
          <aside className="w-full xl:w-64 flex flex-col gap-0 shrink-0 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-slate-700">
              {(
                [
                  { id: 'saves',    icon: HardDrive, label: 'Guardados' },
                  { id: 'controls', icon: Keyboard,  label: 'Controles' },
                  { id: 'info',     icon: Info,       label: 'Info' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                    sidebarTab === tab.id
                      ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Saves ── */}
            {sidebarTab === 'saves' && (
              <div className="flex flex-col gap-2 p-3">
                <p className="text-xs text-slate-500 px-1 pb-1">
                  Sesión de <span className="text-slate-300">{user.name}</span>
                </p>
                {[1, 2, 3].map(slot => {
                  const existing   = saves.find(s => s.slot === slot)
                  const isFlashing = savedSlot === slot
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300">Slot {slot}</p>
                        {existing ? (
                          <p className="text-xs text-slate-500 truncate">
                            {new Date(existing.savedAt).toLocaleString('es', {
                              dateStyle: 'short', timeStyle: 'short',
                            })}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600">Vacío</p>
                        )}
                      </div>
                      <Button
                        variant={isFlashing ? 'success' : 'outline'}
                        sz="sm"
                        className="shrink-0 text-xs"
                        onClick={() => openSaveModal(slot)}
                      >
                        {isFlashing
                          ? <CheckCircle2 className="h-3 w-3" />
                          : <Save className="h-3 w-3" />}
                        {isFlashing ? '¡Listo!' : existing ? 'Guardar' : 'Crear'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Tab: Controls ── */}
            {sidebarTab === 'controls' && (
              <div className="p-3 flex flex-col gap-1">
                <p className="text-xs text-slate-500 px-1 pb-2">
                  Atajos de teclado para {PLATFORM_LABEL[game.platform]}
                </p>
                {controls.map(c => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800/50 border border-slate-700"
                  >
                    <span className="text-xs text-slate-400">{c.label}</span>
                    <kbd className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-slate-300">
                      {c.key}
                    </kbd>
                  </div>
                ))}
                <div className="mt-2 flex items-center gap-2 rounded-md border border-violet-700/30 bg-violet-900/20 px-3 py-2">
                  <Maximize2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs text-violet-300">Haz clic en el emulador para capturar el teclado</span>
                </div>
              </div>
            )}

            {/* ── Tab: Info ── */}
            {sidebarTab === 'info' && (
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{game.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Plataforma', value: PLATFORM_LABEL[game.platform] },
                    { label: 'Género',     value: game.genre },
                    { label: 'Año',        value: String(game.year) },
                    { label: 'Publisher',  value: game.publisher },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="text-xs font-medium text-slate-300 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ── Save Modal ── */}
      <Modal
        isOpen={saveModal.open}
        onClose={closeSaveModal}
        variant={saveModal.existingSave ? 'warning' : 'default'}
        size="sm"
      >
        <ModalHeader
          title={saveModal.existingSave
            ? `Sobreescribir Slot ${saveModal.slot}`
            : `Guardar en Slot ${saveModal.slot}`}
          onClose={closeSaveModal}
        />
        <ModalBody>
          {saveModal.existingSave ? (
            <div className="flex flex-col gap-3">
              <p>
                Este slot ya contiene una partida del{' '}
                <span className="text-white font-medium">
                  {new Date(saveModal.existingSave.savedAt).toLocaleString('es', {
                    dateStyle: 'long', timeStyle: 'short',
                  })}
                </span>.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-amber-300 text-xs">
                <Trash2 className="h-4 w-4 shrink-0" />
                El guardado anterior se perderá permanentemente.
              </div>
            </div>
          ) : (
            <p>
              Se creará una nueva partida en el{' '}
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
            {confirmSaving
              ? 'Guardando…'
              : saveModal.existingSave ? 'Sobreescribir' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
