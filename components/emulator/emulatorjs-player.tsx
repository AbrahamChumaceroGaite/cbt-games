'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'

const PLATFORM_CORE: Record<Exclude<Platform, 'dos'>, string> = {
  ps1: 'mednafen_psx',
  snes: 'snes9x',
  gba: 'mgba',
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/'

interface EmulatorJSPlayerProps {
  platform: Exclude<Platform, 'dos'>
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'running'>('idle')
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  function launch() {
    if (!playerRef.current) return
    setStatus('loading')

    const w = window as unknown as Record<string, unknown>
    w['EJS_player'] = '#ejs-player'
    w['EJS_core'] = PLATFORM_CORE[platform]
    w['EJS_gameUrl'] = romUrl
    w['EJS_pathToData'] = EJS_CDN
    if (biosUrl) w['EJS_biosUrl'] = biosUrl

    w['EJS_onGameStart'] = () => setStatus('running')

    const script = document.createElement('script')
    script.src = `${EJS_CDN}loader.js`
    document.body.appendChild(script)
    scriptRef.current = script
  }

  useEffect(() => {
    return () => {
      if (scriptRef.current) document.body.removeChild(scriptRef.current)
    }
  }, [])

  return (
    <div className="relative flex flex-col gap-3">
      <div
        id="ejs-player"
        ref={playerRef}
        className="w-full bg-black rounded-lg overflow-hidden"
        style={{ minHeight: 400, aspectRatio: '4/3' }}
      />

      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
          <p className="text-slate-300 mb-4 text-sm">Presiona para iniciar {title}</p>
          {platform === 'ps1' && (
            <p className="text-amber-400 text-xs mb-4 max-w-xs text-center">
              ⚠️ La ROM y BIOS de PS1 son propietarias. Este demo asume que tienes los archivos
              legales en /public/roms/
            </p>
          )}
          <Button onClick={launch} sz="lg">
            ▶ Iniciar {platform.toUpperCase()}
          </Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando EmulatorJS ({platform})...
        </div>
      )}
    </div>
  )
}
