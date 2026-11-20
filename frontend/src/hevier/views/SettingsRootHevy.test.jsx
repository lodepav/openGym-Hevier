// @vitest-environment happy-dom
// Settings through seams S11 and S12 (hevier/DECISIONS.md D16): Hevy's titled root over upstream's
// pages, and upstream's pages without the rows that only steer upstream's workout layouts.
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import Settings from '../../views/Settings.jsx'
import { hooks } from '../hooks.js'
import { installSettings } from './SettingsRootHevy.jsx'
import { HIDDEN_ROWS, hiddenSetting } from '../lib/settings.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, container

function render(page, extra = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), extra), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Settings page={page} /></MemoryRouter>))
}
const titles = () => [...container.querySelectorAll('.lrow-t')].map(e => e.textContent)

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installSettings() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.settings = null
})

describe('hevier: Settings (seams S11, S12)', () => {
  it('groups the root under Account, Workout, Stats, App and Data & more, the account card first', () => {
    render(null)
    expect([...container.querySelectorAll('.sect-t')].map(h => h.textContent)).toEqual(['Account', 'Workout', 'Stats', 'App', 'Data & more'])
    const rows = titles()
    expect(rows.indexOf('During a workout')).toBeGreaterThan(-1)
    expect(rows).not.toContain('Workout')
    expect(rows).not.toContain('Previous values')   // upstream's Last time means, in Fine-tuning (D21)
    expect(rows).not.toContain('Muscle sets')   // in the Volume row's sheet (review S4)
    expect(rows.indexOf('Volume')).toBeLessThan(rows.indexOf('Units & language'))
    expect(rows.indexOf('Data & backup')).toBeGreaterThan(rows.indexOf('Look & Home'))
    expect(container.querySelector('.sp-acct')).toBeTruthy()
    expect(container.textContent).not.toContain('Cards')
    expect(container.querySelector('.sp-back').textContent).toBe('Today')
  })

  it('leaves the layout rows out of Workout and Fine-tuning, keeping the rest', () => {
    render('workout')
    const rows = titles()
    for (const k of HIDDEN_ROWS.workout) expect(rows).not.toContain(k)
    expect(rows).toContain('Rest timer')
    expect(rows).toContain('Effort per set')
    expect(rows).toContain('Weigh in before workouts')
    // the fork's workout has these (D107)
    expect(rows).toEqual(expect.arrayContaining(['Record trophies', 'Cheer on a record', 'Next exercise when the rest ends']))
    act(() => root.unmount()); container.remove()
    render('advanced')
    const adv = titles()
    for (const k of HIDDEN_ROWS.advanced) expect(adv).not.toContain(k)
    expect(adv).toContain('Swipe actions')
    expect(container.textContent).not.toContain('Everything hidden here stays one tap away')
  })

  it('During a workout has the fork’s Plates to load switch in Logging, off until switched on (D84)', () => {
    render('workout')
    const rows = titles()
    // The end of Logging, whatever rows upstream adds to it (1.4.5: the record rows).
    expect(rows.indexOf('Plates to load')).toBeGreaterThan(rows.indexOf('Compare sets with last time'))
    const sw = [...container.querySelectorAll('.lrow')].find(r => r.textContent.includes('Plates to load')).querySelector('[role="switch"], input[type="checkbox"], button')
    expect(useStore.getState().S.hvPlateLine).toBeUndefined()
    act(() => sw.click())
    expect(useStore.getState().S.hvPlateLine).toBe(true)
  })

  it('Plates to load is disabled and says what it needs while Plates and warm-ups is off, its choice kept', () => {
    render('workout', { modules: { plates: false }, hvPlateLine: true })
    const row = [...container.querySelectorAll('.lrow')].find(r => r.textContent.includes('Plates to load'))
    expect(row.querySelector('.lrow-s').textContent).toBe('Needs Plates and warm-ups')
    const sw = row.querySelector('[role="switch"]')
    expect(sw.disabled).toBe(true)
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(sw.getAttribute('aria-label')).toBe('Plates to load')
    expect(useStore.getState().S.hvPlateLine).toBe(true)
  })

  it('Effort on warm-ups follows Plates to load in Logging while effort is RIR or RPE, on until switched off (D120)', () => {
    render('workout', { effort: 'rir' })
    const rows = titles()
    expect(rows.indexOf('Effort on warm-ups')).toBe(rows.indexOf('Plates to load') + 1)
    const sw = () => [...container.querySelectorAll('.lrow')].find(r => r.textContent.includes('Effort on warm-ups')).querySelector('[role="switch"]')
    expect(sw().getAttribute('aria-checked')).toBe('true')
    expect(sw().getAttribute('aria-label')).toBe('Effort on warm-ups')
    act(() => sw().click())
    expect(useStore.getState().S.hvWarmupEffort).toBe(false)
    act(() => sw().click())
    expect(useStore.getState().S.hvWarmupEffort).toBe(true)
  })

  it('Effort on warm-ups is not offered while effort is off, its choice kept', () => {
    render('workout', { effort: 'none', hvWarmupEffort: false })
    expect(titles()).not.toContain('Effort on warm-ups')
    expect(useStore.getState().S.hvWarmupEffort).toBe(false)
  })

  it('offers no theme or gym check-in, and the fork’s Accent row in place of upstream’s, keeping the rest of Look & Home (D17, D12, D123)', () => {
    render('look')
    const rows = titles()
    expect(rows).not.toContain('Theme')
    expect(rows).not.toContain('Accent color')
    expect(rows[0]).toBe('Accent')
    expect(container.querySelector('.hv-accent-row input[type="color"]')).toBeTruthy()
    expect(rows).toContain('Body diagram')
    expect(rows).not.toContain('Gym check-in')
    expect(rows).not.toContain('Body weight')   // D134: Today has no card to switch
    expect(hiddenSetting({ page: 'look', title: 'Accent color' })).toBe(true)
    act(() => root.unmount()); container.remove()
    render(null)
    const look = [...container.querySelectorAll('.sp-root-row')].find(r => r.textContent.includes('Look & Home'))
    expect(look.textContent).toBe('Look & HomeMale') // the body diagram, not the theme (review S5)
  })

  it('Gyms & equipment: the gyms, no filter switch or active profile (D62)', () => {
    const equipProfiles = [{ id: 'g1', name: 'City Gym', equipment: ['dumbbell'], accV: 1 }]
    render(null, { equipProfiles, activeEquipId: 'g1', equipFilterOn: true })
    const row = [...container.querySelectorAll('.sp-root-row')].find(r => r.textContent.includes('Gyms & equipment'))
    expect(row.textContent).toBe('Gyms & equipmentCity Gym')
    act(() => root.unmount()); container.remove()
    render('equipment', { equipProfiles, activeEquipId: 'g1', equipFilterOn: true })
    const rows = titles()
    expect(rows).not.toContain('Filter by equipment')
    expect(rows).not.toContain('Active gym')
    expect(rows).toEqual(expect.arrayContaining(['Plates', 'Dumbbells', 'City Gym', 'Add gym']))
    // Upstream's Your gym section goes with its one row, and the gyms' footer with it: once, under Add gym.
    const text = container.textContent
    expect(text.split('Each gym’s equipment. The exercise picker shows what the workout’s gym has; outside a workout, choose a gym in its equipment filter.')).toHaveLength(2)
    expect(text).not.toContain('Your gym')
    expect([...container.querySelectorAll('.sect-t')].map(h => h.textContent)).toEqual(['Equipment at City Gym'])
    expect(hiddenSetting({ page: 'equipment', title: 'Active gym' })).toBe(true)
  })

  it('a search never offers a row the page leaves out', () => {
    expect(hiddenSetting({ page: 'workout', title: 'Layout' })).toBe(true)
    expect(hiddenSetting({ page: 'workout', title: 'Rest timer' })).toBe(false)
    expect(hiddenSetting({ page: 'workout', title: 'Workout', isPage: true })).toBe(false)
  })

  it('leaves out 1.4.3’s rows the fork has its own answer for, and the support section', () => {
    render('look')
    expect(titles()).not.toContain('Seasonal themes')
    act(() => root.unmount()); container.remove()
    render('about')
    expect(titles()).not.toContain('Buy me a coffee')
    expect(titles()).not.toContain('Ko-fi')
    expect(container.textContent).not.toContain('Support openGym')
    expect(hiddenSetting({ page: 'reminders', title: 'Gym reminder' })).toBe(true)
    expect(hiddenSetting({ page: 'advanced', title: 'Planned sessions start from' })).toBe(true)
    // The gym reminder's and the seasonal themes' pages, and every row on them, stay out of a search.
    expect(hiddenSetting({ page: 'gym', title: 'Gym reminder', isPage: true })).toBe(true)
    expect(hiddenSetting({ page: 'themes', title: 'Halloween' })).toBe(true)
    expect(hiddenSetting({ page: 'look', title: 'Look & Home', isPage: true })).toBe(false)
    // D100: what the APK no longer has is not offered either.
    expect(hiddenSetting({ page: 'look', title: 'Assistant & shortcuts' })).toBe(true)
    expect(hiddenSetting({ page: 'look', title: 'App icon' })).toBe(true)
    expect(hiddenSetting({ page: 'zepp', title: 'Zepp OS watch', isPage: true })).toBe(true)
  })

  it('without the hook, upstream’s rows are all there', () => {
    hooks.settings = null
    render('workout')
    expect(titles()).toContain('Layout')
  })

  // An upstream rename would bring a hidden row back without a word: each title must still be
  // upstream's. Rows upstream draws only on a phone are looked for in its source instead.
  it('every hidden row is still one of upstream’s, by its title', () => {
    hooks.settings = null
    const PHONE_ONLY = {
      look: ['Set up an NFC sticker', 'App icon', 'Assistant & shortcuts', 'Siri & Shortcuts'],
      reminders: ['Gym reminder'],
      workout: ['End by itself when I leave the gym'],
      modules: ['Community'],   // only with a server that has the library on
      about: ['Rate openGym on the App Store', 'Rate openGym on Google Play'],
    }
    // happy-dom's URL only takes http(s), so the files are found by path.
    const src = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const upstream = ['views/Settings.jsx', 'views/settings-pages.js', 'components/AppIconRow.jsx', 'components/VoiceShortcuts.jsx', 'components/ForgottenRows.jsx']
      .map(f => readFileSync(resolve(src, f), 'utf8')).join('\n')
    const missing = {}
    for (const [page, rows] of Object.entries(HIDDEN_ROWS)) {
      // A gym set up, so the equipment page draws its gym rows.
      render(page, { equipProfiles: [{ id: 'g1', name: 'Home', equipment: [] }] })
      const shown = titles()
      act(() => root.unmount()); container.remove()
      const gone = rows.filter(k => !(PHONE_ONLY[page]?.includes(k) ? upstream.includes(`'${k}'`) : shown.includes(k)))
      if (gone.length) missing[page] = gone
    }
    expect(missing).toEqual({})
  })
})
