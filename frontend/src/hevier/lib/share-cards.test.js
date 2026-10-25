import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { shareCards, monthCards, layoutShareCard, SHARE_H, SHARE_W } from './share-cards.js'
import { monthReport } from './month-report.js'
import { workoutsByDay } from './calendar.js'
import { workoutRecords } from './records.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const s = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
const wk = (day, entries, extra = {}) => ({
  id: 'w' + day, name: 'Push', d: '2026-10-' + String(day).padStart(2, '0'),
  start: Date.parse(`2026-10-${String(day).padStart(2, '0')}T10:00:00`), end: Date.parse(`2026-10-${String(day).padStart(2, '0')}T11:00:00`),
  vol: 1000, entries, ...extra,
})
// A fake measure: every character 0.55 of the font size wide.
const measure = (text, weight, size) => String(text).length * size * 0.55
const texts = layout => layout.items.filter(i => i.kind === 'text').map(i => i.text)

describe('share cards (D87)', () => {
  it('a workout without records makes Summary, Exercises and Muscles; the summary counts work sets', () => {
    const w = wk(2, [{ id: BENCH, sets: [s(20, 10, { phase: 'warmup' }), s(80, 5), s(85, 3)] }])
    const cards = shareCards({ unit: 'kg', workouts: [w] }, w)
    expect(cards.map(c => c.kind)).toEqual(['summary', 'exercises', 'muscles'])
    expect(cards[0].stats.map(x => [x.label, x.value])).toEqual([['Time', '1h'], ['Sets', '2']])
    expect(cards[0].line).toMatch(/Chest 2/)
    expect(cards[1].rows).toEqual([expect.objectContaining({ sets: '2 sets', best: '85kg × 3 reps' })])
  })

  it('a workout that beats the last one has a Records card, and Records in the summary', () => {
    const a = wk(1, [{ id: BENCH, sets: [s(80, 5)] }])
    const b = wk(3, [{ id: BENCH, sets: [s(90, 5)] }])
    const cards = shareCards({ unit: 'kg', workouts: [a, b] }, b)
    expect(cards.map(c => c.kind)).toContain('records')
    const recs = cards.find(c => c.kind === 'records').rows
    expect(recs[0]).toMatchObject({ kind: 'Heaviest Weight', value: '90 kg' })
    expect(cards[0].stats.find(x => x.label === 'Records')).toMatchObject({ value: String(recs.length), trophy: true })
  })

  it('weight mode shows Volume and no muscle line', () => {
    const w = wk(2, [{ id: BENCH, sets: [s(80, 5)] }])
    const [sum] = shareCards({ unit: 'kg', hvVolume: 'weight', workouts: [w] }, w)
    expect(sum.stats[1].label).toBe('Volume')
    expect(sum.line).toBe('')
  })

  it('a card is always 1080 × 1350 and keeps its rows inside, the rest counted', () => {
    const many = Array.from({ length: 30 }, () => ({ id: BENCH, sets: [s(60, 8)] }))
    const w = wk(2, many)
    const ex = shareCards({ unit: 'kg', workouts: [w] }, w)[1]
    const layout = layoutShareCard(ex, { measure })
    expect([layout.width, layout.height]).toEqual([SHARE_W, SHARE_H])
    expect(Math.max(...layout.items.map(i => i.y))).toBeLessThanOrEqual(SHARE_H)
    expect(texts(layout).some(x => /^and \d+ more$/.test(x))).toBe(true)
  })

  it('on black the content is centred; over a photo it sits at the bottom with a shade above it', () => {
    const w = wk(2, [{ id: BENCH, sets: [s(80, 5)] }])
    const [sum] = shareCards({ unit: 'kg', workouts: [w] }, w)
    const black = layoutShareCard(sum, { measure })
    const photo = layoutShareCard(sum, { measure, photo: true })
    const bar = l => l.items.find(i => i.kind === 'bar').y
    expect(bar(black)).toBeGreaterThan(88)
    expect(bar(photo)).toBeGreaterThan(bar(black))
    expect(bar(photo)).toBeGreaterThan(SHARE_H / 3)
    expect(Math.max(...photo.items.filter(i => !i.foot).map(i => i.y))).toBeGreaterThan(SHARE_H - 250)
    expect(photo.shadeFrom).toBeGreaterThan(0)
    expect(photo.shadeFrom).toBeLessThan(bar(photo))
    // The footer stays where it was.
    const foot = l => l.items.find(i => i.text === 'Go Hevier').y
    expect(foot(photo)).toBe(foot(black))
  })

  it('the Muscles card draws both body views when a map is given, and a bar per muscle', () => {
    const w = wk(2, [{ id: BENCH, sets: [s(80, 5), s(80, 5)] }])
    const card = shareCards({ unit: 'kg', workouts: [w] }, w).find(c => c.kind === 'muscles')
    const layout = layoutShareCard(card, { measure, map: { aspect: 1.8 } })
    expect(layout.items.filter(i => i.kind === 'map').map(i => i.view)).toEqual(['front', 'back'])
    expect(layout.items.filter(i => i.kind === 'meter').length).toBe(card.rows.length)
  })
})

describe('share cards: fitting (D87)', () => {
  it('a stat too long for its tile is drawn smaller, not cut', () => {
    const card = { kind: 'summary', title: 'Push', when: '', exercises: '1 exercise', line: '', stats: [
      { label: 'Time', value: '1h 5m' }, { label: 'Sets', value: '16' }, { label: 'Records', value: '2', trophy: true }] }
    const narrow = (text, weight, size) => String(text).length * size * 1.2
    const value = layoutShareCard(card, { measure: narrow }).items.find(i => i.text === '1h 5m')
    expect(value.size).toBeLessThan(60)
  })
})

describe('share cards: a month report (D23, D87)', () => {
  const sept = { ...wk(1, [{ id: BENCH, sets: [s(80, 5)] }]), id: 'ws', d: '2026-09-10', start: Date.parse('2026-09-10T10:00:00'), end: Date.parse('2026-09-10T11:00:00') }
  const a = wk(5, [{ id: BENCH, sets: [s(80, 5), s(80, 5)] }])
  const b = wk(12, [{ id: BENCH, sets: [s(90, 5)] }])
  const all = [sept, a, b]
  const S = { unit: 'kg', workouts: all }
  const month = { y: 2026, mo: 9, report: monthReport(all, 2026, 9, 1, 'main', w => workoutRecords(S, w)), workouts: all,
    byDay: workoutsByDay(all), ws: 1, title: 'October Report', before: 'September' }

  it('makes all five cards, the summary with its changes against the month before', () => {
    const cards = monthCards(S, month)
    expect(cards.map(c => c.kind)).toEqual(['summary', 'calendar', 'muscles', 'records', 'exercises'])
    const [sum] = cards
    expect(sum.stats.map(x => [x.label, x.value, x.delta?.text])).toEqual([['Workouts', '2', '+1'], ['Duration', '2h', '+1h'], ['Sets', '3', '+2']])
    expect(sum.line).toBe('Against September')
    expect(cards[3].rows[0]).toMatchObject({ value: '90 kg' })
    expect(cards[4].rows[0]).toMatchObject({ sets: '3 sets', best: '90 kg' })
  })

  it('the calendar has the month’s days, trained ones with their kind, from the week’s first day', () => {
    const cal = monthCards(S, month)[1]
    expect(cal.days[0]).toBe('Mo')
    // 1 October 2026 is a Thursday: three blanks before it.
    expect(cal.cells.slice(0, 4)).toEqual([null, null, null, { day: 1, kind: '' }])
    expect(cal.cells.filter(c => c?.kind).map(c => [c.day, c.kind])).toEqual([[5, 'strength'], [12, 'strength']])
    const layout = layoutShareCard(cal, { measure })
    expect(layout.items.filter(i => i.kind === 'dot')).toHaveLength(2)
    expect(texts(layout)).toContain('31')
    for (const it of layout.items) expect(it.y).toBeLessThanOrEqual(SHARE_H)
  })

  it('a month with only what it has: no records, no muscles, no top exercises', () => {
    const empty = { ...month, report: { ...month.report, records: [], muscles: [], top: [] } }
    expect(monthCards(S, empty).map(c => c.kind)).toEqual(['summary', 'calendar'])
  })

  it('the summary tiles carry the change, in green up and red down', () => {
    const layout = layoutShareCard(monthCards(S, month)[0], { measure })
    expect(layout.items.filter(i => i.color === 'up').map(i => i.text)).toEqual(['+1', '+1h', '+2'])
  })
})
