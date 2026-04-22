export interface FileCheck {
  url: string
  label: string
  required: boolean
  status: 'pending' | 'ok' | 'missing' | 'error'
  contentType?: string
  size?: string
  hint?: string
}

/** Fetch a CUE file and return the FILE reference inside it (raw filename, not URL-encoded) */
export async function parseCueBinFilename(cueUrl: string): Promise<string | null> {
  try {
    const res  = await fetch(cueUrl)
    const text = await res.text()
    const m    = text.match(/FILE\s+"([^"]+)"/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/**
 * Build a URL-safe path for a file that may have spaces, brackets, parentheses.
 * Encodes each path segment individually, preserving the directory slashes.
 */
export function buildFileUrl(dir: string, filename: string): string {
  const encoded = filename
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/')
  return `${dir}${encoded}`
}

export async function checkFiles(files: Omit<FileCheck, 'status'>[]): Promise<FileCheck[]> {
  return Promise.all(
    files.map(async f => {
      try {
        const res = await fetch(f.url, { method: 'HEAD' })
        if (res.ok) {
          const bytes = parseInt(res.headers.get('content-length') ?? '0', 10)
          const size  = bytes > 0 ? formatBytes(bytes) : undefined
          const ct    = res.headers.get('content-type') ?? undefined
          return { ...f, status: 'ok' as const, size, contentType: ct }
        }
        return { ...f, status: 'missing' as const }
      } catch {
        return { ...f, status: 'error' as const }
      }
    }),
  )
}

function formatBytes(b: number): string {
  if (b < 1024)        return `${b} B`
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}
