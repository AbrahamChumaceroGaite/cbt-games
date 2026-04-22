'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Gamepad2 } from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'

// pcsx_rearmed: lighter than mednafen_psx, has built-in HLE BIOS (no BIOS file required)
const PLATFORM_CORE: Record<Exclude<Platform, 'dos'>, string> = {
  ps1:  'pcsx_rearmed',
  snes: 'snes9x',
  gba:  'mgba',
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/'
// PS1 cores are large (~10 MB WASM) — give them extra time
const LOAD_TIMEOUT_MS: Record<Exclude<Platform, 'dos'>, number> = {
  ps1:  90_000,
  snes: 45_000,
  gba:  45_000,
}

type Status = 'idle' | 'loading' | 'running' | 'error'

interface EmulatorJSPlayerProps {
  platform: Exclude<Platform, 'dos'>
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const scriptRef   = useRef<HTMLScriptElement | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimers() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function launch() {
    setStatus('loading')
    setError(null)
    setElapsed(0)

    const timeout = LOAD_TIMEOUT_MS[platform]
    timerRef.current = setTimeout(() => {
      clearTimers()
      setStatus('error')
      setError(
        `No se encontró la ROM o el núcleo tardó demasiado (${timeout / 1000} s).\n` +
        `Archivo esperado: /public${romUrl}` +
        (biosUrl ? `\nBIOS: /public${biosUrl}` : ''),
      )
    }, timeout)

    // Progress counter for user feedback
    intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    const w = window as unknown as Record<string, unknown>
    w['EJS_player']      = '#ejs-player'
    w['EJS_core']        = PLATFORM_CORE[platform]
    w['EJS_gameUrl']     = romUrl
    w['EJS_pathToData']  = EJS_CDN
    w['EJS_color']       = '#7c3aed'
    w['EJS_startOnLoad'] = true
    if (biosUrl) w['EJS_biosUrl'] = biosUrl

    w['EJS_onGameStart'] = () => {
      clearTimers()
      setStatus('running')
    }
    w['EJS_onLoadError'] = (msg: unknown) => {
      clearTimers()
      setStatus('error')
      setError(typeof msg === 'string' ? msg : 'No se pudo cargar la ROM.')
    }

    const script = document.createElement('script')
    script.src = `${EJS_CDN}loader.js`
    script.onerror = () => {
      clearTimers()
      setStatus('error')
      setError('No se pudo cargar EmulatorJS desde el CDN. Verifica tu conexión.')
    }
    document.body.appendChild(script)
    scriptRef.current = script
  }

  useEffect(() => {
    return () => {
      clearTimers()
      if (scriptRef.current && document.body.contains(scriptRef.current))
        document.body.removeChild(scriptRef.current)
    }
  }, [])

  const platformLabel = platform.toUpperCase()
  const timeout = LOAD_TIMEOUT_MS[platform]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '4/3', minHeight: 360 }}>
        <div id="ejs-player" className="w-full h-full" />

        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/90 p-6">

            {status === 'idle' && (
              <>
                <Gamepad2 className="h-14 w-14 text-violet-500 opacity-50" />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-lg">{title}</p>
                  <p className="text-slate-400 text-sm">{platformLabel} · EmulatorJS</p>
                </div>

                {platform === 'ps1' && (
                  <div className="rounded-lg border border-amber-700/40 bg-amber-950/40 px-4 py-3 max-w-sm text-xs text-amber-300 space-y-1">
                    <p className="font-semibold">Archivos requeridos en <code>/public/</code>:</p>
                    <p>📀 <code>roms/resident-evil.cue</code> + <code>.bin</code></p>
                    <p>🔧 <code>bios/SCPH1001.BIN</code> <span className="text-amber-500">(opcional con pcsx_rearmed)</span></p>
                  </div>
                )}

                {platform !== 'ps1' && (
                  <p className="text-slate-500 text-xs text-center">
                    ROM: <code className="text-slate-400">/public{romUrl}</code>
                  </p>
                )}

                <Button onClick={launch} sz="lg" className="px-8">
                  ▶ Iniciar {platformLabel}
                </Button>
              </>
            )}

            {status === 'loading' && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                <div className="text-center space-y-2">
                  <p className="text-slate-200 text-sm font-medium">Cargando {platformLabel}…</p>
                  <p className="text-slate-500 text-xs">Descargando núcleo RetroArch vía CDN</p>
                  <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-500 h-full transition-all duration-1000"
                      style={{ width: `${Math.min((elapsed / (timeout / 1000)) * 100, 95)}%` }}
                    />
                  </div>
                  <p className="text-slate-600 text-xs">{elapsed}s / {timeout / 1000}s máx.</p>
                </div>
              </>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                <AlertCircle className="h-10 w-10 text-red-400 shrink-0" />
                <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-left text-xs text-red-300 whitespace-pre-line w-full">
                  {error}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>
                    Volver
                  </Button>
                  <Button sz="sm" onClick={launch}>
                    Reintentar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {status === 'running' && (
        <p className="text-emerald-400 text-xs">
          Emulador activo · Haz clic en la pantalla para capturar entrada ·{' '}
          <kbd className="bg-slate-700 px-1 rounded text-slate-300">F11</kbd> pantalla completa
        </p>
      )}
    </div>
  )
}
