import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { routineWhen } from './routine-when.js'
import { pinOn } from './plan-pins.js'
import { hooks } from '../hooks.js'
import { fmtDate } from '../../lib/format.js'

// Made-up profile: today is Mon 16 Nov 2026; Push is on Tuesdays, Legs on Thursdays.
const TODAY = '2026-11-16'
const routines = ['push', 'legs', 'arms', 'cardio'].map(id => ({ id, name: id, ex: [] }))
const w = (id, d) => ({ id: 'w-' + id + d, d, start: Date.parse(d + 'T10:00:00'), routineIds: [id], routineId: id, name: id, entries: [] })
const S = (over = {}) => ({
  routines, week: { 2: ['push'], 4: ['legs'] }, dayPlan: {}, queue: null, rotation: null,
  workouts: [w('arms', '2026-11-03'), w('arms', '2026-11-07'), w('cardio', '2025-10-25'), w('push', '2026-11-10')],
  ...over,
})

beforeEach(() => { hooks.pinOn = pinOn })
afterEach(() => { hooks.pinOn = null })

describe('the routines list’s date line (D130)', () => {
  it('a planned routine reads its next day, the first of them is next', () => {
    const { next, text } = routineWhen(S(), TODAY)
    expect(next).toEqual(['push'])
    expect(text.get('push')).toBe(fmtDate('2026-11-17', true))
    expect(text.get('legs')).toBe(fmtDate('2026-11-19', true))
  })

  it('one not planned reads when it was last done, the latest; a past year shows the year', () => {
    const { text } = routineWhen(S(), TODAY)
    expect(text.get('arms')).toBe('last done ' + fmtDate('2026-11-07'))
    expect(text.get('cardio')).toBe('last done ' + fmtDate('2025-10-25', false, true))
  })

  it('planned today reads Today; a day already trained is passed over', () => {
    expect(routineWhen(S({ dayPlan: { [TODAY]: 'arms' } }), TODAY).text.get('arms')).toBe('Today')
    const done = S({ workouts: [w('push', '2026-11-17')] })
    expect(routineWhen(done, '2026-11-17').text.get('push')).toBe(fmtDate('2026-11-24', true))
  })

  it('neither planned nor done: no line, and nothing next with nothing planned', () => {
    const { next, text } = routineWhen(S({ week: {}, workouts: [] }), TODAY)
    expect(next).toEqual([])
    expect(text.size).toBe(0)
  })
})
