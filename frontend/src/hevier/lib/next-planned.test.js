import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { queueStatus, nextPlanned } from './next-planned.js'
import { pinOn } from './plan-pins.js'
import { hooks } from '../hooks.js'
import { queueView } from '../../lib/queue.js'
import { fmtDate } from '../../lib/format.js'

// The user's case (synthetic): a six-session pass begun Mon 2 Nov, Upper A and Lower A done
// Sat 14 and Sun 15 Nov, today Mon 16 Nov, the rest planned day by day from Tue 17.
const ids = ['ua', 'la', 'ub', 'lb', 'uc', 'lc']
const routines = ids.map(id => ({ id, name: 'TBJP ' + id.toUpperCase() }))
const TODAY = '2026-11-16'
const w = (id, d) => ({ id: 'w-' + id + d, d, start: Date.parse(d + 'T10:00:00'), routineIds: [id], routineId: id, name: id, entries: [] })
const plan = { '2026-11-17': 'ua', '2026-11-18': 'la', '2026-11-20': 'ub', '2026-11-21': 'lb', '2026-11-23': 'uc', '2026-11-24': 'lc' }
const S = (over = {}) => ({
  routines, week: {}, dayPlan: { ...plan },
  workouts: [w('ua', '2026-11-14'), w('la', '2026-11-15')],
  queue: { ids, since: Date.parse('2026-11-02T08:00:00'), startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
  rotation: { id: 'r1', sequence: ids, label: 'TBJP' },
  ...over,
})
const status = (s, today = TODAY) => queueStatus(s, today, queueView(s, today))

beforeEach(() => { hooks.pinOn = pinOn })
afterEach(() => { hooks.pinOn = null })

describe("Home's rotation line names the Calendar's next day (S66, D124)", () => {
  it('names the planned Upper A on Tuesday, not the Upper B upstream picks', () => {
    expect(nextPlanned(S(), TODAY)).toEqual({ iso: '2026-11-17', ids: ['ua'] })
    expect(status(S())).toBe('Next: TBJP UA · ' + fmtDate('2026-11-17', true))
  })

  it('a session floating on today says today', () => {
    const { '2026-11-24': _, ...rest } = plan
    expect(status(S({ dayPlan: rest }))).toBe('Next: TBJP LC, today')
  })

  it('a rest override today goes on to the next planned day', () => {
    const { '2026-11-24': _, ...rest } = plan
    expect(status(S({ dayPlan: { ...rest, [TODAY]: 'rest' } }))).toBe('Next: TBJP UA · ' + fmtDate('2026-11-17', true))
  })

  it('a day with a workout logged is passed over', () => {
    const s = S({ workouts: [w('ua', '2026-11-14'), w('la', '2026-11-15'), w('ua', '2026-11-17')] })
    expect(nextPlanned(s, '2026-11-17').iso).toBe('2026-11-18')
  })

  it('a complete or waiting round keeps upstream text', () => {
    const s = S()
    expect(queueStatus(s, TODAY, { ...queueView(s, TODAY), complete: true })).toBe(null)
    const later = S({ queue: { ...S().queue, startsOn: '2026-11-23' } })
    expect(queueView(later, TODAY).waiting).toBe(true)
    expect(status(later)).toBe(null)
  })

  it('nothing planned within four weeks keeps upstream text', () => {
    const s = S({ dayPlan: { '2026-12-20': 'ub', '2026-12-21': 'lb', '2026-12-22': 'uc', '2026-12-23': 'lc' } })
    expect(status(s)).toBe(null)
  })
})
