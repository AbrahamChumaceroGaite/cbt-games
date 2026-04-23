/**
 * Copies EmulatorJS files from node_modules to public/emulatorjs/
 * so the emulator is self-hosted with no CDN dependency.
 *
 * Run automatically via `npm run copy-emulatorjs` or postinstall.
 */
import { cpSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const root   = resolve(fileURLToPath(import.meta.url), '..', '..')
const nm     = join(root, 'node_modules', '@emulatorjs')
const dest   = join(root, 'public', 'emulatorjs')
const coresDest = join(dest, 'cores')

mkdirSync(join(coresDest, 'reports'), { recursive: true })

// ── Main EmulatorJS data files ────────────────────────────────────────────
const ejsSrc = join(nm, 'emulatorjs', 'data')
cpSync(ejsSrc, dest, { recursive: true })
console.log('✅ emulatorjs data copied')

// ── Cores needed by this project ─────────────────────────────────────────
const CORES = ['pcsx_rearmed', 'snes9x', 'mgba', 'dosbox_pure']

for (const core of CORES) {
  const coreSrc = join(nm, `core-${core}`)
  if (!existsSync(coreSrc)) {
    console.warn(`⚠️  core-${core} not found in node_modules — skipping`)
    continue
  }

  // Copy wasm/data files to cores/
  for (const file of readdirSync(coreSrc)) {
    if (file.endsWith('.data') || file.endsWith('.js') || file.endsWith('.wasm')) {
      cpSync(join(coreSrc, file), join(coresDest, file))
    }
  }

  // Copy report JSON to cores/reports/
  const reportsDir = join(coreSrc, 'reports')
  if (existsSync(reportsDir)) {
    for (const file of readdirSync(reportsDir)) {
      cpSync(join(reportsDir, file), join(coresDest, 'reports', file))
    }
  }

  console.log(`✅ core-${core} copied`)
}

console.log(`\n✅ EmulatorJS self-hosted at public/emulatorjs/`)
