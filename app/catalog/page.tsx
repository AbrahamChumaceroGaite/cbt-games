'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/context/auth-context'
import { queryBus } from '@/lib/application/container'
import { mkGetAllGamesQ } from '@/lib/application/queries/get-all-games.query'
import { GameEntity, Platform } from '@/lib/domain/entities/game.entity'
import { GameCard } from '@/components/catalog/game-card'
import { PlatformFilter } from '@/components/catalog/platform-filter'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Gamepad2, LogOut, Search, Loader2 } from 'lucide-react'

export default function CatalogPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [games, setGames] = useState<GameEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState<Platform | 'all'>('all')

  useEffect(() => {
    if (!user) router.replace('/')
  }, [user, router])

  const fetchGames = useCallback(async () => {
    setLoading(true)
    const results = await queryBus.execute<GameEntity[]>(
      mkGetAllGamesQ({
        search: search || undefined,
        platform: platform !== 'all' ? platform : undefined,
      }),
    )
    setGames(results)
    setLoading(false)
  }, [search, platform])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  function handleLogout() {
    logout()
    router.push('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f1117]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30">
              <Gamepad2 className="h-5 w-5 text-violet-400" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">RetroVault</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              Hola, <span className="text-white font-medium">{user.name}</span>
            </span>
            <Button variant="ghost" sz="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Biblioteca</h1>
          <p className="text-slate-400 text-sm">
            {games.length} juego{games.length !== 1 ? 's' : ''} disponibles
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <Input
              placeholder="Buscar juegos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <PlatformFilter selected={platform} onChange={setPlatform} />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Gamepad2 className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No se encontraron juegos</p>
            <Button variant="outline" sz="sm" onClick={() => { setSearch(''); setPlatform('all') }}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
