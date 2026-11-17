// @vitest-environment happy-dom
// The Finish sheet over the live workout (D132): Finish opens it with no route change, Save stores
// the workout through upstream's finish and lands on Today with a "Workout saved" message.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from '../../views/Workout.jsx'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { buildCombinedEntries } from '../../lib/session-merge.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { setNav, nav } from '../../lib/nav.js'
import { hooks } from '../hooks.js'
import { installFinishHook } from './FinishSheet.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const id = re => EXDB.find(e => re.test(e.n)).id
const BENCH = id(/^barbell bench press$/i)
const ROW = id(/^barbell bent over row$/i)
const CURL = id(/^lever lying leg curl$/i)
let root, container, host, sheetRoot, path

function Bridge() { setNav(useNavigate()); path = useLocation().pathname; return null }

function render(patch = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false,
    routines: [{ id: 'r1', name: 'Upper A', ex: [{ id: BENCH, sets: 2, reps: 5, weight: 60 }, { id: ROW, sets: 1, reps: 8, weight: 50 }] }] }, patch)
  const start = Date.now() - 45 * 60000
  const d = new Date(start)
  S.active = { id: 'a1', d: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    start, name: 'Upper A', cur: 0, routineIds: ['r1'], entries: buildCombinedEntries(S, ['r1']).entries }
  S.active.entries[0].sets.forEach(s => { s.done = true; s.at = Date.now() - 60000 })
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/workout']}>
    <Routes><Route path="/workout" element={<Workout />} /><Route path="/home" element={<div id="home" />} /></Routes><Bridge />
  </MemoryRouter>))
}
// Finish, and the sheet it opens rendered on its own (as Gyms.test.jsx does).
function finish() {
  act(() => container.querySelector('.hv-finish').click())
  return top()
}
function top() {
  if (sheetRoot) act(() => sheetRoot.unmount())
  host?.remove()
  host = document.createElement('div')
  document.body.appendChild(host)
  sheetRoot = createRoot(host)
  const t = useUI.getState().sheets.at(-1)
  act(() => sheetRoot.render(<MemoryRouter>{t.render(() => useUI.setState({ sheets: useUI.getState().sheets.filter(x => x !== t) }))}</MemoryRouter>))
  return host
}
const S = () => useStore.getState().S
const byText = (el, sel, text) => [...el.querySelectorAll(sel)].find(b => b.textContent.includes(text))

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', toastAction: null, timer: null, work: null })
  installFinishHook(nav)
})
afterEach(() => {
  if (sheetRoot) act(() => sheetRoot.unmount())
  host?.remove(); host = sheetRoot = null
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.finish = hooks.done = hooks.workoutDetail = null
})

describe('hevier Finish sheet (D132)', () => {
  it('opens over the workout with its name, sets and what is left unticked', () => {
    render()
    const el = finish()
    expect(path).toBe('/workout')
    expect(el.querySelector('h3').textContent).toBe('Finish Upper A?')
    expect(el.textContent).toContain('2 sets')
    expect(el.querySelector('.hv-fin-warn').textContent).toBe('1 set not ticked. Only ticked sets count, and an exercise with none is left out.')
    expect(el.querySelector('.hv-fin-warn b').textContent).toBe('1 set not ticked.')
    expect(el.querySelector('.hv-fin-chk')).toBeNull()   // the workout matches its routine
    expect(el.querySelector('.hv-fin-fields')).toBeNull()
  })

  it('Save stores the workout and lands on Today, whose message opens it', () => {
    render()
    hooks.workoutDetail = vi.fn()
    const el = finish()
    act(() => el.querySelector('.hv-fin-save').click())
    expect(S().active).toBeNull()
    expect(S().workouts).toHaveLength(1)
    expect(S().workouts[0].entries.map(e => e.id)).toEqual([BENCH])   // an exercise with nothing ticked goes, as in upstream's finish
    expect(path).toBe('/home')
    expect(useUI.getState().toastMsg).toBe('Workout saved')
    act(() => useUI.getState().toastAction.run())
    expect(hooks.workoutDetail).toHaveBeenCalledWith(expect.objectContaining({ id: S().workouts[0].id }))
  })

  it('what the warning says is what Save does: an unticked set stays as not done and counts for nothing', () => {
    render()
    act(() => useStore.getState().update(s => { s.active.entries[0].sets[1].done = false }))
    const el = finish()
    expect(el.querySelector('.hv-fin-warn').textContent).toContain('2 sets not ticked.')
    act(() => el.querySelector('.hv-fin-save').click())
    const [bench] = S().workouts[0].entries
    expect(S().workouts[0].entries.map(e => e.id)).toEqual([BENCH])
    expect(bench.sets.map(x => !!x.done)).toEqual([true, false])
    expect(S().workouts[0].vol).toBe(60 * 5)
  })

  it('a duration changed on the sheet is the saved workout’s', () => {
    render()
    const el = finish()
    act(() => el.querySelector('.hv-fin-durbtn').click())
    const [h, m] = el.querySelectorAll('.hv-fin-min')
    expect(h.value).toBe('0')
    expect(m.value).toBe('45')
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(m, '30')
      m.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => el.querySelector('.hv-fin-save').click())
    const w = S().workouts[0]
    expect(Math.round((w.end - w.start) / 60000)).toBe(30)
  })

  it('a workout that changed its routine offers to update it, unticked; ticked, Save updates it', () => {
    render()
    act(() => useStore.getState().update(s => {
      s.active.entries.push({ id: CURL, ...buildPlannedEntry(s, { id: CURL, sets: 1, reps: 10, weight: 30 }, s.routines[0]), rid: 'r1' })
      s.active.entries.at(-1).sets.forEach(x => { x.done = true })
    }))
    let el = finish()
    const box = el.querySelector('.hv-fin-chk')
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(box.textContent).toContain('Update the routine too')
    expect(box.textContent).toContain('1 added')
    act(() => box.click())
    expect(box.getAttribute('aria-checked')).toBe('true')
    act(() => el.querySelector('.hv-fin-save').click())
    expect(S().routines[0].ex.map(x => x.id)).toEqual([BENCH, ROW, CURL])
  })

  it('left unticked, the routine stays as it was', () => {
    render()
    act(() => useStore.getState().update(s => {
      s.active.entries.push({ id: CURL, ...buildPlannedEntry(s, { id: CURL, sets: 1, reps: 10, weight: 30 }, s.routines[0]), rid: 'r1' })
    }))
    const el = finish()
    act(() => el.querySelector('.hv-fin-save').click())
    expect(S().routines[0].ex.map(x => x.id)).toEqual([BENCH, ROW])
  })

  it('Title, gym, note opens the old Save page’s fields, kept on the session as typed', () => {
    render()
    const el = finish()
    act(() => el.querySelector('.hv-fin-more').click())
    const title = el.querySelector('.hv-fin-title')
    expect(title.value).toBe('Upper A')
    expect(el.querySelector('.hv-fin-gym')).toBeTruthy()
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(title, 'Push day')
      title.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(S().active).toMatchObject({ name: 'Push day', customName: true })
    act(() => el.querySelector('.hv-fin-save').click())
    expect(S().workouts[0].name).toBe('Push day')
  })

  it('Discard asks first, then drops the session and goes to Today', () => {
    render()
    const el = finish()
    act(() => el.querySelector('.hv-fin-discard').click())
    const confirm = top()
    expect(confirm.textContent).toContain('Discard workout?')
    act(() => byText(confirm, 'button', 'Discard').click())
    expect(S().active).toBeNull()
    expect(S().workouts).toHaveLength(0)
    expect(path).toBe('/home')
  })

  it('nothing ticked says so', () => {
    render()
    act(() => useStore.getState().update(s => { s.active.entries[0].sets.forEach(x => { x.done = false }) }))
    expect(finish().querySelector('.hv-fin-warn').textContent).toBe('You haven’t checked off any sets. Finish the workout anyway?')
  })
})
