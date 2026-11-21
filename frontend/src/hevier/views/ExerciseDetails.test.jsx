// @vitest-environment happy-dom
// Exercise details through seam S10: upstream's exerciseDetailSheet opens the fork's one page
// (D131), built from upstream's read-back of the log; All history, brand compare, strength level
// and How to open as sheets on top.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { withExUnit } from '../../lib/ex-unit.js'
import { useUI } from '../../store/useUI.js'
import { bindUI } from '../../components/ui.jsx'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { installExerciseDetails } from './ExerciseDetails.jsx'
import { capWords } from '../../lib/format.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useStatsPhase } from '../lib/shared-phase-run.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell bench press/i.test(e.n) && modeOf({ id: e.id }) === 'reps')
const day = d => new Date(d + 'T18:00:00').getTime()
let root, container

function open(workouts, edit) {
  const S = clone(DEF)
  S.workouts = workouts
  edit?.(S)
  useStore.setState({ S, user: null })
  exerciseDetailSheet(EX)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const sheet = useUI.getState().sheets.at(-1)
  act(() => root.render(sheet.render(() => {})))
}
bindUI(useUI)   // the app binds it at boot; the menu buttons' picker sheet needs it
// Picks `label` in the sheet a menu button opens (upstream's picker), and returns the labels offered.
function pickMenu(btn, label) {
  act(() => btn.click())
  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  const top = useUI.getState().sheets.at(-1)
  act(() => r.render(top.render(() => useUI.setState({ sheets: useUI.getState().sheets.filter(x => x !== top) }))))
  const offered = [...host.querySelectorAll('button.lrow .lrow-t')].map(x => x.textContent)
  if (label) act(() => [...host.querySelectorAll('button.lrow')].find(b => b.querySelector('.lrow-t').textContent === label).click())
  act(() => r.unmount()); host.remove()
  return offered
}
// Opens a row or link of the page and renders the sheet it opens; `subs` are unmounted after each test.
let subs = []
function sub(label) {
  const btn = [...container.querySelectorAll('.hv-xd-page button')].find(b => b.textContent.startsWith(label))
  act(() => btn.click())
  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
  subs.push([r, host])
  return host
}

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installExerciseDetails() })
afterEach(() => {
  for (const [r, host] of subs) { act(() => r.unmount()); host.remove() }
  subs = []
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.exerciseDetail = null
})

describe('hevier: exercise details (seam S10)', () => {
  const log = [
    { id: 'a', d: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), name: 'Push Day', start: day('2026-09-26'), end: day('2026-09-26') + 3600000,
      entries: [{ id: EX.id, sets: [{ w: 60, r: 8, done: true }, { w: 62.5, r: 6, done: true }] }] },
  ]

  it('opens one page: the last sessions, the best sets and the best at each rep count (D131)', () => {
    open(log)
    expect(container.querySelector('.hv-xd')).toBeTruthy()
    expect(container.querySelector('.hv-xd-tabs')).toBeNull()
    const lines = [...container.querySelectorAll('.hv-xd-ls')]
    expect(lines).toHaveLength(1)
    // The only session holds every best: its sets carry the star, read out, and the line says best.
    expect(lines[0].querySelector('.hv-xd-lsets').textContent).toBe('★ Best 1RM, Best set: 60 kg × 8 · ★ Heaviest: 62.5 kg × 6')
    // Each set is one unit the line wraps around, the separators between them.
    expect([...lines[0].querySelectorAll('.hv-xd-lset')].map(x => x.textContent)).toEqual(['★ Best 1RM, Best set: 60 kg × 8', '★ Heaviest: 62.5 kg × 6'])
    expect(lines[0].querySelector('.hv-xd-best').textContent).toBe('Heaviest')
    const tiles = [...container.querySelectorAll('.hv-xd-tile b')].map(b => b.textContent)
    expect(tiles[0]).toBe('62.5 kg')
    expect(tiles[2]).toBe('60 kg × 8')
    expect([...container.querySelectorAll('.hv-xd-tile')][2].querySelectorAll('.hv-xd-whole')).toHaveLength(2)
    expect(container.textContent).toContain('Best Session Volume')
    const rows = [...container.querySelectorAll('.hv-xd-rr')]
    expect(rows.map(r => r.firstChild.textContent)).toEqual(['6 reps', '8 reps'])
    // Twenty days ago is within the last month: new, in words.
    expect(rows.map(r => r.querySelector('.hv-xd-new')?.textContent)).toEqual(['new', 'new'])
    // The chart comes before the long list of rep counts (the critique, 2026-11-21).
    const heads = [...container.querySelectorAll('.hv-xd-page h4.sec')].map(h => h.textContent)
    expect(heads).not.toContain('Heaviest Weight')
    // Under three sessions there is no curve, and a line would repeat the Heaviest tile: no chart section (the critiques, 2026-11-21).
    expect(container.querySelector('.hv-xd-chart')).toBeNull()
    expect(container.querySelector('.hv-xd-range')).toBeNull()
    expect(container.querySelector('.hv-xd-few')).toBeNull()
    const rowTitles = [...container.querySelectorAll('.hv-linkrow b')].map(b => b.textContent)
    expect(rowTitles).toEqual(['How to'])
    expect(container.querySelector('.hv-xd-more .hv-sl')).toBeTruthy()   // the strength level, in place
  })

  it('an exercise pinned to lb reads in lb: the sessions, the bests, the rep counts and All history (D41)', () => {
    open([{ ...log[0], entries: [{ id: EX.id, sets: [{ w: 50, r: 12, done: true }] }] }], S => { S.exUnit = withExUnit(S.exUnit, EX.id, 'lb'); S.hvStrength = { [EX.id]: { lv: [40, 60, 80, 100, 120], u: 'kg' } } })
    expect(container.querySelector('.hv-xd-lsets').textContent).toMatch(/110\.23? lb × 12/)
    const tiles = [...container.querySelectorAll('.hv-xd-tile b')].map(b => b.textContent)
    expect(tiles[0]).toMatch(/^110\.23? lb$/)
    expect(tiles[2]).toMatch(/^110\.23? lb × 12$/)
    expect(tiles[1]).toMatch(/^1[45]\d(\.\d+)? lb$/)   // 50 kg × 12 is about 70 kg of 1RM, 154 lb
    expect(container.querySelector('.hv-xd-svol').textContent).toMatch(/1,32[23](\.\d+)? lb/)   // 600 kg
    expect(container.querySelector('.hv-xd-rr b').textContent).toMatch(/^110\.23? lb$/)
    // The strength level too: the kg levels and the best 1RM in lb, beside the tile above it.
    expect(container.querySelector('.hv-sl-foot').textContent).toMatch(/Best 1RM 1[45]\d(\.\d+)? lb/)
    expect(container.querySelector('.hv-sl-ticks').textContent).toMatch(/^88132\.5/)
    const all = sub('All history')
    expect(all.querySelector('.hv-xd-set').textContent).toMatch(/110\.23? lb × 12/)
  })

  it('draws the chart from three sessions on', () => {
    const at = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
    open([3, 2, 1].map(n => ({ id: 'w' + n, d: at(n * 7), entries: [{ id: EX.id, sets: [{ w: 60 + n, r: 8, done: true }] }] })))
    expect(container.querySelector('.hv-xd-chart')).toBeTruthy()
    // The chart comes before the long list of rep counts (the critique, 2026-11-21).
    const heads = [...container.querySelectorAll('.hv-xd-page h4.sec')].map(h => h.textContent)
    expect(heads.indexOf('Best sets')).toBeLessThan(heads.indexOf('Heaviest Weight'))
    expect(heads.indexOf('Heaviest Weight')).toBeLessThan(heads.indexOf('Best at each rep count'))
  })

  it('a reps-only set on the last sessions reads “8 reps”, not “× 8”', () => {
    const PUSH = EXDB.find(e => /^push-?up$/i.test(e.n) && modeOf({ id: e.id }) === 'reps')
    const S = clone(DEF)
    S.workouts = [{ id: 'p', d: log[0].d, entries: [{ id: PUSH.id, sets: [{ r: 8, done: true }] }] }]
    useStore.setState({ S, user: null })
    exerciseDetailSheet(PUSH)
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
    act(() => root.render(useUI.getState().sheets.at(-1).render(() => {})))
    expect(container.querySelector('.hv-xd-lset').textContent).toMatch(/: 8 reps$/)
  })

  // happy-dom draws no stylesheet: the rule's selector is run against the page (the critique, 2026-11-21).
  it('the clip’s box is dark while it loads, not white', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../hevier.css'), 'utf8')
    expect(css).toMatch(/\.hv-xd-page, \.hv-xd-howto\) > \.exmedia video\.catvid\{background:var\(--surface-2\)\}/)
  })

  it('gives a best 1RM that is the heaviest single the heaviest tile, not a second one', () => {
    open([
      { id: 'a', d: '2026-08-05', entries: [{ id: EX.id, sets: [{ w: 100, r: 1, done: true }] }] },
      { id: 'b', d: '2026-04-06', entries: [{ id: EX.id, sets: [{ w: 60, r: 12, done: true }] }] },
    ])
    const tiles = [...container.querySelectorAll('.hv-xd-tile')].map(x => x.querySelector('small').textContent + ' ' + x.querySelector('b').textContent)
    expect(tiles).toEqual(['Heaviest · Best 1RM 100 kg', 'Best set 60 kg × 12'])
    // one date form on the page: the tiles read as the session lines do, without a weekday
    expect([...container.querySelectorAll('.hv-xd-tile small:last-child')].map(x => x.textContent)).toEqual(['5 Aug', '6 Apr'])
  })

  it('marks each session against the one before, with its effort', () => {
    const when = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
    open([
      { id: 'o', d: when(30), entries: [{ id: EX.id, sets: [{ w: 70, r: 8, done: true }] }] },
      { id: 'p', d: when(20), entries: [{ id: EX.id, sets: [{ w: 60, r: 8, done: true }] }] },
      { id: 'q', d: when(10), entries: [{ id: EX.id, sets: [{ w: 60, r: 9, done: true, rpe: 8 }] }] },
    ])
    const lines = [...container.querySelectorAll('.hv-xd-ls')]
    expect(lines.map(l => l.querySelector('.hv-trend')?.getAttribute('aria-label') ?? l.querySelector('.hv-xd-best')?.textContent))
      .toEqual(['Better than last time', 'Less than last time', 'Heaviest'])
    expect(lines[0].querySelector('small').textContent).toBe(' RPE 8')
  })

  it('compares left and right over the per-side sessions', () => {
    open(log)
    expect(container.querySelector('.hv-xd-sides')).toBeNull()
    act(() => root.unmount())
    container.remove()
    // Epley: left 30 × 6 = 36, right 30 × 9 = 39, right 8 % stronger in each of three sessions.
    const side = (w, r) => ({ w, r, done: true })
    const ws = [3, 2, 1].map(n => { const d = new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
      return { id: 's' + n, d, entries: [{ id: EX.id, sets: [{ w: 30, r: 15, done: true, sides: { L: side(30, 6), R: side(30, 9) } }] }] } })
    open(ws)
    expect(container.querySelector('.hv-xd-sides').textContent).toBe('Right is 8% stronger (last 3 sessions)')
  })

  it('All history lists each session under its workout’s name', () => {
    open(log)
    const card = sub('All history').querySelector('.hv-xd-sess')
    expect(card.textContent).toContain('Push Day')
    expect(card.querySelectorAll('.hv-xd-set')).toHaveLength(2)
  })

  it('All history lists a set made a timed hold, marked H (D89)', () => {
    const held = clone(log)
    held[0].entries[0].sets.splice(1, 0, { w: 60, sec: 30, mode: 'time', done: true })
    open(held)
    const sets = [...sub('All history').querySelectorAll('.hv-xd-sess .hv-xd-set')]
    expect(sets.map(r => r.querySelector('.hv-xd-n').textContent)).toEqual(['1', 'H', '2'])
    expect(sets[1].textContent).toContain('0:30')
    expect(sets[1].querySelector('.hv-xd-h')).toBeTruthy()
  })

  it('All history writes a per-side set as an L row and an R row, each with its own effort (D133)', () => {
    const ps = clone(log)
    ps[0].entries[0].sets = [{ w: 20, r: 19, done: true, rpe: 8, sides: { L: { w: 20, r: 10, done: true, rpe: 8 }, R: { w: 20, r: 9, done: true, rpe: 7 } } }]
    open(ps)
    const sets = [...sub('All history').querySelectorAll('.hv-xd-sess .hv-xd-set')]
    expect(sets.map(r => [r.querySelector('.hv-xd-n').textContent, r.children[1].textContent])).toEqual([['1', 'L20 kg × 10 (RPE 8)'], ['', 'R20 kg × 9 (RPE 7)']])
  })

  it('How to offers upstream’s YouTube search, and plays a video linked in the pinned note (D101)', () => {
    const vid = 'https://youtu.be/dQw4w9WgXcQ'
    open([{ ...clone(log[0]), entries: [{ ...clone(log[0].entries[0]), note: 'Form: ' + vid, notePin: true }] }])
    const how = sub('How to')
    expect([...how.querySelectorAll('button')].some(b => b.textContent.includes('Watch on YouTube'))).toBe(true)
    expect(how.querySelector('.youtube-video')).toBeTruthy()
  })

  it('How to shows the steps, and an empty log says so', () => {
    open([])
    expect(container.textContent).toContain('No sessions logged yet')
    expect(sub('How to').querySelector('.hv-xd-howto')).toBeTruthy()
  })

  it('Strength level, on the page: Compare strength folds the fields open, Save places the Best 1RM (D19)', () => {
    open(log)
    const host = container.querySelector('.hv-xd-more')
    const sl = () => host.querySelector('.hv-sl')
    expect(sl().querySelector('input')).toBeNull()
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Compare strength').click())
    expect([...sl().querySelectorAll('button')].some(b => b.textContent === 'Look up on strengthlevel.com')).toBe(true)
    const set = (input, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const inputs = [...sl().querySelectorAll('input')]
    expect(inputs).toHaveLength(5)
    // A wrong order is said as it shows; a closed form hands focus to what opens it again (the audit leftovers).
    act(() => ['40', '55', '50', '90', '110'].forEach((v, i) => set(inputs[i], v)))
    expect(sl().querySelector('.hv-sl-err').getAttribute('role')).toBe('alert')
    act(() => ['40', '55', '70', '90', '110'].forEach((v, i) => set(inputs[i], v)))
    act(() => sl().querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvStrength[EX.id]).toMatchObject({ lv: [40, 55, 70, 90, 110], u: 'kg' })
    expect(sl().querySelector('form')).toBeNull()
    expect(document.activeElement?.textContent).toBe('Edit')
    const best = Number(host.textContent.match(/Best 1RM ([\d.]+)/)[1])
    expect(best).toBeGreaterThan(70); expect(best).toBeLessThan(90)
    expect(sl().querySelector('.hv-sl-head').textContent).toMatch(/^Intermediate · [\d.]+ kg to Advanced$/)
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Edit').click())
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Remove levels').click())
    expect(useStore.getState().S.hvStrength?.[EX.id]).toBeUndefined()
    expect(document.activeElement?.textContent).toBe('Compare strength')
  })

  it('other names: the switched-on one is the title, the rest and the own name are “Also called” (D73)', () => {
    try {
      open(log)
      act(() => useStore.getState().update(s => { s.exAliases = { [EX.id]: ['Flat bench', 'Bench'] }; s.exShownName = { [EX.id]: 'Bench' } }))
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
    } finally { useStore.getState().update(s => { s.exShownName = {} }) }
  })

  it('Time on this exercise says its time a session, as a line (D88)', () => {
    const timed = clone(log)
    timed[0].entries[0].sets.forEach((s, i) => { s.at = day('2026-09-26') + (i + 1) * 4 * 60000 })
    open(timed)
    const row = container.querySelector('.hv-xd-time')
    expect(row.textContent).toBe('Time on this exercise · 8min a session')
    expect(row.closest('button')).toBeNull()
  })

  it('names the main muscle, the others and the equipment under the picture, on one line', () => {
    open(log)
    const lines = [...container.querySelectorAll('.hv-xd-facts span')].map(s => s.textContent)
    expect(lines).toEqual(['Primary: Chest', 'Secondary: Triceps, Front delts', 'Equipment: barbell'])
  })

  it('without the hook it is upstream’s sheet', () => {
    hooks.exerciseDetail = null
    open(log)
    expect(container.querySelector('.hv-xd')).toBeNull()
    expect(container.querySelector('.exdetail-name')).toBeTruthy()
  })
})

describe('hevier: an exercise\'s history by phase and brand (D93, D96)', () => {
  const when = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
  const session = (id, n, brand, w, extra = {}) => ({ id, d: when(n), name: id, start: Date.now() - n * 86400000, end: Date.now() - n * 86400000 + 3600000,
    entries: [{ id: EX.id, hvBrand: brand, sets: [{ w, r: 8, done: true }] }], ...extra })
  const log = [
    session('s1', 3, 'Technogym', 50, { hvPhase: { p: 'cutting' } }),
    session('s2', 5, 'Hammer', 70, { hvPhase: { p: 'bulking' } }),
    session('s3', 7, 'Technogym', 60, { hvPhase: { p: 'bulking' } }),
  ]
  const shown = el => [...el.querySelectorAll('.hv-xd-st')].map(n => n.firstChild.textContent.trim())
  const lastShown = () => [...container.querySelectorAll('.hv-xd-ls .hv-xd-ld')].length
  const chip = label => act(() => [...container.querySelectorAll('.hv-phase-filter .hv-chip')].find(b => b.textContent === label).click())
  afterEach(() => act(() => useStatsPhase.getState().pick(null)))

  it('narrows the last sessions and All history to the phase', () => {
    open(log)
    const all = sub('All history')
    expect(shown(all)).toEqual(['s1', 's2', 's3'])
    expect(lastShown()).toBe(3)
    chip('Bulking')
    expect(shown(all)).toEqual(['s2', 's3'])
    expect(lastShown()).toBe(2)
  })
  it('narrows the page to the brand picked, and All history with it', () => {
    open(log)
    // Upstream's picker sheet, not a native select (the fresh audit, 2026-11-21).
    expect(container.querySelector('.hv-xd-labels select')).toBeNull()
    pickMenu(container.querySelector('.hv-xd-labels .menu-btn'), 'Technogym (2)')
    expect(lastShown()).toBe(2)
    expect(shown(sub('All history'))).toEqual(['s1', 's3'])
  })
  it('Compare brands lists two brands side by side, each with its own sessions', () => {
    open(log)
    const host = sub('Compare brands')
    const cols = () => [...host.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols().map(shown)).toEqual([['s1', 's3'], ['s2']])
    expect(cols().map(c => c.querySelector('.menu-btn').getAttribute('aria-label'))).toEqual(['Brand: Technogym', 'Brand: Hammer'])
    chip('Cutting')
    expect(cols().map(shown)).toEqual([['s1'], []])
  })
  it('compares a brand with the sessions that have no brand', () => {
    const noBrand = { ...session('s4', 9, undefined, 40) }
    open([session('s1', 3, 'Technogym', 50), noBrand])
    const host = sub('Compare brands')
    const cols = () => [...host.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols().map(shown)).toEqual([['s1'], ['s4']])
    expect(pickMenu(cols()[1].querySelector('.menu-btn'))).toEqual(['No brand'])
  })
  it('lets a column pick No brand among other brands', () => {
    open([...log, session('s4', 9, undefined, 40)])
    const host = sub('Compare brands')
    const cols = () => [...host.querySelectorAll('.hv-xd-cmpcol')]
    expect(cols().map(shown)).toEqual([['s1', 's3'], ['s2']])
    expect(pickMenu(cols()[1].querySelector('.menu-btn'), 'No brand')).toEqual(['Hammer', 'No brand'])
    expect(cols().map(shown)).toEqual([['s1', 's3'], ['s4']])
    expect(cols()[1].querySelector('.menu-btn').getAttribute('aria-label')).toBe('Brand: No brand')
  })
  it('does not offer Compare brands with one brand', () => {
    open(log.filter(w => w.id !== 's2'))
    expect(container.querySelector('.hv-xd-labels')).toBeNull()
    expect([...container.querySelectorAll('.hv-linkrow b')].map(b => b.textContent)).not.toContain('Compare brands')
  })
})

describe('hevier: Workout extras and Exercise settings parts in exercise details (D117)', () => {
  const vid = 'https://youtu.be/dQw4w9WgXcQ'
  const log = [{ id: 'a', d: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), name: 'Push Day', start: day('2026-09-26'), end: day('2026-09-26') + 3600000,
    entries: [{ id: EX.id, note: 'Form: ' + vid, notePin: true, sets: [{ w: 60, r: 8, done: true }] }] }]
  const openWith = patch => { open(log); act(() => useStore.getState().update(s => { Object.assign(s, patch) })) }
  const youtube = host => [...host.querySelectorAll('button')].some(b => b.textContent.includes('Watch on YouTube'))
  const menuRows = () => {
    act(() => container.querySelector('.hv-xd-bar [aria-label="More"]').click())
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(useUI.getState().sheets.at(-1).render(() => {})))
    const rows = [...host.querySelectorAll('.menu-item')].map(i => i.textContent)
    act(() => r2.unmount())
    return rows
  }
  const reopen = patch => { act(() => root.unmount()); container.remove(); openWith(patch) }

  it('Exercise demos: the YouTube search and the pinned note’s video go, the steps stay', () => {
    openWith({})
    let how = sub('How to')
    expect(youtube(how)).toBe(true)
    expect(how.querySelector('.youtube-video')).toBeTruthy()
    for (const patch of [{ hvModuleParts: { 'hvWorkout.demos': false } }, { modules: { hvWorkout: false } }]) {
      reopen(patch)
      how = sub('How to')
      expect(youtube(how)).toBe(false)
      expect(how.querySelector('.youtube-video')).toBeNull()
      expect(how.querySelector('.hv-xd-howto .exnote.hv-xd-pin')).toBeTruthy()   // the note's text stays
    }
  })

  it('Other names and Main muscle: off takes their ⋯ rows and the “Also called” line away, a chosen name stays', () => {
    try {
      const names = { exAliases: { [EX.id]: ['Flat bench', 'Bench'] }, exShownName: { [EX.id]: 'Bench' } }
      openWith(names)
      expect(menuRows().some(r => r.includes('Other names'))).toBe(true)
      expect(menuRows().some(r => r.includes('Main muscle'))).toBe(true)
      expect(container.querySelector('.hv-xd-aka')).toBeTruthy()
      for (const off of [{ hvModuleParts: { 'hvExercise.names': false, 'hvExercise.muscle': false } }, { modules: { hvExercise: false } }]) {
        reopen({ ...names, ...off })
        const rows = menuRows()
        expect(rows.some(r => r.includes('Other names'))).toBe(false)
        expect(rows.some(r => r.includes('Main muscle'))).toBe(false)
        expect(rows.some(r => r.includes('All details'))).toBe(true)
        expect(container.querySelector('.hv-xd-aka')).toBeNull()
        expect(container.querySelector('.hv-xd-bar h3').textContent).toBe('Bench')
      }
    } finally { useStore.getState().update(s => { s.exShownName = {} }) }
  })
})
