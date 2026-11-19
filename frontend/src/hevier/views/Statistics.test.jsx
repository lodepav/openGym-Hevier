// @vitest-environment happy-dom
// M6: Hevy's Statistics and Measures pages, and the way back from upstream's pages under them
// (hevier/DECISIONS.md D14).
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, isoOf } from '../../lib/format.js'
import { hevierRoutes, HevyTabBar } from '../routes.jsx'
import { hooks } from '../hooks.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
let root, container, path, search

function Where() { const l = useLocation(); path = l.pathname; search = l.search; return null }

function render(entries, patch = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false }, patch)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><HevyTabBar /><Where />
  </MemoryRouter>))
}
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const tiles = () => [...container.querySelectorAll('[data-tile]')].map(x => x.dataset.tile)
const cards = () => [...container.querySelectorAll('[data-card]')].map(x => x.dataset.card)
const daysAgo = n => isoOf(new Date(Date.now() - n * 86400000))
const workout = d => ({ id: 'w' + d, d, name: 'Push', start: 1, end: 3600001, vol: 960,
  entries: [{ id: BENCH, sets: [{ w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }] }] })

beforeEach(() => { localStorage.clear(); useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: Statistics and Measures (M6)', () => {
  it('Statistics: the tiles two to a row, then the cards, then the links (D142)', () => {
    render(['/history-tab', '/stats'], { workouts: [workout(todayISO())] })
    expect(container.querySelector('.hv-day')).toBeNull()
    // No set times in the last 90 days: no Exercise time tile or card.
    expect(tiles()).toEqual(['sets', 'hours'])
    expect(cards()).toEqual(['sets', 'weekly'])
    expect(byText('[data-card="sets"] .hv-mset', 'Chest').querySelector('b').textContent).toBe('2')
    expect(container.querySelector('[data-tile="sets"]').getAttribute('aria-label')).toBe('Sets per muscle, 2 sets this week')
    const hours = container.querySelector('[data-tile="hours"]')
    expect([hours.querySelector('.hv-stile-t').textContent, hours.querySelector('b').textContent]).toEqual(['Training time', '1 h'])
    expect(hours.getAttribute('aria-label')).toBe('Training time, 1 h this week')
    // Tile = now, card = more: the weekly chart does not repeat this week's time.
    expect(container.querySelector('.hv-chart-h h2').textContent).toBe('Weekly chart')
    // One heading style: the chart's title is headed as the cards' heads are.
    expect(container.querySelector('[data-card="weekly"] .hv-scard-h > h2').textContent).toBe('Weekly chart')
    // The page ends as Lifts does, with flat accent links, no icon cards and no filled button.
    expect(container.querySelector('.hv-linkrow')).toBeNull()
    expect(container.querySelector('.btn')).toBeNull()
    expect([...container.querySelectorAll('.hv-lifts-ends .hv-link')].map(b => [b.tagName, b.textContent]))
      .toEqual([['BUTTON', 'All statistics'], ['BUTTON', 'Structural balance'], ['BUTTON', 'Arrange Statistics']])
    act(() => byText('.hv-lifts-ends .hv-link', 'All statistics').click())
    expect(path).toBe('/stats/all')
    expect(container.querySelector('.hv-allstats .hv-pb-back').getAttribute('aria-label')).toBe('Statistics')
    expect(container.querySelector('.hv-allstats .hv-title').textContent).toBe('All statistics')
  })

  it('a weigh-in brings the Body weight tile and card; the tile says its change and opens Measures', () => {
    const bw = [{ d: daysAgo(40), w: 83 }, { d: daysAgo(1), w: 82.4 }]
    render(['/stats'], { workouts: [workout(todayISO())], bodyweight: bw })
    expect(tiles()).toEqual(['weight', 'sets', 'hours'])
    expect(cards()).toEqual(['weight', 'sets', 'weekly'])
    const tile = container.querySelector('[data-tile="weight"]')
    expect(tile.getAttribute('aria-label')).toBe('Body weight, 82.4 kg, down 0.6 kg in 4 weeks')
    act(() => tile.click())
    expect(path).toBe('/measures')
  })

  it('… and not with the body module off', () => {
    render(['/stats'], { bodyweight: [{ d: daysAgo(1), w: 82.4 }], hvModuleParts: { 'body.weight': false } })
    expect(tiles()).not.toContain('weight')
    expect(cards()).not.toContain('weight')
  })

  it('draws the tiles and cards in the saved order, a hidden one not at all', () => {
    render(['/stats'], { workouts: [workout(todayISO())],
      hvStatsLayout: { tiles: { order: ['month', 'sets', 'hours'], hidden: ['hours'] }, cards: { order: ['weekly', 'sets'], hidden: ['sets'] } } })
    expect(tiles()).toEqual(['month', 'sets'])
    expect(cards()).toEqual(['weekly'])
    expect(container.querySelector('[data-tile="month"] b').textContent).toBe('1')
    // Its card switched off, the Sets tile opens nothing.
    expect(container.querySelector('[data-tile="sets"]').tagName).toBe('DIV')
  })

  it('/muscle-sets opens Statistics', () => {
    render(['/muscle-sets'])
    expect(path).toBe('/stats')
  })

  // D135 (2026-11-17): hevier.css hides upstream's week streak card on All statistics; happy-dom
  // applies no stylesheet, so the rule's selector is run here against the page as drawn.
  it('All statistics: hevier.css hides upstream’s week streak card', () => {
    render(['/stats/all'], { workouts: [workout(todayISO())] })
    const card = container.querySelector('[data-streak-card]')
    expect(card).toBeTruthy()
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../hevier.css'), 'utf8')
    const sel = css.match(/:root\[data-ui="hevier"\] (\.hv-allstats ~ [^{]*\[data-streak-card\])\{display:none\}/)?.[1]
    expect(sel).toBeTruthy()
    expect(container.querySelector(sel)).toBe(card)
  })

  it('the Sets per muscle card counts by week, month or year', () => {
    render(['/stats'], { workouts: [workout(todayISO())] })
    act(() => byText('.hv-chip', 'Year').click())
    expect(byText('.hv-chip', 'Year').getAttribute('aria-pressed')).toBe('true')
    expect(byText('.hv-mset', 'Chest')).toBeTruthy()
  })

  it('All statistics: the Muscles card keeps its bars without target ranges (D139)', () => {
    const was = hooks.statsOff
    hooks.statsOff = ['ranges']
    try {
      render(['/stats/all'], { muscleTargets: { chest: [2, 4] }, workouts: [workout(todayISO())] })
      const card = container.querySelector('[data-muscles]')
      expect(card.querySelector('.sbar-list .sbar-row')).toBeTruthy()
      expect(card.querySelector('.sbar-of')).toBeNull()
      expect([...card.querySelectorAll('button')].some(b => b.textContent === 'Ranges')).toBe(false)
      expect(card.textContent).not.toContain('Target range')
    } finally { hooks.statsOff = was }
  })

  it('an empty history says so on the sets card, and links no Structural balance', () => {
    render(['/stats'])
    expect(container.textContent).toContain('No sets in this period yet.')
    expect([...container.querySelectorAll('.hv-lifts-ends .hv-link')].map(b => b.textContent)).toEqual(['All statistics', 'Arrange Statistics'])
  })

  // happy-dom applies no stylesheet, so hevier.css's rule is run against the tiles as drawn.
  it('with an odd number of tiles the last spans both columns', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../hevier.css'), 'utf8')
    const sel = css.match(/:root\[data-ui="hevier"\] (\.hv-stiles[^{]*:last-child:nth-child\(odd\))\{grid-column:1 \/ -1\}/)?.[1]
    expect(sel).toBeTruthy()
    render(['/stats'], { workouts: [workout(todayISO())] })
    expect(tiles()).toHaveLength(2)
    expect(container.querySelector(sel)).toBeNull()
    act(() => root.unmount()); container.remove()
    render(['/stats'], { workouts: [workout(todayISO())], bodyweight: [{ d: daysAgo(1), w: 82.4 }] })
    expect(tiles()).toEqual(['weight', 'sets', 'hours'])
    expect([...container.querySelectorAll(sel)].map(x => x.dataset.tile)).toEqual(['hours'])
  })

  it('upstream’s ?focus= links land on upstream’s statistics', () => {
    render(['/stats?focus=weekly-volume'])
    expect(path).toBe('/stats/all')
    expect(search).toBe('?focus=weekly-volume')
  })

  it('Measures: body weight with upstream’s log, then measurements and photos', () => {
    render(['/history-tab', '/measures'], { bodyweight: [{ d: todayISO(), t: Date.now(), w: 80 }] })
    expect(container.querySelector('.big').textContent).toContain('80')
    expect(container.querySelector('[aria-current="page"], .on, .active')?.textContent).toContain('History')
    act(() => byText('button', 'Log').click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => byText('.hv-linkrow', 'Body measurements').click())
    expect(path).toBe('/measurements')
  })

  it('upstream’s own ‹ on a page under Measures goes back there, not to Home', () => {
    render(['/history-tab', '/measures', '/measurements'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })

  it('… and opened directly, falls back to the fork page above it', () => {
    render(['/progress-photos'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })

  it('… and Muscle balance goes back to Statistics (review S3: these fail if upstream’s header changes)', () => {
    render(['/structural-balance'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/stats')
  })
})
