'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Gamepad2, CheckCircle2, XCircle, FileQuestion } from 'lucide-react'
import { Platform } from '@/lib/domain/entities/game.entity'
import { checkFiles, parseCueBinFilename, buildFileUrl, type FileCheck } from '@/lib/hooks/use-preflight'

const PLATFORM_CORE: Record<Platform, string> = {
  dos:  'dosbox',
  ps1:  'pcsx_rearmed',
  snes: 'snes9x',
  gba:  'mgba',
}

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/'

type Status = 'idle' | 'checking' | 'preflight-error' | 'launched' | 'error'

interface EmulatorJSPlayerProps {
  platform: Platform
  romUrl: string
  biosUrl?: string
  title: string
}

export function EmulatorJSPlayer({ platform, romUrl, biosUrl, title }: EmulatorJSPlayerProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  const [status,  setStatus]  = useState<Status>('idle')
  const [error,   setError]   = useState<string | null>(null)
  const [checks,  setChecks]  = useState<FileCheck[]>([])

  async function launch() {
    setStatus('checking')
    setError(null)

    // ── Preflight ─────────────────────────────────────────────────────────
    const dir    = romUrl.substring(0, romUrl.lastIndexOf('/') + 1)
    const isCue  = romUrl.endsWith('.cue')
    const filesToCheck: Omit<FileCheck, 'status'>[] = [
      { url: romUrl, label: `ROM (${romUrl.split('/').pop()})`, required: true,
        hint: `Coloca en /public${romUrl}` },
    ]

    if (isCue) {
      const binFilename = await parseCueBinFilename(romUrl)
      if (binFilename) {
        const binUrl = buildFileUrl(dir, binFilename)
        filesToCheck.push({
          url: binUrl,
          label: `BIN (${binFilename})`,
          required: true,
          hint: `El .cue lo referencia como "${binFilename}". Coloca en /public${dir}`,
        })
      }
    }

    if (biosUrl) {
      filesToCheck.push({
        url: biosUrl, label: `BIOS (${biosUrl.split('/').pop()})`,
        required: false,
        hint: `Opcional. Coloca en /public${biosUrl}`,
      })
    }

    const results = await checkFiles(filesToCheck)
    setChecks(results)

    const requiredMissing = results.filter(r => r.required && r.status !== 'ok')
    if (requiredMissing.length > 0) {
      setStatus('preflight-error')
      return
    }

    // ── Configure & inject EmulatorJS — then get out of the way ──────────
    const w = window as unknown as Record<string, unknown>

    const binCheck   = results.find(r => r.label.startsWith('BIN'))
    const actualRom  = binCheck?.status === 'ok' ? binCheck.url : romUrl
    const biosCheck  = results.find(r => r.url === biosUrl)

    w['EJS_player']      = '#ejs-player'
    w['EJS_core']        = PLATFORM_CORE[platform]
    w['EJS_gameUrl']     = actualRom
    w['EJS_pathToData']  = EJS_CDN
    w['EJS_color']       = '#7c3aed'
    w['EJS_startOnLoad'] = true

    if (biosUrl && biosCheck?.status === 'ok') {
      w['EJS_biosUrl'] = biosUrl
    }

    w['EJS_onLoadError'] = (msg: unknown) => {
      const text = typeof msg === 'string' ? msg : 'Error interno de EmulatorJS'
      setError(text)
      setStatus('error')
    }

    // Remove any previous loader script
    if (scriptRef.current && document.body.contains(scriptRef.current)) {
      document.body.removeChild(scriptRef.current)
    }

    const script = document.createElement('script')
    script.src = `${EJS_CDN}loader.js`
    script.onerror = () => {
      setError('No se pudo descargar loader.js — verifica tu conexión a internet')
      setStatus('error')
    }
    document.body.appendChild(script)
    scriptRef.current = script

    // Show the EmulatorJS div immediately — it has its own loading UI
    setStatus('launched')
  }

  useEffect(() => {
    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current))
        document.body.removeChild(scriptRef.current)
    }
  }, [])

  const platformLabel = platform.toUpperCase()
  const showOverlay   = status === 'idle' || status === 'checking' || status === 'preflight-error' || status === 'error'

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full rounded-xl bg-black overflow-hidden"
        style={{ aspectRatio: '4/3', minHeight: 360 }}
      >
        {/* EmulatorJS renders here — always present in DOM so EJS can find #ejs-player */}
        <div id="ejs-player" className="absolute inset-0 w-full h-full" />

        {/* Overlay — only shown before launch or on error */}
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
                      <pre className="text-slate-400 bg-slate-800 rounded p-1.5 mt-1 leading-5 text-xs select-all">{`[autoexec]\nmount c .\nc:\ncd doom\nDOOM.EXE`}</pre>
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
