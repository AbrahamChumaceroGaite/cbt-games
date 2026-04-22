'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

interface DosEmulatorProps {
  romUrl: string
  title: string
}

export function DosEmulator({ romUrl, title }: DosEmulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const ciRef = useRef<unknown>(null)

  async function launch() {
    if (!containerRef.current) return
    setStatus('loading')
    setError(null)
    try {
      // js-dos v8 API — dynamic import avoids SSR issues
      const { Dos } = await import('js-dos')
      ciRef.current = await Dos(containerRef.current, { url: romUrl })
      setStatus('running')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el emulador')
      setStatus('error')
    }
  }

  useEffect(() => {
    return () => {
      if (ciRef.current && typeof (ciRef.current as { stop?: () => void }).stop === 'function') {
        ;(ciRef.current as { stop: () => void }).stop()
      }
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="w-full bg-black rounded-lg overflow-hidden"
        style={{ minHeight: 400, aspectRatio: '4/3' }}
      />

      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
          <p className="text-slate-300 mb-4 text-sm">Presiona para iniciar {title}</p>
          <Button onClick={launch} sz="lg">
            ▶ Iniciar DOS
          </Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando emulador DOSBox...
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error ?? 'Error desconocido'}
          <Button variant="outline" sz="sm" onClick={launch}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'running' && (
        <p className="text-emerald-400 text-xs">
          Emulador activo. Haz clic en la pantalla para capturar el teclado.
        </p>
      )}
    </div>
  )
}
