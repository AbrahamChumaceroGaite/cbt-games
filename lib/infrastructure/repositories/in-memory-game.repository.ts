import { GameEntity, Platform } from '@/lib/domain/entities/game.entity'
import { GameRepository } from '@/lib/domain/repositories/game.repository'

const GAMES: GameEntity[] = [
  {
    id: 'doom',
    title: 'DOOM',
    platform: 'dos',
    genre: 'FPS',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/5/57/Doom_%281993%29_gameplay.png',
    romUrl: '/roms/doom.jsdos',
    // Bundle: ZIP con DOOM.EXE + DOOM.WAD + dosbox.conf → renombrar a doom.jsdos
    description: 'El FPS que definió un género. Combate demoníaco en Marte.',
    year: 1993,
    publisher: 'id Software',
  },
  {
    id: 'prince-of-persia',
    title: 'Prince of Persia',
    platform: 'dos',
    genre: 'Platformer',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/6/69/Prince_of_Persia_1_-_MS-DOS_-_Title_Screen.png',
    romUrl: '/roms/prince.jsdos',
    description: 'Aventura clásica de plataformas con animaciones revolucionarias.',
    year: 1989,
    publisher: 'Broderbund',
  },
  {
    id: 'resident-evil',
    title: 'Resident Evil',
    platform: 'ps1',
    genre: 'Survival Horror',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/3/33/Resident_Evil_-_PS1_cover.png',
    // core pcsx_rearmed tiene HLE BIOS integrada; si tienes SCPH1001.BIN úsala para mejor compatibilidad
    // usa .cue como entrada principal para que el emulador resuelva bien el .bin multípista
    romUrl: '/roms/resident-evil.cue',
    biosUrl: '/bios/SCPH1001.BIN',
    description: 'La mansión Spencer, zombis y puzzles que definieron el survival horror.',
    year: 1996,
    publisher: 'Capcom',
  },
  {
    id: 'crash-bandicoot',
    title: 'Crash Bandicoot',
    platform: 'ps1',
    genre: 'Platformer',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Crash_Bandicoot_Cover.png',
    romUrl: '/roms/crash.cue',
    biosUrl: '/bios/SCPH1001.BIN',
    description: 'El marsupial más famoso de PS1 en su aventura original.',
    year: 1996,
    publisher: 'Naughty Dog / Sony',
  },
  {
    id: 'final-fantasy-vii',
    title: 'Final Fantasy VII',
    platform: 'ps1',
    genre: 'RPG',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/c/ce/Ffvii_boxart.jpg',
    romUrl: '/roms/ff7.cue',
    biosUrl: '/bios/SCPH1001.BIN',
    description: 'El RPG épico de Cloud Strife y la lucha contra Shinra.',
    year: 1997,
    publisher: 'Square',
  },
  {
    id: 'super-mario-world',
    title: 'Super Mario World',
    platform: 'snes',
    genre: 'Platformer',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/3/32/Super_Mario_World_Coverart.png',
    romUrl: '/roms/smw.sfc',
    description: 'Mario y Yoshi en su aventura más clásica del SNES.',
    year: 1990,
    publisher: 'Nintendo',
  },
  {
    id: 'pokemon-ruby',
    title: 'Pokémon Ruby',
    platform: 'gba',
    genre: 'RPG',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b7/Pokemon_Ruby_GBA_EN_boxart.jpg',
    romUrl: '/roms/pokemon-ruby.gba',
    description: 'Explora Hoenn y conviértete en el mejor entrenador Pokémon.',
    year: 2002,
    publisher: 'Game Freak / Nintendo',
  },
]

export class InMemoryGameRepository implements GameRepository {
  private games = GAMES

  async findAll(): Promise<GameEntity[]> {
    return [...this.games]
  }

  async findById(id: string): Promise<GameEntity | null> {
    return this.games.find(g => g.id === id) ?? null
  }

  async findByPlatform(platform: Platform): Promise<GameEntity[]> {
    return this.games.filter(g => g.platform === platform)
  }

  async search(query: string): Promise<GameEntity[]> {
    const q = query.toLowerCase()
    return this.games.filter(
      g =>
        g.title.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.publisher.toLowerCase().includes(q),
    )
  }
}
