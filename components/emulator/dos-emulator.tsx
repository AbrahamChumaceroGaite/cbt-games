'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Terminal } from 'lucide-react'

// js-dos v8 ships as a browser bundle — load via CDN script tag, not import()
const JSDOS_CDN = 'https://v8.js-dos.com/latest/js-dos.js'
const LOAD_TIMEOUT_MS = 20_000

type Status = 'idle' | 'loading-sdk' | 'loading-rom' | 'running' | 'error'

interface DosEmulatorProps {
  romUrl: string
  title: string
}

declare global {
  interface Window {
    Dos?: (el: HTMLElement, opts: { url: string }) => Promise<{ stop(): void }>
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar el SDK desde: ${src}`))
    document.head.appendChild(s)
  })
}

export function DosEmulator({ romUrl, title }: DosEmulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<{ stop(): void } | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function launch() {
    if (!containerRef.current) return
    setStatus('loading-sdk')
    setError(null)

    const timer = setTimeout(() => {
      setStatus('error')
      setError('Tiempo de espera agotado. Revisa tu conexión e intenta de nuevo.')
    }, LOAD_TIMEOUT_MS)

    try {
      await loadScript(JSDOS_CDN)

      if (!window.Dos) throw new Error('El SDK js-dos no expuso window.Dos correctamente.')

      setStatus('loading-rom')
      instanceRef.current = await window.Dos(containerRef.current, { url: romUrl })
      clearTimeout(timer)
      setStatus('running')
    } catch (e) {
      clearTimeout(timer)
      setError(
        e instanceof Error
          ? e.message
          : 'Error desconocido al cargar el emulador.',
      )
      setStatus('error')
    }
  }

  useEffect(() => {
    return () => { instanceRef.current?.stop() }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full bg-black rounded-lg overflow-hidden"
          style={{ minHeight: 400, aspectRatio: '4/3' }}
        />

        {/* Overlay — shown when not running */}
        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 rounded-lg">
            {status === 'idle' && (
              <>
                <Terminal className="h-12 w-12 text-violet-400 opacity-60" />
                <p className="text-slate-300 text-sm">Listo para iniciar <span className="font-semibold text-white">{title}</span></p>
                <p className="text-slate-500 text-xs max-w-xs text-center">
                  Requiere un bundle <code className="text-violet-400">.jsdos</code> en{' '}
                  <code className="text-slate-400">/public{romUrl}</code>
                </p>
                <Button onClick={launch} sz="lg">
                  ▶ Iniciar DOSBox
                </Button>
              </>
            )}

            {(status === 'loading-sdk' || status === 'loading-rom') && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-slate-400 text-sm">
                  {status === 'loading-sdk' ? 'Cargando SDK js-dos…' : `Cargando ROM: ${romUrl}…`}
                </p>
                <p className="text-slate-600 text-xs">Puede tardar 10–30 s dependiendo de la red</p>
              </>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3 max-w-sm px-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
                <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs text-slate-400 w-full">
                  <p className="font-semibold text-slate-300 mb-1">Para usar DOSBox:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Descarga o empaqueta el juego como <code className="text-violet-400">.jsdos</code></li>
                    <li>Colócalo en <code className="text-slate-300">/public{romUrl}</code></li>
                    <li>Vuelve a intentar</li>
                  </ol>
                </div>
                <Button variant="outline" sz="sm" onClick={launch}>
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {status === 'running' && (
        <p className="text-emerald-400 text-xs">
          Emulador activo · Haz clic en la pantalla para capturar el teclado ·{' '}
          <kbd className="bg-slate-700 px-1 rounded">F11</kbd> pantalla completa
        </p>
      )}
    </div>
  )
}
