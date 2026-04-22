'use client'

import Link from 'next/link'
import Image from 'next/image'
import { GameEntity } from '@/lib/domain/entities/game.entity'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

const PLATFORM_LABEL: Record<string, string> = {
  ps1: 'PlayStation 1',
  dos: 'MS-DOS',
  snes: 'SNES',
  gba: 'Game Boy Advance',
}

interface GameCardProps {
  game: GameEntity
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Card variant="interactive" p="none" className="overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[4/3] bg-slate-900">
        <Image
          src={game.coverUrl}
          alt={game.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <Badge variant="platform" className="absolute top-2 left-2">
          {PLATFORM_LABEL[game.platform] ?? game.platform}
        </Badge>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-white text-base leading-tight">{game.title}</h3>
        <p className="text-slate-400 text-xs line-clamp-2 flex-1">{game.description}</p>

        <CardContent className="mt-0 p-0 flex gap-2 flex-wrap">
          <Badge variant="genre">{game.genre}</Badge>
          <Badge variant="year">{game.year}</Badge>
        </CardContent>

        <CardFooter className="mt-2 p-0">
          <span className="text-xs text-slate-500 truncate">{game.publisher}</span>
          <Link href={`/play/${game.id}`}>
            <Button sz="sm" className="shrink-0">
              <Play className="h-3 w-3" />
              Jugar
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  )
}
