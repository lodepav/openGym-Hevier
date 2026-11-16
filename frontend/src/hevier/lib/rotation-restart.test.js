import { describe, it, expect } from 'vitest'
import { restartOnRedo } from './rotation-restart.js'
import { queueDone, queueRemaining } from '../../lib/queue.js'
import { refillAfter } from '../../lib/rotation.js'

const ids = ['ua', 'la', 'ub', 'lb', 'uc', 'lc']
const routines = ids.map(id => ({ id, name: id.toUpperCase() }))
const SINCE = Date.parse('2026-11-02T08:00:00')
const w = (id, d) => ({ id: 'w-' + id + d, d, start: Date.parse(d + 'T10:00:00'), routineIds: [id], routineId: id, name: id.toUpperCase(), entries: [] })
const S = (over = {}) => ({
  routines, week: {}, dayPlan: { '2026-11-20': 'ub' },
  workouts: [w('ua', '2026-11-14'), w('la', '2026-11-15')],
  queue: { ids, since: SINCE, startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
  rotation: { id: 'r1', sequence: ids, label: 'TBJP' },
  ...over,
})
// What the finish does (sheets.jsx doFinishWorkout): push, the S65 hook, then upstream's refill.
const finish = (s, x, today) => {
  s.workouts.push(x)
  const r = restartOnRedo(s, x, today)
  refillAfter(s, x, today, x.start + 3600000)
  return r
}

describe('redoing a session restarts the pass from it (D124)', () => {
  it('redo Upper A: a new pass from Upper A, done, Lower A next; then Lower A only credits', () => {
    const s = S()
    expect(finish(s, w('ua', '2026-11-17'), '2026-11-17')).toBe(true)
    expect(s.queue.ids).toEqual(ids)
    expect(queueDone(s, '2026-11-17')).toEqual(['ua'])
    expect(queueRemaining(s, '2026-11-17')[0]).toBe('la')
    const q = s.queue
    expect(finish(s, w('la', '2026-11-18'), '2026-11-18')).toBe(false)
    expect(s.queue).toBe(q)
    expect(queueDone(s, '2026-11-18')).toEqual(['ua', 'la'])
  })

  it('a redo in the middle of the sequence starts the pass there', () => {
    const s = S()
    expect(finish(s, w('la', '2026-11-17'), '2026-11-17')).toBe(true)
    expect(s.queue.ids).toEqual(['la', 'ub', 'lb', 'uc', 'lc', 'ua'])
    expect(queueDone(s, '2026-11-17')).toEqual(['la'])
  })

  it('a session not yet done does not restart', () => {
    const s = S()
    const q = s.queue
    expect(finish(s, w('ub', '2026-11-17'), '2026-11-17')).toBe(false)
    expect(s.queue).toBe(q)
  })

  it('a planner queue does not restart', () => {
    const s = S({ queue: { ids, since: SINCE, startsOn: '2026-11-02', label: 'W1' } })
    expect(finish(s, w('ua', '2026-11-17'), '2026-11-17')).toBe(false)
    expect(s.queue.label).toBe('W1')
  })

  it('a loop with rest days does not restart', () => {
    const s = S({
      queue: { ids: ['ua', 'la', 'ub'], since: SINCE, startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
      rotation: { id: 'r1', sequence: ['ua', 'la', 'ub', 'rest', 'lb', 'uc', 'lc'], label: 'TBJP', at: 0 },
    })
    expect(restartOnRedo(s, (s.workouts.push(w('ua', '2026-11-17')), s.workouts.at(-1)), '2026-11-17')).toBe(false)
  })

  it('keeps the plans', () => {
    const s = S()
    finish(s, w('ua', '2026-11-17'), '2026-11-17')
    expect(s.dayPlan).toEqual({ '2026-11-20': 'ub' })
  })
})
