'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Gamepad2 } from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'

const PLATFORM_CORE: Record<Exclude<Platform, 'dos'>, string> = {
  ps1:  'mednafen_psx',
  snes: 'snes9x',
  gba:  'mgba',
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/'
const LOAD_TIMEOUT_MS = 25_000

type Status = 'idle' | 'loading' | 'running' | 'error'

interface EmulatorJSPlayerProps {
  platform: Exclude<Platform, 'dos'>
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function launch() {
    setStatus('loading')
    setError(null)

    timerRef.current = setTimeout(() => {
      setStatus('error')
      setError(
        `No se encontró la ROM o tardó demasiado. Coloca el archivo en /public${romUrl}${biosUrl ? ` y la BIOS en /public${biosUrl}` : ''}.`,
      )
    }, LOAD_TIMEOUT_MS)

    const w = window as unknown as Record<string, unknown>
    w['EJS_player']      = '#ejs-player'
    w['EJS_core']        = PLATFORM_CORE[platform]
    w['EJS_gameUrl']     = romUrl
    w['EJS_pathToData']  = EJS_CDN
    w['EJS_color']       = '#7c3aed'
    w['EJS_startOnLoad'] = true
    if (biosUrl) w['EJS_biosUrl'] = biosUrl

    w['EJS_onGameStart'] = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('running')
    }

    w['EJS_onLoadError'] = (msg: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('error')
      setError(msg ?? 'No se pudo cargar la ROM.')
    }

    const script = document.createElement('script')
    script.src = `${EJS_CDN}loader.js`
    script.onerror = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('error')
      setError('No se pudo cargar EmulatorJS. Verifica tu conexión a internet.')
    }
    document.body.appendChild(script)
    scriptRef.current = script
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current)
      }
    }
  }, [])

  const platformLabel = platform.toUpperCase()

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* EmulatorJS needs a real DOM element with this id */}
        <div
          id="ejs-player"
          className="w-full bg-black rounded-lg overflow-hidden"
          style={{ minHeight: 400, aspectRatio: '4/3' }}
        />

        {/* Overlay */}
        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 rounded-lg">
            {status === 'idle' && (
              <>
                <Gamepad2 className="h-12 w-12 text-violet-400 opacity-60" />
                <p className="text-slate-300 text-sm">
                  Listo para iniciar <span className="font-semibold text-white">{title}</span>
                </p>
                {platform === 'ps1' && (
                  <div className="rounded-md border border-amber-700/40 bg-amber-900/20 px-4 py-2 max-w-xs text-xs text-amber-300 text-center">
                    Requiere ROM <code>.bin</code> + BIOS <code>scph1001.bin</code> propias en <code>/public/roms/</code> y <code>/public/bios/</code>
                  </div>
                )}
                {platform !== 'ps1' && (
                  <p className="text-slate-500 text-xs max-w-xs text-center">
                    Coloca la ROM en <code className="text-slate-400">/public{romUrl}</code>
                  </p>
                )}
                <Button onClick={launch} sz="lg">
                  ▶ Iniciar {platformLabel}
                </Button>
              </>
            )}

            {status === 'loading' && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-slate-400 text-sm">Cargando EmulatorJS ({platformLabel})…</p>
                <p className="text-slate-600 text-xs">Descargando núcleo RetroArch vía CDN</p>
              </>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3 max-w-sm px-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>
                  Volver al inicio
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
