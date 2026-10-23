// @vitest-environment happy-dom
// Settings through seams S11 and S12 (hevier/DECISIONS.md D16): Hevy's titled root over upstream's
// pages, and upstream's pages without the rows that only steer upstream's workout layouts.
import React, { act } from 'react'
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
    expect(rows.indexOf('Previous values')).toBeLessThan(rows.indexOf('Volume'))
    expect(rows).not.toContain('Muscle sets')   // in the Volume row's sheet (review S4)
    expect(rows.indexOf('Volume')).toBeLessThan(rows.indexOf('Units & language'))
    expect(rows.indexOf('Data & backup')).toBeGreaterThan(rows.indexOf('Look & Home'))
    expect(container.querySelector('.sp-acct')).toBeTruthy()
    expect(container.textContent).not.toContain('Cards')
    expect(container.querySelector('.sp-back').textContent).toBe('Profile')
  })

  it('leaves the layout rows out of Workout and Fine-tuning, keeping the rest', () => {
    render('workout')
    const rows = titles()
    for (const k of HIDDEN_ROWS.workout) expect(rows).not.toContain(k)
    expect(rows).toContain('Rest timer')
    expect(rows).toContain('Effort per set')
    expect(rows).toContain('Weigh in before workouts')
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
    expect(rows.indexOf('Plates to load')).toBe(rows.indexOf('Effort per set') + 1)
    const sw = [...container.querySelectorAll('.lrow')].find(r => r.textContent.includes('Plates to load')).querySelector('[role="switch"], input[type="checkbox"], button')
    expect(useStore.getState().S.hvPlateLine).toBeUndefined()
    act(() => sw.click())
    expect(useStore.getState().S.hvPlateLine).toBe(true)
  })

  it('offers no theme, accent or gym check-in, keeping the rest of Look & Home (D17, D12)', () => {
    render('look')
    const rows = titles()
    expect(rows).not.toContain('Theme')
    expect(rows).not.toContain('Accent color')
    expect(rows).toContain('Body diagram')
    expect(rows).not.toContain('Gym check-in')
    expect(rows).toContain('Body weight')
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
    expect(rows).not.toContain('Active profile')
    expect(rows).toEqual(expect.arrayContaining(['Plates', 'Dumbbells', 'City Gym', 'Add gym']))
    expect(container.textContent).toContain('Each gym’s equipment')
    expect(hiddenSetting({ page: 'equipment', title: 'Active profile' })).toBe(true)
  })

  it('a search never offers a row the page leaves out', () => {
    expect(hiddenSetting({ page: 'workout', title: 'Layout' })).toBe(true)
    expect(hiddenSetting({ page: 'workout', title: 'Rest timer' })).toBe(false)
    expect(hiddenSetting({ page: 'workout', title: 'Workout', isPage: true })).toBe(false)
  })

  it('without the hook, upstream’s rows are all there', () => {
    hooks.settings = null
    render('workout')
    expect(titles()).toContain('Layout')
  })
})
