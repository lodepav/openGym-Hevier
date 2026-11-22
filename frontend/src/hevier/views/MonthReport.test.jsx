// @vitest-environment happy-dom
// History → Monthly report (hevier/DECISIONS.md D23, D142).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, MONTHS_LONG } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'
import { byExercise, monthReport } from '../lib/month-report.js'
import { useStatsPhase } from '../lib/shared-phase-run.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
// Counted, to show a write that leaves the log alone works nothing out again (the sixth audit, 2026-11-21).
vi.mock('../lib/month-report.js', async orig => { const m = await orig(); return { ...m, monthReport: vi.fn(m.monthReport) } })

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const pad = n => String(n).padStart(2, '0')
const month = by => { const n = new Date(todayISO() + 'T12:00:00'); const d = new Date(n.getFullYear(), n.getMonth() + by, 1); return { y: d.getFullYear(), mo: d.getMonth(), iso: day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(day)}` } }
const last = month(-1), before = month(-2)
const W = (d, sets, extra = {}) => ({ id: d, d, start: Date.parse(d + 'T18:00:00'), end: Date.parse(d + 'T18:00:00') + 3600000, vol: 500,
  entries: [{ id: BENCH, sets: sets.map(w => ({ w, r: 5, done: true })) }], ...extra })
const log = [W(before.iso(5), [60]), W(last.iso(3), [70, 70]), W(last.iso(10), [75, 75, 75], { prs: [BENCH] })]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, workouts, extra = {}) {
  const S = structuredClone(DEF)
  S.workouts = workouts
  Object.assign(S, extra)
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
const stat = label => [...container.querySelectorAll('.hv-report-stats > div')].find(d => d.firstChild.textContent === label)

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: monthly report (D23)', () => {
  it('History’s chip opens it, on last month with its changes (D142)', () => {
    render('/history-tab', log)
    act(() => [...container.querySelectorAll('.hv-hlinks button')].find(b => b.textContent === 'Monthly report').click())
    expect(path).toBe('/report')
    expect(container.querySelector('.hv-report-bar h2').textContent).toBe(MONTHS_LONG[last.mo] + (last.y !== new Date().getFullYear() ? ' ' + last.y : ''))
    expect(stat('Workouts').textContent).toBe('Workouts2+1')
    expect(stat('Sets').textContent).toBe('Sets5+4')
    // What the changes are against says so under the month, above the numbers it explains (the critique, 2026-11-21).
    expect(container.querySelector('.hv-report-bar .hv-sub').textContent).toBe('against ' + MONTHS_LONG[(last.mo + 11) % 12])
    expect(container.querySelector('.hv-report-vs')).toBeNull()
    expect([...container.querySelectorAll('h3.sec')].find(h => h.textContent.includes('PRs')).textContent).toBe(' PRs 8')
    // Every record, worked out from the log (D51): the heaviest weight, best 1RM, set and session volume.
    expect(container.textContent).toContain('Heaviest Weight · 75 kg')
    // A 1RM line is said in words (the tenth audit, 2026-11-22); the others keep their text.
    const e1rm = [...container.querySelectorAll('.hv-report-row .hv-sub')].find(x => x.textContent.startsWith('Best 1RM'))
    expect(e1rm.getAttribute('aria-label')).toBe(e1rm.textContent.replace('1RM', 'one rep max'))
    expect([...container.querySelectorAll('.hv-report-row .hv-sub')].find(x => x.textContent.startsWith('Heaviest')).getAttribute('aria-label')).toBeNull()
    // Sentence case, and the top exercise's weight named (the seventh critique, 2026-11-22).
    expect([...container.querySelectorAll('h3.sec')].map(h => h.textContent)).toContain('Muscle split')
    // Bare counts with no caption, as Statistics' card; each row said in one name (the ninth critique; the owner, 2026-11-22).
    expect(container.querySelector('.hv-report .hv-msets-cap')).toBeNull()
    const split = container.querySelector('.hv-report .hv-wd-split')
    expect(split.querySelector('b').textContent).toBe('5')
    expect(split.getAttribute('aria-label')).toBe(split.firstChild.textContent + ', 5 sets')
    // Android's share glyph (the ninth audit, 2026-11-22).
    expect(container.querySelector('[aria-label="Share report"] .icn').dataset.icon).toBe('shareNodes')
    expect([...container.querySelectorAll('.hv-report-row .dim')].at(-1).textContent).toBe('5 sets · best 75 kg')
    expect(container.querySelectorAll('.hv-report .hv-cal-d.done')).toHaveLength(2)
    // A day tapped here leaves the Calendar's one-time hint to be seen there (the ninth review, 2026-11-22).
    act(() => container.querySelector('.hv-report .hv-cal-c').click())
    expect(useStore.getState().S.hvCalTapSeen).toBeUndefined()
    // Back goes to History, where it opens from (D142).
    expect(container.querySelector('.hv-pb-back').getAttribute('aria-label')).toBe('History')
  })

  it('opened directly, back goes to History', () => {
    render('/report', log)
    act(() => container.querySelector('.hv-pb-back').click())
    expect(path).toBe('/history-tab')
  })

  it('with a phase picked, a write that leaves the log alone works the report out no more', () => {
    render('/report', log.map(w => ({ ...w, hvPhase: { p: 'bulking' } })))
    expect(container.querySelector('.hv-phase-filter')).toBeTruthy()   // the filter applies
    act(() => useStatsPhase.getState().pick('bulking'))
    const n = monthReport.mock.calls.length
    act(() => useStore.getState().update(s => { s.hvUnrelated = 1 }))
    expect(monthReport.mock.calls.length).toBe(n)
    act(() => useStore.getState().update(s => { s.workouts = s.workouts.slice(1) }))
    expect(monthReport.mock.calls.length).toBeGreaterThan(n)
    act(() => useStatsPhase.getState().pick(null))
  })

  it('at a large text size on a narrow phone its month drops the names under the days, as Calendar does', () => {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300 })
    const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: '28px' })   // 300 / 28 < 16 em
    render('/report', log)
    expect(container.querySelector('.hv-report').classList.contains('hv-cal-tight')).toBe(true)   // the sixth audit, 2026-11-21
    rect.mockRestore(); style.mockRestore()
  })

  it('weight mode shows Volume in place of Sets', () => {
    render('/report', log, { hvVolume: 'weight' })
    expect(stat('Sets')).toBeUndefined()
    expect(stat('Volume').textContent).toContain('+1,525 kg')   // counted from the sets, as upstream's sessionVolume does
  })

  it('steps back to the first logged month and no further, and that month is empty of records', () => {
    render('/report', log)
    const prev = container.querySelector('[aria-label="Previous month"]')
    act(() => prev.click())
    expect(container.querySelector('.hv-report-bar h2').textContent).toContain(MONTHS_LONG[before.mo])
    expect(stat('Workouts').textContent).toBe('Workouts1+1')
    expect(prev.disabled).toBe(true)
    expect(container.textContent).not.toContain('PRs')
  })

  it('each number says its change in words, and the month opens a list of months to jump to (the eighth round, 2026-11-22)', () => {
    render('/report', log)
    const vs = MONTHS_LONG[before.mo]
    expect(stat('Workouts').getAttribute('aria-label')).toBe(`Workouts, 2, 1 more than ${vs}`)
    expect(stat('Duration').getAttribute('aria-label')).toBe(`Duration, 2 hours, 1 hour more than ${vs}`)
    expect(stat('Sets').getAttribute('aria-label')).toBe(`Sets, 5, 4 more than ${vs}`)
    act(() => container.querySelector('.hv-report-mt').click())
    // The sheet on top, as the app's sheet host draws it.
    const host = document.createElement('div')
    const sheet = createRoot(host)
    act(() => sheet.render(useUI.getState().sheets.at(-1).render(() => {})))
    const items = [...host.querySelectorAll('.menu-item')]
    expect(items.map(i => i.querySelector('.tt').textContent)).toEqual([`${MONTHS_LONG[last.mo]}, selected`, vs])
    act(() => items[1].click())
    act(() => sheet.unmount())
    expect(container.querySelector('.hv-report-bar h2').textContent).toContain(vs)
    expect(stat('Workouts').getAttribute('aria-label')).toBe(`Workouts, 1, 1 more than ${MONTHS_LONG[(before.mo + 11) % 12]}`)
  })

  it('a jump to another month folds its PR list back to five rows (the eighth review, 2026-11-22)', () => {
    const six = EXDB.filter(e => /^barbell /i.test(e.n)).slice(0, 6).map(e => e.id)
    const day = (d, w) => ({ ...W(d, []), entries: six.map(id => ({ id, sets: [{ w, r: 5, done: true }] })) })
    // The first month sets no records, so three months: the two after it each beat six.
    render('/report', [day(month(-3).iso(5), 50), day(before.iso(5), 60), day(last.iso(5), 70)])
    const more = () => container.querySelector('.hv-report-more')
    act(() => more().click())
    expect(more()).toBeNull()
    act(() => container.querySelector('.hv-report-mt').click())
    const host = document.createElement('div')
    const sheet = createRoot(host)
    act(() => sheet.render(useUI.getState().sheets.at(-1).render(() => {})))
    act(() => [...host.querySelectorAll('.menu-item')][1].click())
    act(() => sheet.unmount())
    expect(container.querySelector('.hv-report-bar h2').textContent).toContain(MONTHS_LONG[before.mo])
    expect(more().textContent).toMatch(/^Show all \(\d+\)$/)
  })

  it('lists the records one row per exercise, each kind once with how often it was beaten', () => {
    const rec = (id, kind, v, d) => ({ id, kind, v, d })
    const rows = byExercise([
      rec('a', 'weight', 80, '2026-09-02'), rec('b', 'reps', 10, '2026-09-03'),
      rec('a', 'e1rm', 90, '2026-09-02'), rec('a', 'weight', 85, '2026-09-09'),
    ])
    expect(rows.map(x => [x.id, x.n, x.recs.map(r => [r.kind, r.v, r.times, r.d])])).toEqual([
      ['a', 3, [['weight', 85, 2, '2026-09-09'], ['e1rm', 90, 1, '2026-09-02']]],
      ['b', 1, [['reps', 10, 1, '2026-09-03']]],
    ])
  })
})
