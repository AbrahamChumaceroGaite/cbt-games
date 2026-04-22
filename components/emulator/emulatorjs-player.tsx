'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Gamepad2, CheckCircle2, XCircle, FileQuestion } from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'
import { checkFiles, type FileCheck } from '@/lib/hooks/use-preflight'

// pcsx_rearmed: lighter than mednafen_psx, includes HLE BIOS (no external BIOS required)
const PLATFORM_CORE: Record<Exclude<Platform, 'dos'>, string> = {
  ps1:  'pcsx_rearmed',
  snes: 'snes9x',
  gba:  'mgba',
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/'

const LOAD_TIMEOUT_MS: Record<Exclude<Platform, 'dos'>, number> = {
  ps1:  90_000,
  snes: 45_000,
  gba:  45_000,
}

type Status = 'idle' | 'checking' | 'preflight-error' | 'loading' | 'running' | 'error'

interface EmulatorJSPlayerProps {
  platform: Exclude<Platform, 'dos'>
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const [status,   setStatus]  = useState<Status>('idle')
  const [error,    setError]   = useState<string | null>(null)
  const [checks,   setChecks]  = useState<FileCheck[]>([])
  const [elapsed,  setElapsed] = useState(0)
  const [logs,     setLogs]    = useState<string[]>([])

  const scriptRef   = useRef<HTMLScriptElement | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function addLog(msg: string) {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
    console.log('[EmulatorJS]', msg)
  }

  function clearTimers() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  async function launch() {
    setStatus('checking')
    setError(null)
    setElapsed(0)
    setLogs([])
    addLog(`Verificando archivos para "${title}" (${platform.toUpperCase()})…`)

    // ── Preflight ──────────────────────────────────────────────────────────
    const filesToCheck: Omit<FileCheck, 'status'>[] = [
      {
        url: romUrl,
        label: `ROM (${romUrl.split('/').pop()})`,
        required: true,
        hint: `Coloca el archivo en /public${romUrl}`,
      },
    ]

    if (biosUrl) {
      filesToCheck.push({
        url: biosUrl,
        label: `BIOS (${biosUrl.split('/').pop()})`,
        required: false,        // pcsx_rearmed has HLE BIOS — not strictly required
        hint: `Opcional pero mejora la compatibilidad. Coloca en /public${biosUrl}`,
      })
    }

    const results = await checkFiles(filesToCheck)
    setChecks(results)

    const requiredMissing = results.filter(r => r.required && r.status !== 'ok')
    results.forEach(r =>
      addLog(r.status === 'ok'
        ? `✅ ${r.label} — ${r.size ?? 'OK'}`
        : `${r.required ? '❌' : '⚠️'} ${r.label} — ${r.status}`)
    )

    if (requiredMissing.length > 0) {
      addLog(`Faltan ${requiredMissing.length} archivo(s) requerido(s). Abortando.`)
      setStatus('preflight-error')
      return
    }

    // ── Launch ──────────────────────────────────────────────────────────
    setStatus('loading')
    addLog(`Cargando núcleo "${PLATFORM_CORE[platform]}" vía EmulatorJS CDN…`)

    const timeout = LOAD_TIMEOUT_MS[platform]
    timerRef.current = setTimeout(() => {
      clearTimers()
      addLog(`⏱ Timeout tras ${timeout / 1000}s`)
      setStatus('error')
      setError(
        `Tiempo de espera agotado (${timeout / 1000}s).\n` +
        `El núcleo ${PLATFORM_CORE[platform]} o la ROM no respondieron.`,
      )
    }, timeout)

    intervalRef.current = setInterval(() => {
      setElapsed(s => s + 1)
    }, 1000)

    const w = window as unknown as Record<string, unknown>
    w['EJS_player']      = '#ejs-player'
    w['EJS_core']        = PLATFORM_CORE[platform]
    w['EJS_gameUrl']     = romUrl
    w['EJS_pathToData']  = EJS_CDN
    w['EJS_color']       = '#7c3aed'
    w['EJS_startOnLoad'] = true
    // Only pass BIOS if file actually exists
    const biosCheck = results.find(r => r.url === biosUrl)
    if (biosUrl && biosCheck?.status === 'ok') {
      w['EJS_biosUrl'] = biosUrl
      addLog(`BIOS encontrada: ${biosUrl}`)
    } else if (biosUrl) {
      addLog(`⚠️ BIOS no encontrada, usando HLE (menor compatibilidad)`)
    }

    w['EJS_onGameStart'] = () => {
      clearTimers()
      addLog('✅ Emulador iniciado correctamente')
      setStatus('running')
    }
    w['EJS_onLoadError'] = (msg: unknown) => {
      clearTimers()
      const text = typeof msg === 'string' ? msg : 'Error interno de EmulatorJS'
      addLog(`❌ EJS_onLoadError: ${text}`)
      setStatus('error')
      setError(text)
    }

    const script = document.createElement('script')
    script.src = `${EJS_CDN}loader.js`
    script.onerror = () => {
      clearTimers()
      const msg = 'No se pudo descargar loader.js desde el CDN de EmulatorJS'
      addLog(`❌ ${msg}`)
      setStatus('error')
      setError(msg)
    }
    document.body.appendChild(script)
    scriptRef.current = script
    addLog('loader.js inyectado, esperando inicio del núcleo…')
  }

  useEffect(() => {
    return () => {
      clearTimers()
      if (scriptRef.current && document.body.contains(scriptRef.current))
        document.body.removeChild(scriptRef.current)
    }
  }, [])

  const timeout = LOAD_TIMEOUT_MS[platform]
  const platformLabel = platform.toUpperCase()

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3', minHeight: 360 }}>
        <div id="ejs-player" className="w-full h-full" />

        {status !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/92 p-6">

            {/* ── Idle ── */}
            {status === 'idle' && (
              <>
                <Gamepad2 className="h-14 w-14 text-violet-500 opacity-40" />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-lg">{title}</p>
                  <p className="text-slate-500 text-sm">{platformLabel} · EmulatorJS · {PLATFORM_CORE[platform]}</p>
                </div>
                {biosUrl && (
                  <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs space-y-1">
                    <p className="font-semibold text-slate-300">Archivos esperados</p>
                    <p>📀 <code className="text-violet-400">/public{romUrl}</code></p>
                    <p>🔧 <code className="text-slate-400">/public{biosUrl}</code> <span className="text-slate-600">(opcional)</span></p>
                  </div>
                )}
                <Button onClick={launch} sz="lg" className="px-8">
                  ▶ Iniciar {platformLabel}
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
                  <p className="text-red-300 font-semibold text-sm">Archivo(s) no encontrado(s)</p>
                </div>
                <PreflightList checks={checks} />
                <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>Volver</Button>
              </div>
            )}

            {/* ── Loading ── */}
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                <div className="text-center space-y-2">
                  <p className="text-slate-200 text-sm font-medium">Cargando {platformLabel}…</p>
                  <p className="text-slate-500 text-xs">Núcleo: {PLATFORM_CORE[platform]}</p>
                  <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-500 h-full transition-all duration-1000"
                      style={{ width: `${Math.min((elapsed / (timeout / 1000)) * 100, 95)}%` }}
                    />
                  </div>
                  <p className="text-slate-600 text-xs">{elapsed}s / {timeout / 1000}s máx.</p>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-red-300 text-xs whitespace-pre-line w-full">
                  {error}
                </div>
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
              <p key={i} className={`text-xs leading-5 ${l.includes('❌') ? 'text-red-400' : l.includes('✅') ? 'text-emerald-400' : l.includes('⚠️') ? 'text-amber-400' : 'text-slate-400'}`}>{l}</p>
            ))}
          </div>
        </div>
      )}

      {status === 'running' && (
        <p className="text-emerald-400 text-xs">
          Emulador activo · Clic en pantalla para capturar entrada ·{' '}
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
        <div key={c.url} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
          {c.status === 'ok'
            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            : c.status === 'missing'
            ? <XCircle      className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            : <FileQuestion className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-slate-300">{c.label}</p>
              {!c.required && <span className="text-xs text-slate-600">(opcional)</span>}
            </div>
            <code className="text-xs text-slate-500 block truncate">{c.url}</code>
            {c.status === 'ok'  && <p className="text-xs text-emerald-500 mt-0.5">{c.size}</p>}
            {c.status !== 'ok'  && c.hint && <p className="text-xs text-amber-400 mt-0.5">{c.hint}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
