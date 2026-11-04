// @vitest-environment happy-dom
// Exercise details through seam S10: upstream's exerciseDetailSheet opens the
// fork's Summary · History · How to sheet, built from upstream's read-back of the log.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { installExerciseDetails } from './ExerciseDetails.jsx'
import { aliasHooks } from '../lib/ex-aliases.js'
import { capWords } from '../../lib/format.js'
import { useStatsPhase } from '../lib/shared-phase-run.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell bench press/i.test(e.n) && modeOf({ id: e.id }) === 'reps')
const day = d => new Date(d + 'T18:00:00').getTime()
let root, container

function open(workouts) {
  const S = clone(DEF)
  S.workouts = workouts
  useStore.setState({ S, user: null })
  exerciseDetailSheet(EX)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const sheet = useUI.getState().sheets.at(-1)
  act(() => root.render(sheet.render(() => {})))
}
const tab = label => act(() => [...container.querySelectorAll('.hv-xd-tabs button')].find(b => b.textContent === label).click())

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installExerciseDetails() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.exerciseDetail = null
})

describe('hevier: exercise details (seam S10)', () => {
  const log = [
    { id: 'a', d: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), name: 'Push Day', start: day('2026-09-26'), end: day('2026-09-26') + 3600000,
      entries: [{ id: EX.id, sets: [{ w: 60, r: 8, done: true }, { w: 62.5, r: 6, done: true }] }] },
  ]

  it('opens the fork’s sheet with records and set records', () => {
    open(log)
    expect(container.querySelector('.hv-xd')).toBeTruthy()
    expect(container.querySelector('.hv-xd-big').textContent).toContain('62.5')
    expect(container.textContent).toContain('Personal Records')
    expect(container.textContent).toContain('Best Set Volume')
    const rows = [...container.querySelectorAll('.hv-xd-rr')].map(r => r.firstChild.textContent)
    expect(rows).toEqual(['6', '8'])
  })

  it('History lists each session under its workout’s name', () => {
    open(log)
    tab('History')
    const card = container.querySelector('.hv-xd-sess')
    expect(card.textContent).toContain('Push Day')
    expect(card.querySelectorAll('.hv-xd-set')).toHaveLength(2)
  })

  it('How to offers upstream’s YouTube search, and plays a video linked in the pinned note (D101)', () => {
    const vid = 'https://youtu.be/dQw4w9WgXcQ'
    open([{ ...clone(log[0]), entries: [{ ...clone(log[0].entries[0]), note: 'Form: ' + vid, notePin: true }] }])
    tab('How to')
    expect([...container.querySelectorAll('button')].some(b => b.textContent.includes('Watch on YouTube'))).toBe(true)
    expect(container.querySelector('.youtube-video')).toBeTruthy()
  })

  it('How to shows the steps, and an empty log says so', () => {
    open([])
    expect(container.textContent).toContain('No sessions logged yet')
    tab('How to')
    expect(container.querySelector('.hv-xd-howto')).toBeTruthy()
  })

  it('Strength level: Compare strength folds the fields open, Save places the Best 1RM (D19)', () => {
    open(log)
    const sl = () => container.querySelector('.hv-sl')
    expect(sl().querySelector('input')).toBeNull()
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Compare strength').click())
    expect([...sl().querySelectorAll('button')].some(b => b.textContent === 'Look up on strengthlevel.com')).toBe(true)
    const set = (input, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const inputs = [...sl().querySelectorAll('input')]
    expect(inputs).toHaveLength(5)
    act(() => ['40', '55', '70', '90', '110'].forEach((v, i) => set(inputs[i], v)))
    act(() => sl().querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvStrength[EX.id]).toMatchObject({ lv: [40, 55, 70, 90, 110], u: 'kg' })
    expect(sl().querySelector('form')).toBeNull()
    const best = Number(container.textContent.match(/Best 1RM ([\d.]+)/)[1])
    expect(best).toBeGreaterThan(70); expect(best).toBeLessThan(90)
    expect(sl().querySelector('.hv-sl-head').textContent).toMatch(/^Intermediate · [\d.]+ kg to Advanced$/)
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Edit').click())
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Remove levels').click())
    expect(useStore.getState().S.hvStrength?.[EX.id]).toBeUndefined()
  })

  it('other names: the switched-on one is the title, the rest and the own name are “Also called” (D73)', () => {
    Object.assign(hooks, aliasHooks(() => useStore.getState().S))
    try {
      open(log)
      act(() => useStore.getState().update(s => { s.exAliases = { [EX.id]: ['Flat bench', 'Bench'] }; s.hvShownName = { [EX.id]: 'Bench' } }))
      expect(container.querySelector('.hv-xd-bar h3').textContent).toBe('Bench')
      expect(container.querySelector('.hv-xd-aka').textContent).toBe('Also called ' + capWords(EX.n) + ' · Flat bench')
      act(() => container.querySelector('.hv-xd-aka').click())
      const host = document.createElement('div')
      const r2 = createRoot(host)
      act(() => r2.render(useUI.getState().sheets.at(-1).render(() => {})))
      const sw = host.querySelector('[aria-label="Show “Bench” as its name"]')
      expect(sw.getAttribute('aria-checked')).toBe('true')
      act(() => sw.click())
      expect(container.querySelector('.hv-xd-bar h3').textContent).toBe(EX.n)
      expect(container.querySelector('.hv-xd-aka').textContent).toBe('Also called Flat bench · Bench')
      act(() => r2.unmount())
    } finally { hooks.exName = null }
  })

  it('without the hook it is upstream’s sheet', () => {
    hooks.exerciseDetail = null
    open(log)
    expect(container.querySelector('.hv-xd')).toBeNull()
    expect(container.querySelector('.exdetail-name')).toBeTruthy()
  })
})

describe('hevier: an exercise\'s History by phase and brand (D93, D96)', () => {
  const when = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
  const session = (id, n, brand, w, extra = {}) => ({ id, d: when(n), name: id, start: Date.now() - n * 86400000, end: Date.now() - n * 86400000 + 3600000,
    entries: [{ id: EX.id, hvBrand: brand, sets: [{ w, r: 8, done: true }] }], ...extra })
  const log = [
    session('s1', 3, 'Technogym', 50, { hvPhase: { p: 'cutting' } }),
    session('s2', 5, 'Hammer', 70, { hvPhase: { p: 'bulking' } }),
    session('s3', 7, 'Technogym', 60, { hvPhase: { p: 'bulking' } }),
  ]
  const shown = el => [...el.querySelectorAll('.hv-xd-st')].map(n => n.firstChild.textContent.trim())
  const compare = () => act(() => [...container.querySelectorAll('.hv-xd-labels button')].find(b => b.textContent === 'Compare').click())
  const chip = label => act(() => [...container.querySelectorAll('.hv-phase-filter .hv-chip')].find(b => b.textContent === label).click())
  afterEach(() => act(() => useStatsPhase.getState().pick(null)))

  it('narrows the History to the phase', () => {
    open(log); tab('History')
    expect(shown(container)).toEqual(['s1', 's2', 's3'])
    chip('Bulking')
    expect(shown(container)).toEqual(['s2', 's3'])
  })
  it('lists two brands side by side, each with its own sessions', () => {
    open(log); tab('History'); compare()
    const cols = [...container.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols.map(shown)).toEqual([['s1', 's3'], ['s2']])
    expect(cols.map(c => c.querySelector('select').value)).toEqual(['k:Technogym', 'k:Hammer'])
    chip('Cutting')
    expect([...container.querySelectorAll('.hv-xd-cmpcol')].map(shown)).toEqual([['s1'], []])
  })
  it('compares a brand with the sessions that have no brand', () => {
    const noBrand = { ...session('s4', 9, undefined, 40) }
    open([session('s1', 3, 'Technogym', 50), noBrand]); tab('History'); compare()
    const cols = () => [...container.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols().map(shown)).toEqual([['s1'], ['s4']])
    expect([...cols()[1].querySelectorAll('option')].map(o => o.textContent)).toEqual(['No brand'])
  })
  it('lets a column pick No brand among other brands', () => {
    open([...log, session('s4', 9, undefined, 40)]); tab('History'); compare()
    const cols = () => [...container.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols().map(shown)).toEqual([['s1', 's3'], ['s2']])
    const select = cols()[1].querySelector('select')
    expect([...select.querySelectorAll('option')].map(o => o.textContent)).toEqual(['Hammer', 'No brand'])
    act(() => {
      Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set.call(select, 'k:')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(cols().map(shown)).toEqual([['s1', 's3'], ['s4']])
    expect(cols()[1].querySelector('select').value).toBe('k:')
  })
  it('does not offer Compare with one brand, nor on the Summary', () => {
    open(log.filter(w => w.id !== 's2')); tab('History')
    expect(container.querySelector('.hv-xd-labels')).toBeNull()
    act(() => root.unmount()); container.remove()
    open(log)
    expect(container.querySelector('.hv-xd-labels button')).toBeNull()
  })
})
