// @vitest-environment happy-dom
// The Routines page (the Workout tab until D126) (hevier/DECISIONS.md D13, D130): folders, Move to folder, drag handles, rows.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useParams, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, fmtDate, isoOf } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const R = (id, folder) => ({ id, name: 'R ' + id, emoji: 'dumbbell', ex: [{ id: EX, sets: 3, reps: 8, weight: 0 }], ...(folder ? { folder } : {}) })
let root, container

function render(routines, extra = {}, at = '/routines') {
  const S = Object.assign(clone(DEF), { weighIn: false, routines }, extra)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes>{hevierRoutes}</Routes></MemoryRouter>))
}
const ids = () => useStore.getState().S.routines.map(r => r.id)
const heads = () => [...container.querySelectorAll('.hv-ftoggle')].map(b => b.textContent)
// Renders the top sheet with its own act, so call it outside another act.
const sheet = () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  act(() => createRoot(host).render(useUI.getState().sheets.at(-1).render(() => {})))
  return host
}
const item = (host, text) => [...host.querySelectorAll('.menu-item')].find(m => m.textContent.includes(text))
const key = (el, k) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})

describe('hevier: routine folders and reordering', () => {
  it('shows My Routines, then each folder in the order of its first routine', () => {
    render([R('a'), R('p1', 'Push'), R('l1', 'Legs'), R('p2', 'Push')])
    expect(heads()).toEqual(['My Routines (1)', 'Push (2)', 'Legs (1)'])
  })

  it('⋯ → Move to folder puts a routine in a folder, on the routine itself', () => {
    render([R('a'), R('b'), R('p1', 'Push')])
    act(() => container.querySelector('.hv-rrow [aria-label^="More"]').click())
    const menu = sheet()
    act(() => item(menu, 'Move to folder').click())
    const folders = sheet()
    act(() => item(folders, 'Push').click())
    expect(useStore.getState().S.routines.find(r => r.id === 'a').folder).toBe('Push')
    expect(heads()).toEqual(['My Routines (1)', 'Push (2)'])
  })

  it('a new folder is kept in S until a routine goes into it', () => {
    render([R('a')])
    act(() => [...container.querySelectorAll('.hv-rend button')].find(b => b.textContent === '+ Folder').click())
    const host = sheet()
    const input = host.querySelector('input')
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Arms')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvFolders).toEqual(['Arms'])
    expect(heads()).toEqual(['My Routines (1)', 'Arms (0)'])
    expect(useStore.getState().S.routines[0]).not.toHaveProperty('folder')
  })

  it('a routine’s handle reorders it inside its folder', () => {
    render([R('p1', 'Push'), R('a'), R('p2', 'Push')])
    const pushGrips = container.querySelectorAll('.hv-folders .hv-rrow .hv-grip')
    key(pushGrips[0], 'ArrowDown')
    expect(ids()).toEqual(['p2', 'a', 'p1'])
  })

  it('a folder’s handle moves the folder and its routines as a block', () => {
    render([R('p1', 'Push'), R('l1', 'Legs'), R('p2', 'Push')])
    key(container.querySelector('.hv-fhead .hv-grip'), 'ArrowDown')
    expect(heads()).toEqual(['My Routines (0)', 'Legs (1)', 'Push (2)'])
    expect(ids()).toEqual(['l1', 'p1', 'p2'])
  })

  it('folds a folder shut and remembers it in S', () => {
    render([R('p1', 'Push')])
    act(() => [...container.querySelectorAll('.hv-ftoggle')][1].click())
    expect(container.querySelectorAll('.hv-rrow').length).toBe(0)
    expect(useStore.getState().S.hvFoldersClosed).toEqual(['Push'])
  })

  it('deleting a folder keeps its routines', () => {
    render([R('p1', 'Push')])
    act(() => container.querySelector('.hv-folders .hv-fhead .iconbtn').click())
    const menu = sheet()
    act(() => item(menu, 'Delete Folder').click())
    expect(useStore.getState().S.routines[0]).not.toHaveProperty('folder')
    expect(ids()).toEqual(['p1'])
  })

  it('deleting a folder offers an Undo that puts back its routines, its place and its fold', () => {
    render([R('a'), R('p1', 'Push'), R('l1', 'Legs'), R('p2', 'Push')], { hvFoldersClosed: ['Push'] })
    act(() => container.querySelector('.hv-folders .hv-fhead .iconbtn').click())
    const menu = sheet()
    act(() => item(menu, 'Delete Folder').click())
    expect(heads()).toEqual(['My Routines (3)', 'Legs (1)'])
    expect(useUI.getState().toastMsg).toBe('“Push” gone.')
    act(() => useUI.getState().runToastAction())
    expect(heads()).toEqual(['My Routines (1)', 'Push (2)', 'Legs (1)'])
    expect(useStore.getState().S.hvFoldersClosed).toEqual(['Push'])
  })
})

function Page() { return <div id="page">{useParams().page}</div> }

describe('hevier: the empty Routines page', () => {
  it('points to the Hevy import on Settings → Integrations', () => {
    render([])
    act(() => root.render(<MemoryRouter initialEntries={['/routines']}><Routes>{hevierRoutes}
      <Route path="/settings/:page" element={<Page />} /></Routes></MemoryRouter>))
    const link = [...container.querySelectorAll('button')].find(b => b.textContent === 'Import from Hevy')
    act(() => link.click())
    expect(container.querySelector('#page').textContent).toBe('integrations')
  })
})

describe('hevier: starting with a workout open (D13)', () => {
  const open = { id: 'open', d: '2026-10-18', start: Date.now() - 60000, name: 'Open one', routineIds: [], entries: [], cur: 0 }
  const startRoutine = () => container.querySelector('[aria-label="Start, R a"]')

  it('starts at once when no workout is open', () => {
    render([R('a')])
    act(() => startRoutine().click())
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(useStore.getState().S.active.routineIds).toEqual(['a'])
  })

  it('asks first, and Cancel keeps the open workout', () => {
    render([R('a')], { active: clone(open) }, '/routines')
    act(() => startRoutine().click())
    const host = sheet()
    expect(host.textContent).toContain('Starting a new workout discards the one you have open.')
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Cancel').click())
    expect(useStore.getState().S.active.id).toBe('open')
  })

  it('Discard and start replaces the open workout with the routine', () => {
    render([R('a')], { active: clone(open) }, '/routines')
    act(() => startRoutine().click())
    const host = sheet()
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Discard and start').click())
    const A = useStore.getState().S.active
    expect(A.id).not.toBe('open')
    expect(A.routineIds).toEqual(['a'])
  })
})

function Where() { return <div id="where">{useLocation().pathname}</div> }
const iso = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

describe('hevier: the routines list’s rows (D130)', () => {
  const at = path => {
    act(() => root.render(<MemoryRouter initialEntries={['/routines']}><Routes>{hevierRoutes}
      <Route path="*" element={null} /></Routes><Where /></MemoryRouter>))
    return path
  }
  const rowOf = id => [...container.querySelectorAll('.hv-rrow')].find(r => r.querySelector(`[aria-label="Start, R ${id}"]`))

  it('the next routine is marked with its day and an accent Start; another reads its day or when it was last done', () => {
    render([R('a'), R('b'), R('c')], { dayPlan: { [iso(1)]: 'a', [iso(3)]: 'b' },
      workouts: [{ id: 'w1', d: iso(-9), start: 1, routineIds: ['c'], routineId: 'c', entries: [] }] })
    expect(rowOf('a').textContent).toContain('Next · ' + fmtDate(iso(1), true) + ' · 1 exercise')
    expect(rowOf('a').querySelector('.hv-rstart').classList.contains('primary')).toBe(true)
    expect(rowOf('b').textContent).toContain(fmtDate(iso(3), true))
    expect(rowOf('b').textContent).not.toContain('Next')
    expect(rowOf('b').querySelector('.hv-rstart').classList.contains('primary')).toBe(false)
    expect(rowOf('c').textContent).toContain('last done ' + fmtDate(iso(-9), false, iso(-9).slice(0, 4) !== todayISO().slice(0, 4)))
  })

  it('a tap on a row opens the next session’s page', () => {
    render([R('a')])
    at()
    act(() => container.querySelector('.hv-rrow .hv-rname').click())
    expect(container.querySelector('#where').textContent).toBe('/plan/r/a/view')
  })

  it('a long press opens the row’s menu, and the click it ends with does not open the row', () => {
    vi.useFakeTimers()
    try {
      render([R('a')])
      at()
      const name = container.querySelector('.hv-rrow .hv-rname')
      act(() => name.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 })))
      act(() => vi.advanceTimersByTime(500))
      expect(useUI.getState().sheets).toHaveLength(1)
      act(() => name.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })))
      act(() => name.click())
      expect(container.querySelector('#where').textContent).toBe('/routines')
    } finally { vi.useRealTimers() }
    const menu = sheet()
    expect(['Move to folder', 'Duplicate', 'Delete routine'].every(x => item(menu, x))).toBe(true)
  })

  it('+ Routine, + Folder, Rotation, Empty workout and Explore sit at the end; Rotation opens the plan', () => {
    render([R('a')])
    at()
    expect([...container.querySelectorAll('.hv-rend button')].map(b => b.textContent))
      .toEqual(['+ Routine', '+ Folder', 'Rotation', 'Empty workout', 'Explore'])
    act(() => [...container.querySelectorAll('.hv-rend button')].find(b => b.textContent === 'Rotation').click())
    expect(container.querySelector('#where').textContent).toBe('/plan')
  })

  it('Empty workout starts a session with nothing in it', () => {
    render([R('a')])
    act(() => [...container.querySelectorAll('.hv-rend button')].find(b => b.textContent === 'Empty workout').click())
    expect(useStore.getState().S.active.entries).toEqual([])
  })
})
