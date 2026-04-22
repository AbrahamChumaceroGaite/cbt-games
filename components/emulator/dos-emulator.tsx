'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Terminal, AlertCircle, CheckCircle2, XCircle, FileQuestion } from 'lucide-react'
import { checkFiles, type FileCheck } from '@/lib/hooks/use-preflight'

const JSDOS_CDN = 'https://v8.js-dos.com/latest/js-dos.js'
const LOAD_TIMEOUT_MS = 20_000

type Status = 'idle' | 'checking' | 'preflight-error' | 'loading-sdk' | 'loading-rom' | 'running' | 'error'

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
  const containerRef  = useRef<HTMLDivElement>(null)
  const instanceRef   = useRef<{ stop(): void } | null>(null)
  const [status, setStatus]   = useState<Status>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [checks, setChecks]   = useState<FileCheck[]>([])
  const [logs, setLogs]       = useState<string[]>([])

  function addLog(msg: string) {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
    console.log('[DosEmulator]', msg)
  }

  async function launch() {
    if (!containerRef.current) return
    setStatus('checking')
    setError(null)
    setLogs([])
    addLog(`Verificando archivos para "${title}"…`)

    // ── Preflight ──────────────────────────────────────────────────────────
    const results = await checkFiles([
      {
        url: romUrl,
        label: 'Bundle .jsdos',
        required: true,
        hint: `Coloca el archivo en /public${romUrl}`,
      },
    ])
    setChecks(results)

    const missing = results.filter(r => r.required && r.status !== 'ok')
    if (missing.length > 0) {
      addLog(`❌ ${missing.length} archivo(s) no encontrado(s)`)
      setStatus('preflight-error')
      return
    }

    results.forEach(r => addLog(`✅ ${r.label} — ${r.size ?? 'tamaño desconocido'}`))

    // ── Load SDK ──────────────────────────────────────────────────────────
    setStatus('loading-sdk')
    addLog('Cargando SDK js-dos desde CDN…')

    const timer = setTimeout(() => {
      addLog('⏱ Timeout: el SDK o la ROM tardaron demasiado')
      setStatus('error')
      setError('Tiempo de espera agotado. Revisa tu conexión e intenta de nuevo.')
    }, LOAD_TIMEOUT_MS)

    try {
      await loadScript(JSDOS_CDN)
      if (!window.Dos) throw new Error('window.Dos no está disponible tras cargar el SDK.')
      addLog('✅ SDK cargado. Iniciando DOSBox…')

      setStatus('loading-rom')
      addLog(`Montando bundle: ${romUrl}`)
      instanceRef.current = await window.Dos(containerRef.current, { url: romUrl })

      clearTimeout(timer)
      addLog('✅ DOSBox iniciado correctamente')
      setStatus('running')
    } catch (e) {
      clearTimeout(timer)
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      addLog(`❌ Error: ${msg}`)
      setError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    return () => { instanceRef.current?.stop() }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3', minHeight: 360 }}>
        {/* jsdos-container constrains js-dos injected UI via globals.css */}
        <div ref={containerRef} className="jsdos-container w-full h-full" />

        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/92 p-6">

            {/* ── Idle ── */}
            {status === 'idle' && (
              <>
                <Terminal className="h-14 w-14 text-violet-500 opacity-40" />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-lg">{title}</p>
                  <p className="text-slate-500 text-sm">MS-DOS · DOSBox WASM</p>
                </div>
                <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-300">Bundle requerido</p>
                  <code className="text-violet-400 block">/public{romUrl}</code>
                  <p className="text-slate-600 mt-1">
                    Si DOSBox muestra "Illegal command: doom", tu bundle tiene los archivos
                    en una subcarpeta. El <code className="text-slate-400">dosbox.conf</code> debe incluir:
                  </p>
                  <pre className="text-slate-400 bg-slate-800 rounded p-2 leading-5">{`[autoexec]\nmount c .\nc:\ncd doom\nDOOM.EXE`}</pre>
                </div>
                <Button onClick={launch} sz="lg" className="px-8">
                  ▶ Iniciar DOSBox
                </Button>
              </>
            )}

            {/* ── Checking ── */}
            {status === 'checking' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-slate-300 text-sm">Verificando archivos…</p>
              </div>
            )}

            {/* ── Preflight error ── */}
            {status === 'preflight-error' && (
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                  <p className="text-red-300 font-semibold text-sm">Archivo no encontrado</p>
                </div>
                <PreflightList checks={checks} />
                <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>Volver</Button>
              </div>
            )}

            {/* ── Loading SDK / ROM ── */}
            {(status === 'loading-sdk' || status === 'loading-rom') && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-slate-300 text-sm">
                  {status === 'loading-sdk' ? 'Descargando SDK js-dos…' : 'Iniciando DOSBox…'}
                </p>
              </div>
            )}

            {/* ── Error ── */}
            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-red-300 text-sm text-center">{error}</p>
                <div className="flex gap-2">
                  <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>Volver</Button>
                  <Button sz="sm" onClick={launch}>Reintentar</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Debug log ── */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Debug log</p>
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto font-mono">
            {logs.map((l, i) => (
              <p key={i} className="text-xs text-slate-400 leading-5">{l}</p>
            ))}
          </div>
        </div>
      )}

      {status === 'running' && (
        <p className="text-emerald-400 text-xs">
          Emulador activo · Clic en la pantalla para capturar teclado ·{' '}
          <kbd className="bg-slate-700 px-1 rounded text-slate-300">F11</kbd> pantalla completa
        </p>
      )}
    </div>
  )
}

function PreflightList({ checks }: { checks: FileCheck[] }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {checks.map(c => (
        <div key={c.url} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
          {c.status === 'ok'
            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            : c.status === 'missing'
            ? <XCircle     className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            : <FileQuestion className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300">{c.label}</p>
            <code className="text-xs text-slate-500 block truncate">{c.url}</code>
            {c.status === 'ok'   && <p className="text-xs text-emerald-500">{c.size}</p>}
            {c.status !== 'ok'   && c.hint && <p className="text-xs text-amber-400 mt-0.5">{c.hint}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
