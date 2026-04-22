export interface FileCheck {
  url: string
  label: string
  required: boolean
  status: 'pending' | 'ok' | 'missing' | 'error'
  contentType?: string
  size?: string
  hint?: string
}

export async function checkFiles(files: Omit<FileCheck, 'status'>[]): Promise<FileCheck[]> {
  return Promise.all(
    files.map(async f => {
      try {
        const res = await fetch(f.url, { method: 'HEAD' })
        if (res.ok) {
          const bytes  = parseInt(res.headers.get('content-length') ?? '0', 10)
          const size   = bytes > 0 ? formatBytes(bytes) : undefined
          const ct     = res.headers.get('content-type') ?? undefined
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
