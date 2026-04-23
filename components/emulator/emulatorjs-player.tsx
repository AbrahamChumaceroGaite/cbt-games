'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2, AlertCircle, Gamepad2,
  CheckCircle2, XCircle, FileQuestion, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'
import { checkFiles, parseCueBinFilename, buildFileUrl, type FileCheck } from '@/lib/hooks/use-preflight'

const PLATFORM_CORE: Record<Platform, string> = {
  dos:  'dosbox_pure',  // dosbox legacy not in CDN; dosbox_pure needs COOP/COEP (set in next.config)
  ps1:  'pcsx_rearmed',
  snes: 'snes9x',
  gba:  'mgba',
}

// Self-hosted via node_modules/@emulatorjs/* — copied to public/emulatorjs/ by scripts/copy-emulatorjs.mjs
const EJS_DATA_PATH = '/emulatorjs/'

type Status = 'idle' | 'checking' | 'preflight-error' | 'launching' | 'running' | 'error'

interface LogLine { time: string; text: string; kind: 'ok' | 'warn' | 'err' | 'info' }

interface EmulatorJSPlayerProps {
  platform: Platform
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const scriptRef   = useRef<HTMLScriptElement | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  const [status,   setStatus]   = useState<Status>('idle')
  const [error,    setError]    = useState<string | null>(null)
  const [checks,   setChecks]   = useState<FileCheck[]>([])
  const [logs,     setLogs]     = useState<LogLine[]>([])
  const [showLog,  setShowLog]  = useState(false)

  function log(text: string, kind: LogLine['kind'] = 'info') {
    setLogs(prev =>
      [{ time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text, kind }, ...prev].slice(0, 80)
    )
    console.log('[EJS]', text)
  }

  function markRunning() {
    observerRef.current?.disconnect()
    log('✅ Emulador activo', 'ok')
    setStatus('running')
  }

  async function launch() {
    // Clean up any previous run
    observerRef.current?.disconnect()
    if (scriptRef.current && document.body.contains(scriptRef.current))
      document.body.removeChild(scriptRef.current)

    setStatus('checking')
    setError(null)
    setLogs([])
    setShowLog(true)
    log(`Iniciando "${title}" (${platform.toUpperCase()})…`)

    // ── Step 1: preflight ─────────────────────────────────────────────────
    log('Verificando archivos requeridos…')
    const dir   = romUrl.substring(0, romUrl.lastIndexOf('/') + 1)
    const isCue = romUrl.endsWith('.cue')
    const filesToCheck: Omit<FileCheck, 'status'>[] = [
      { url: romUrl, label: `ROM (${romUrl.split('/').pop()})`, required: true,
        hint: `Coloca en /public${romUrl}` },
    ]

    if (isCue) {
      log('Leyendo .cue para encontrar el .bin referenciado…')
      const binFilename = await parseCueBinFilename(romUrl)
      if (binFilename) {
        const binUrl = buildFileUrl(dir, binFilename)
        log(`CUE → bin: "${binFilename}"`)
        filesToCheck.push({
          url: binUrl, label: `BIN (${binFilename})`, required: true,
          hint: `El .cue referencia "${binFilename}". Colócalo en /public${dir}`,
        })
      } else {
        log('No se pudo parsear el .cue', 'warn')
      }
    }

    if (biosUrl) {
      filesToCheck.push({
        url: biosUrl, label: `BIOS (${biosUrl.split('/').pop()})`, required: false,
        hint: `Opcional. Coloca en /public${biosUrl}`,
      })
    }

    const results = await checkFiles(filesToCheck)
    setChecks(results)
    results.forEach(r => {
      if (r.status === 'ok') log(`✅ ${r.label} — ${r.size ?? 'OK'}`, 'ok')
      else log(`${r.required ? '❌' : '⚠️'} ${r.label} — ${r.status}${r.hint ? ` (${r.hint})` : ''}`, r.required ? 'err' : 'warn')
    })

    const missing = results.filter(r => r.required && r.status !== 'ok')
    if (missing.length > 0) {
      log(`Faltan ${missing.length} archivo(s). Abortando.`, 'err')
      setStatus('preflight-error')
      return
    }

    // ── Step 2: configure EJS globals ────────────────────────────────────
    log(`Configurando EmulatorJS (core: ${PLATFORM_CORE[platform]})…`)
    const w = window as unknown as Record<string, unknown>

    const binCheck  = results.find(r => r.label.startsWith('BIN'))
    const actualRom = binCheck?.status === 'ok' ? binCheck.url : romUrl
    const biosCheck = results.find(r => r.url === biosUrl)

    // Variable names are taken directly from EmulatorJS loader.js source.
    // EJS_pathtodata is ALL lowercase — the camelCase version is silently ignored.
    // EJS_startOnLoaded (with "ed") — EJS_startOnLoad does not exist.
    // EJS_onLoadError does not exist in EmulatorJS — removed.
    w['EJS_player']          = '#ejs-player'
    w['EJS_core']            = PLATFORM_CORE[platform]
    w['EJS_gameUrl']         = actualRom
    w['EJS_pathtodata']      = EJS_DATA_PATH   // lowercase "todata" — critical
    w['EJS_color']           = '#7c3aed'
    w['EJS_startOnLoaded']   = true            // "Loaded" not "Load"
    w['EJS_language']        = 'en-EN'         // avoid es-BO 404 (not in localization files)

    if (biosUrl && biosCheck?.status === 'ok') {
      w['EJS_biosUrl'] = biosUrl
      log(`BIOS: ${biosUrl}`, 'info')
    } else if (biosUrl) {
      log('BIOS no encontrada — usando HLE BIOS (menor compatibilidad)', 'warn')
    }

    // ── Step 3: watch for canvas (EmulatorJS renders into #ejs-player) ───
    const playerEl = document.getElementById('ejs-player')
    if (playerEl) {
      observerRef.current = new MutationObserver(() => {
        const canvas = playerEl.querySelector('canvas')
        if (canvas && canvas.width > 0) markRunning()
      })
      observerRef.current.observe(playerEl, { childList: true, subtree: true, attributes: true })
    }

    w['EJS_onGameStart'] = () => { log('EJS_onGameStart fired', 'ok'); markRunning() }

    // ── Step 4: inject loader — overlay drops so EJS UI becomes visible ──
    log(`Cargando EmulatorJS (auto-hospedado)…`)
    setStatus('launching')   // <-- overlay clears here; EJS renders freely

    const script = document.createElement('script')
    script.src = `${EJS_DATA_PATH}loader.js`
    script.onerror = () => {
      observerRef.current?.disconnect()
      const msg = 'No se pudo cargar loader.js — ejecuta npm run copy-emulatorjs'
      log(`❌ ${msg}`, 'err')
      setError(msg)
      setStatus('error')
    }
    document.body.appendChild(script)
    scriptRef.current = script
    log('loader.js inyectado — EmulatorJS tomará el control del panel', 'ok')
  }

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      if (scriptRef.current && document.body.contains(scriptRef.current))
        document.body.removeChild(scriptRef.current)
    }
  }, [])

  const showOverlay = status === 'idle' || status === 'checking' || status === 'preflight-error' || status === 'error'
  const platformLabel = platform.toUpperCase()

  return (
    <div className="flex flex-col gap-2">
      {/* ── Player container ──────────────────────────────────────────── */}
      <div
        className="relative w-full rounded-xl bg-black overflow-hidden"
        style={{ aspectRatio: '4/3', minHeight: 360 }}
      >
        {/* EmulatorJS always renders here — no overlay on top during 'launching' / 'running' */}
        <div id="ejs-player" className="absolute inset-0 w-full h-full" />

        {/* Overlay: only idle / checking / preflight-error / error */}
        {showOverlay && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-black rounded-xl p-6">

            {status === 'idle' && (
              <>
                <Gamepad2 className="h-14 w-14 text-violet-500 opacity-40" />
                <div className="text-center space-y-1">
                  <p className="text-white font-semibold text-lg">{title}</p>
                  <p className="text-slate-500 text-sm">{platformLabel} · {PLATFORM_CORE[platform]}</p>
                </div>
                <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-300">Archivos necesarios</p>
                  <p>📀 <code className="text-violet-400 break-all">/public{romUrl}</code></p>
                  {biosUrl && <p>🔧 <code className="text-slate-400 break-all">/public{biosUrl}</code> <span className="text-slate-600">(opcional)</span></p>}
                  {platform === 'dos' && (
                    <div className="border-t border-slate-700 pt-1.5 mt-1.5">
                      <p className="text-slate-500">El <code>.jsdos</code> debe incluir <code>dosbox.conf</code>:</p>
                      <pre className="text-slate-400 bg-slate-800 rounded p-1.5 mt-1 leading-5 select-all">{`[autoexec]\nmount c .\nc:\ncd doom\nDOOM.EXE`}</pre>
                    </div>
                  )}
                </div>
                <Button onClick={launch} sz="lg" className="px-8">▶ Iniciar {platformLabel}</Button>
              </>
            )}

            {status === 'checking' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-slate-300 text-sm">Verificando archivos…</p>
              </div>
            )}

            {status === 'preflight-error' && (
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-300 font-semibold text-sm">Archivo(s) requerido(s) no encontrado(s)</p>
                </div>
                <PreflightList checks={checks} />
                <Button variant="outline" sz="sm" onClick={() => setStatus('idle')}>Volver</Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-red-300 text-xs w-full text-center">
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

      {/* ── Status bar (below player, never blocking it) ─────────────── */}
      {status === 'launching' && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-800/40 bg-violet-950/30 px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300">EmulatorJS cargando — descargando core y ROM…</p>
        </div>
      )}
      {status === 'running' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            Emulador activo · Clic en pantalla para capturar entrada ·{' '}
            <kbd className="bg-slate-700 px-1 rounded text-slate-300">F11</kbd> pantalla completa ·{' '}
            <kbd className="bg-slate-700 px-1 rounded text-slate-300">Esc</kbd> menú
          </p>
        </div>
      )}

      {/* ── Debug log (collapsible, shown once any log exists) ───────── */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
            onClick={() => setShowLog(v => !v)}
          >
            <span>Debug log ({logs.length})</span>
            {showLog ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showLog && (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto font-mono px-3 pb-3">
              {logs.map((l, i) => (
                <p key={i} className={`text-xs leading-5 flex gap-2 ${
                  l.kind === 'err'  ? 'text-red-400'
                  : l.kind === 'ok'   ? 'text-emerald-400'
                  : l.kind === 'warn' ? 'text-amber-400'
                  : 'text-slate-400'
                }`}>
                  <span className="text-slate-600 shrink-0">{l.time}</span>
                  <span>{l.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-slate-300">{c.label}</p>
              {!c.required && <span className="text-xs text-slate-600">(opcional)</span>}
            </div>
            <code className="text-xs text-slate-500 block truncate">{c.url}</code>
            {c.status === 'ok'  && <p className="text-xs text-emerald-500 mt-0.5">{c.size}</p>}
            {c.status !== 'ok' && c.hint && <p className="text-xs text-amber-400 mt-0.5">{c.hint}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
