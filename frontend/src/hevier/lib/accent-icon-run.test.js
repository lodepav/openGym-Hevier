// D123: the launcher icon follows the accent, and nothing else switches the launcher aliases.
import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { activeSeason } from '../../lib/seasonal.js'
import { seasonsOff } from './seasons-off.js'
import { accentFields, DEFAULT_GREEN, HEVY_BLUE } from './accents.js'

const icon = { id: 'green' }
const getIcon = vi.fn(async () => ({ id: icon.id }))
const setIcon = vi.fn(async ({ id }) => { icon.id = id; return { id } })
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true, isAndroid: async () => true }))
vi.mock('@capacitor/core', async orig => ({ ...(await orig()), registerPlugin: () => ({ getIcon, setIcon }) }))
const { initAccentIcon, _resetAccentIconForTests } = await import('./accent-icon-run.js')

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

async function start(S0) {
  let S = S0, onChange = null
  _resetAccentIconForTests()
  getIcon.mockClear(); setIcon.mockClear()
  initAccentIcon({ get: () => S, watch: () => fn => { onChange = fn } })
  await vi.waitFor(() => expect(getIcon).toHaveBeenCalled())   // the plugin is imported, then asked
  await settle()
  return { set: next => { S = next; onChange() } }
}
const settle = () => new Promise(r => setTimeout(r, 0))

describe('the launcher icon follows the accent (D123)', () => {
  it('calls nothing at start-up, even when the stored accent maps to another icon', async () => {
    icon.id = 'green'
    await start({ accent: 'brand' })    // upstream's fresh default, before the green is given
    await settle()
    expect(getIcon).toHaveBeenCalledTimes(1)
    expect(setIcon).not.toHaveBeenCalled()
  })

  it('saves a new icon only when the accent’s icon changes', async () => {
    icon.id = 'green'
    const s = await start({ accent: 'brand' })
    s.set(accentFields(DEFAULT_GREEN))  // the default given: the icon the phone holds already
    await settle()
    expect(setIcon).not.toHaveBeenCalled()
    s.set(accentFields(HEVY_BLUE))
    await settle()
    expect(setIcon).toHaveBeenLastCalledWith({ id: 'blue' })
    s.set(accentFields('#0a8cfa'))      // a custom colour near the blue keeps its icon
    await settle()
    expect(setIcon).toHaveBeenCalledTimes(1)
    s.set(accentFields('#e34b37'))      // a far colour keeps the green icon
    await settle()
    expect(setIcon).toHaveBeenLastCalledWith({ id: 'green' })
    expect(setIcon).toHaveBeenCalledTimes(2)
  })

  it('starts from the icon the phone holds', async () => {
    icon.id = 'teal'
    const s = await start(accentFields('#40c8e0'))
    s.set({ ...accentFields('#40c8e0'), other: 1 })
    await settle()
    expect(setIcon).not.toHaveBeenCalled()
    s.set(accentFields(DEFAULT_GREEN))
    await settle()
    expect(setIcon).toHaveBeenLastCalledWith({ id: 'green' })
  })

  it('tries again after the phone refused', async () => {
    icon.id = 'green'
    const s = await start(accentFields(DEFAULT_GREEN))
    setIcon.mockRejectedValueOnce(new Error('no'))
    s.set(accentFields(HEVY_BLUE))
    await settle()
    s.set({ ...accentFields(HEVY_BLUE) })
    await settle()
    expect(setIcon).toHaveBeenCalledTimes(2)
    expect(icon.id).toBe('blue')
  })
})

// Upstream's AppIconPlugin knows only its own aliases: a call to it would leave a second launcher
// entry until HevierIconPlugin's next reconcile, so nothing in the fork may reach it.
describe('upstream’s app icon setter is not reached under HEVIER', () => {
  const files = readdirSync(SRC, { recursive: true }).filter(f => /\.jsx?$/.test(f) && !/\.test\.jsx?$/.test(f))
  const importers = mod => files.filter(f => readFileSync(resolve(SRC, f), 'utf8').includes(mod)).sort()

  it('only the App icon row and the Christmas theme call it', () => {
    expect(importers("lib/app-icon.js'").concat(importers("from './app-icon.js'"))).toEqual(['components/AppIconRow.jsx', 'seasonal/christmas.jsx'])
  })

  it('the App icon row is left out of the fork’s Settings', () => {
    const src = readFileSync(resolve(SRC, 'hevier/views/SettingsRootHevy.jsx'), 'utf8')
    expect(src).toMatch(/HIDDEN_TYPES = \[[^\]]*\bAppIconRow\b/)
  })

  it('the Christmas theme never shows, so its icon offer never loads', () => {
    expect(importers("seasonal/christmas.jsx'")).toEqual(['components/Seasonal.jsx'])
    const S = { seasonal: { christmas: 'on' } }
    seasonsOff(S)
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      expect(activeSeason(S, d)).toBe(null)
    }
  })
})
