import { describe, expect, it } from 'vitest'
import { decodeHrm, plausible, parseRecording, recordable, mergeStrap, liveBpm } from './hr-strap.js'
import { mergeHeartRate, lacksHeartRate } from '../../lib/health-read.js'

const T0 = Date.UTC(2026, 9, 21, 15, 0, 0)
const s = sec => T0 + sec * 1000
const workout = sets => ({ id: 'w1', d: '2026-10-21', name: 'Lower B', start: s(0), end: s(600), _ts: 5, entries: [{ id: '0025', target: { mode: 'reps' }, sets }] })
// One `<ms> <hex>` line a second, as HevierHrStrapService writes them: 8-bit heart rate, contact, an RR interval.
const line = (sec, bpm) => `${s(sec)} 16${bpm.toString(16).padStart(2, '0')}0004`
const recording = (from, to, bpmAt) => { const out = []; for (let x = from; x <= to; x++) out.push(line(x, bpmAt(x))); return out.join('\n') }

describe('decodeHrm (Heart Rate Measurement, 0x2A37)', () => {
  it('reads an 8-bit heart rate with skin contact and RR intervals', () => {
    // flags 0x16: contact supported and detected, RR present; 72 bpm; RR 0x0355 = 853/1024 s, 0x0340
    expect(decodeHrm('16 48 5503 4003')).toEqual({ bpm: 72, contact: true, rr: [833, 813] })
  })
  it('reads a 16-bit heart rate and skips the energy expended field', () => {
    // flags 0x19: uint16, energy present, RR present; 0x00b4 = 180 bpm; energy 0x0010; RR 0x0200 = 500 ms
    expect(decodeHrm([0x19, 0xb4, 0x00, 0x10, 0x00, 0x00, 0x02])).toEqual({ bpm: 180, contact: null, rr: [500] })
  })
  it('tells a strap off the skin, and a strap that cannot tell', () => {
    expect(decodeHrm('04 50').contact).toBe(false)
    expect(decodeHrm('00 50')).toEqual({ bpm: 80, contact: null, rr: [] })
  })
  it('gives null for a value too short to read', () => {
    expect(decodeHrm('')).toBeNull()
    expect(decodeHrm('16')).toBeNull()
    expect(decodeHrm('01 50')).toBeNull()
    expect(decodeHrm('xyz')).toBeNull()
  })
  it('keeps plausible readings only', () => {
    expect(plausible(decodeHrm('06 00'))).toBe(false)    // 0 bpm, which a strap sends while it settles
    expect(plausible(decodeHrm('04 80'))).toBe(false)    // off the skin
    expect(plausible(decodeHrm('06 80'))).toBe(true)
    expect(plausible(decodeHrm('00 ff'))).toBe(false)    // 255
  })
})

describe('parseRecording', () => {
  it('turns the file into [ms, bpm] pairs, oldest first, dropping bad lines', () => {
    const text = [line(2, 101), 'garbage', '', `${s(3)} 0450`, line(1, 100), `0 1650`].join('\n')
    expect(parseRecording(text)).toEqual([[s(1), 100], [s(2), 101]])
    expect(parseRecording(null)).toEqual([])
  })
})

describe('recordable', () => {
  it('records a live workout only', () => {
    expect(recordable({ id: 'a1' })).toBe(true)
    expect(recordable({ id: 'a1', backfill: true })).toBe(false)
    expect(recordable({ id: 'a1', editingWorkoutId: 'w1' })).toBe(false)
    expect(recordable(null)).toBe(false)
  })
})

describe('mergeStrap', () => {
  it('gives the session and each set the strap’s heart rate, peak included', () => {
    // a set ticked at 3:20 after 8 reps, its heart rate peaking at 152 for a few seconds
    const S = { workouts: [workout([{ w: 180, r: 6, done: true, at: s(200) }, { w: 150, r: 7, done: true, at: s(400) }])] }
    const bpm = x => (x >= 190 && x <= 196 ? 152 : 110)
    expect(mergeStrap(S, 'w1', parseRecording(recording(0, 600, bpm)), 99)).toBe(true)
    const w = S.workouts[0]
    expect(w.hr.max).toBe(152)
    expect(w.hr.src).toBe('strap')
    expect(w.hr.n).toBe(601)
    expect(w.entries[0].sets[0].hr.max).toBe(152)
    expect(w.entries[0].sets[0].restHr).toEqual({ avg: 110, max: 110 })
    expect(w.entries[0].sets[1].hr).toEqual({ avg: 110, max: 110 })
    expect(w._ts).toBe(99)
  })

  it('replaces Health Connect’s one-minute averages, which lost the peak', () => {
    const S = { workouts: [workout([{ w: 180, r: 6, done: true, at: s(200) }])] }
    const minutes = []; for (let m = 0; m <= 10; m++) minutes.push([s(m * 60), m === 3 ? 137 : 110])
    mergeHeartRate(S, 'w1', minutes, 'hc', 50)
    expect(S.workouts[0].hr).toMatchObject({ max: 137, src: 'hc' })
    mergeStrap(S, 'w1', parseRecording(recording(0, 600, x => (x === 195 ? 152 : 110))), 60)
    expect(S.workouts[0].hr).toMatchObject({ max: 152, src: 'strap' })
    // and a later Health Connect read leaves the strap's session as it is
    mergeHeartRate(S, 'w1', minutes, 'hc', 70)
    expect(S.workouts[0].hr).toMatchObject({ max: 152, src: 'strap' })
  })

  it('leaves a set the readings do not reach as it was', () => {
    const own = { avg: 99, max: 120 }
    const S = { workouts: [workout([{ w: 60, r: 8, done: true, at: s(100) }, { w: 60, r: 8, done: true, at: s(500), hr: own }])] }
    // the strap dropped out after five minutes
    mergeStrap(S, 'w1', parseRecording(recording(0, 300, () => 120)), 9)
    expect(S.workouts[0].entries[0].sets[0].hr).toEqual({ avg: 120, max: 120 })
    expect(S.workouts[0].entries[0].sets[1].hr).toEqual(own)
    expect(lacksHeartRate(S.workouts[0])).toBe(false)
  })

  it('changes nothing without readings or without the workout', () => {
    const S = { workouts: [workout([{ w: 60, r: 8, done: true, at: s(100) }])] }
    expect(mergeStrap(S, 'w1', [], 9)).toBe(false)
    expect(mergeStrap(S, 'nope', parseRecording(recording(0, 600, () => 120)), 9)).toBe(false)
    expect(S.workouts[0]._ts).toBe(5)
  })
})

describe('liveBpm', () => {
  it('shows the last reading while it is fresh', () => {
    expect(liveBpm({ t: 1000, bpm: 128 }, 5000)).toBe(128)
    expect(liveBpm({ t: 1000, bpm: 128 }, 7000)).toBeNull()
    expect(liveBpm(null, 7000)).toBeNull()
  })
})
