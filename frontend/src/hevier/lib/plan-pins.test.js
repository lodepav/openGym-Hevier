import { describe, it, expect, afterEach } from 'vitest'
import { pinOn } from './plan-pins.js'
import { hooks } from '../hooks.js'
import { pinState } from '../../lib/queue.js'
import { effectiveRoutineIds } from '../../lib/history.js'
import { refillAfter } from '../../lib/rotation.js'

// A six-session rotation whose pass began Monday 2 Nov; Upper A and Lower A were done Sat 14 and
// Sun 15 Nov, and today is Monday 16 Nov (the user's case, synthetic).
const ids = ['ua', 'la', 'ub', 'lb', 'uc', 'lc']
const routines = [...ids.map(id => ({ id, name: id.toUpperCase() })), { id: 'own', name: 'Own' }]
const SINCE = Date.parse('2026-11-02T08:00:00')
const TODAY = '2026-11-16'
const w = (id, d) => ({ id: 'w-' + id + d, d, start: Date.parse(d + 'T10:00:00'), routineIds: [id], routineId: id, name: id.toUpperCase(), entries: [] })
const S = (over = {}) => ({
  routines, week: {}, dayPlan: {},
  workouts: [w('ua', '2026-11-14'), w('la', '2026-11-15')],
  queue: { ids, since: SINCE, startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
  rotation: { id: 'r1', sequence: ids, label: 'TBJP' },
  ...over,
})

afterEach(() => { hooks.pinOn = null; hooks.keepPinsOnRefill = false })

describe('a planned day trains what was picked (D124)', () => {
  it('a session done last week is open on the day it is planned for', () => {
    const s = S({ dayPlan: { '2026-11-17': 'ua' } })
    expect(pinState(s, 'ua', TODAY)).toBe('done')
    expect(pinOn(s, '2026-11-17', 'ua', TODAY)).toBe('open')
    expect(effectiveRoutineIds(s, '2026-11-17', TODAY)).toEqual([])
    hooks.pinOn = pinOn
    expect(effectiveRoutineIds(s, '2026-11-17', TODAY)).toEqual(['ua'])
  })

  it('done earlier the same week clears the planned day', () => {
    const s = S({ workouts: [w('ua', '2026-11-17')] })
    expect(pinOn(s, '2026-11-19', 'ua', '2026-11-17')).toBe('done')
  })

  it('done on the day itself is done', () => {
    const s = S({ workouts: [w('ua', '2026-11-17')] })
    expect(pinOn(s, '2026-11-17', 'ua', '2026-11-17')).toBe('done')
  })

  it('a pin before today keeps upstream answer', () => {
    const s = S()
    expect(pinOn(s, '2026-11-10', 'ua', TODAY)).toBe(pinState(s, 'ua', TODAY))
    expect(pinOn(s, '2026-11-10', 'ua', TODAY)).toBe('done')
    expect(pinOn(s, '2026-11-10', 'lb', TODAY)).toBe('open')
  })

  it('a routine that is not a queue session is null', () => {
    expect(pinOn(S(), '2026-11-17', 'own', TODAY)).toBe(null)
    expect(pinOn(S({ queue: null }), '2026-11-17', 'ua', TODAY)).toBe(null)
  })

  it('the week start decides which workouts share the planned day\'s week', () => {
    const workouts = [w('ua', '2026-11-16')]
    expect(pinOn(S({ workouts, weekStart: 1 }), '2026-11-22', 'ua', TODAY)).toBe('done')
    expect(pinOn(S({ workouts, weekStart: 0 }), '2026-11-22', 'ua', TODAY)).toBe('open')
  })
})

describe('a pass refill keeps the plans (S64, D124)', () => {
  // A two-session rotation, both done by today: the finish of the second refills the pass.
  const two = () => S({
    queue: { ids: ['ua', 'la'], since: SINCE, startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
    rotation: { id: 'r1', sequence: ['ua', 'la'], label: 'TBJP' },
    dayPlan: { '2026-11-20': 'ua' },
  })
  const NOW = Date.parse(TODAY + 'T12:00:00')

  it('upstream sweeps a later pin', () => {
    const s = two()
    expect(refillAfter(s, s.workouts[1], TODAY, NOW)).toBe(true)
    expect(s.dayPlan['2026-11-20']).toBeUndefined()
  })

  it('with the hook on the pin stays', () => {
    hooks.keepPinsOnRefill = true
    const s = two()
    expect(refillAfter(s, s.workouts[1], TODAY, NOW)).toBe(true)
    expect(s.dayPlan['2026-11-20']).toBe('ua')
  })
})
