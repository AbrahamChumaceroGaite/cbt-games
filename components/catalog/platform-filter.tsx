'use client'

import { Platform } from '@/lib/domain/entities/game.entity'
import { Button } from '@/components/ui/button'

const PLATFORMS: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ps1', label: 'PS1' },
  { value: 'dos', label: 'DOS' },
  { value: 'snes', label: 'SNES' },
  { value: 'gba', label: 'GBA' },
]

interface PlatformFilterProps {
  selected: Platform | 'all'
  onChange: (p: Platform | 'all') => void
}

export function PlatformFilter({ selected, onChange }: PlatformFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PLATFORMS.map(p => (
        <Button
          key={p.value}
          variant={selected === p.value ? 'default' : 'outline'}
          sz="sm"
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
