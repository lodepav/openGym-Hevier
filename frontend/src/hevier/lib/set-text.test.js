import { describe, it, expect } from 'vitest'
import { hevySetText, hevySetLabel, previousText, previousCell, setFormat, setText, setRuns } from './set-text.js'

describe('the fork’s set format', () => {
  it('spaces the sign: plain, drops, bursts, per side', () => {
    expect(setFormat('80×8')).toBe('80 × 8')
    expect(setFormat('100×8 ↘ 80×6')).toBe('100 × 8 ↘ 80 × 6')
    expect(setFormat('60×10+4+2')).toBe('60 × 10+4+2')
    expect(setFormat('L 15×8 · R 15×7')).toBe('L 15 × 8 · R 15 × 7')
  })
  it('writes the unit once after each weight, in the profile’s unit', () => {
    expect(setFormat('80×8', 'kg')).toBe('80 kg × 8')
    expect(setFormat('22.5×10', 'lb')).toBe('22.5 lb × 10')
    expect(setFormat('60×8 F (RIR 1)', 'kg')).toBe('60 kg × 8 F (RIR 1)')
    expect(setFormat('20 each × 8', 'kg')).toBe('20 kg each × 8')
    expect(setFormat('100×8 ↘ 80×6', 'kg')).toBe('100 kg × 8 ↘ 80 kg × 6')
  })
  it('a band or body-weight set: the added load gets the unit, reps and bands do not', () => {
    expect(setFormat('+10 × 12', 'kg')).toBe('+10 kg × 12')
    expect(setFormat('12', 'kg')).toBe('12')
    expect(setFormat('15 × Red + Yellow', 'kg')).toBe('15 × Red + Yellow')
    expect(setFormat('20×15 + Red', 'kg')).toBe('20 kg × 15 + Red')
  })
  it('a timed or carried set’s load behind its time or distance; cardio has none', () => {
    expect(setFormat('1:15 · 20', 'kg')).toBe('1:15 · 20 kg')
    expect(setFormat('40 m · 32 F', 'lb')).toBe('40 m · 32 lb F')
    expect(setFormat('1:15', 'kg')).toBe('1:15')
    expect(setFormat('12:34 @ 8 km/h · 5% incline', 'kg')).toBe('12:34 @ 8 km/h · 5% incline')
  })
  it('from a logged set', () => {
    expect(setText('x', { w: 80, r: 8 }, { mode: 'reps' }, 'kmh', 'kg')).toBe('80 kg × 8')
    expect(setText('x', { w: 80, r: 8 }, { mode: 'reps' }, 'kmh')).toBe('80 × 8')
    expect(setText('x', { sec: 75, w: 20 }, { mode: 'time' }, 'kmh', 'lb')).toBe('1:15 · 20 lb')
  })
  it('repeats lead their run, all alike too, and a set without weight reads "3 × 12"', () => {
    expect(setRuns(['80 × 8', '80 × 8', '80 × 7', '80 × 6'])).toBe('2 × 80 × 8, 80 × 7, 80 × 6')
    expect(setRuns(['60 × 8', '60 × 8', '60 × 8'])).toBe('3 × 60 × 8')
    expect(setRuns(['× 10', '× 10', '× 10'])).toBe('3 × 10')
    expect(setRuns(['60 × 8', '× 10', '× 10'])).toBe('60 × 8, 2 × 10')
    expect(setRuns(['80 × 8', '55 × 13'])).toBe('80 × 8, 55 × 13')
    expect(setRuns(['× 12'])).toBe('× 12')
  })
})

describe('hevySetText', () => {
  it('writes the plain weight × reps out in full', () => {
    expect(hevySetText('60×8', 'kg')).toBe('60kg × 8 reps')
    expect(hevySetText('22.5×10', 'lb')).toBe('22.5lb × 10 reps')
    expect(hevySetText('60×8 F', 'kg')).toBe('60kg × 8 reps F')
    expect(hevySetText('300×1', 'kg')).toBe('300kg × 1 rep')
  })
  it('leaves upstream’s other forms alone', () => {
    expect(hevySetText('+10 × 12', 'kg')).toBe('+10 × 12')
    expect(hevySetText('20 each × 8', 'kg')).toBe('20 each × 8')
    expect(hevySetText('60×10+4+2', 'kg')).toBe('60×10+4+2')
    expect(hevySetText('30 min @ 10 km/h', 'kg')).toBe('30 min @ 10 km/h')
  })
})

describe('hevier cardio time as a clock (D53)', () => {
  it('writes a cardio set’s minutes as h:mm:ss, every other set as upstream does', () => {
    const cardio = { mode: 'cardio' }
    expect(hevySetLabel('x', { min: 754 / 60, speed: 8 }, cardio, 'kmh')).toMatch(/^12:34 @ 8/)
    expect(hevySetLabel('x', { min: 90, speed: 8 }, cardio, 'kmh')).toMatch(/^1:30:00 @ /)
    expect(hevySetLabel('x', { min: 918 / 60, speed: 0 }, cardio, 'kmh')).toBe('15:18')
    expect(hevySetLabel('x', { min: 10, incline: 5 }, cardio, 'kmh')).toMatch(/^10:00 · /)
    expect(hevySetLabel('x', { sec: 75 }, { mode: 'time' })).toBe('1:15')
  })
})

describe('previousText', () => {
  const opts = { mode: 'reps', unit: 'kg' }
  it('writes last time’s weight and reps, body weight with its added load', () => {
    expect(previousText({ w: 60, r: 8 }, opts)).toBe('60 kg × 8')
    expect(previousText({ w: 10, r: 12 }, { ...opts, bw: true })).toBe('+10 kg × 12')
    expect(previousText({ w: 0, r: 12 }, { ...opts, bw: true })).toBe('× 12')
    expect(previousText(null, opts)).toBe('–')
  })
  it('leaves out a weight that was never entered, as Today writes it', () => {
    expect(previousText({ w: 0, r: 10 }, opts)).toBe('× 10')
    expect(previousText({ r: 10 }, { ...opts, unit: '' })).toBe('× 10')
  })
  it('in the exercise’s own unit', () => {
    expect(previousText({ w: 20.41165665, r: 8 }, { ...opts, unit: 'lb', show: w => Math.round(w / 0.45359237) })).toBe('45 lb × 8')
  })
  it('without the unit where a column header names it', () => {
    expect(previousText({ w: 90, r: 1 }, { ...opts, unit: '' })).toBe('90 × 1')
    expect(previousText({ w: 10, r: 12 }, { ...opts, unit: '', bw: true })).toBe('+10 × 12')
    expect(previousText({ sec: 40 }, { ...opts, unit: '', mode: 'time', id: 'x', target: { mode: 'time' } })).toBe('0:40')
  })
  it('a band, per-side or timed set in the exercise’s own unit too', () => {
    const lb = { ...opts, unit: 'lb', show: w => Math.round(w / 0.45359237), id: 'x', target: { mode: 'reps' } }
    expect(previousText({ w: 20.41165665, r: 15, bands: ['b1'] }, lb)).toBe('45 lb × 15 + band')
    const p = { w: 20.41165665, r: 16, sides: { L: { w: 20.41165665, r: 8, done: true }, R: { w: 20.41165665, r: 8, done: true } } }
    expect(previousText(p, lb)).toBe('L 45 lb × 8 · R 45 lb × 8')
    expect(previousText({ sec: 40, w: 20.41165665 }, { ...lb, mode: 'time', target: { mode: 'time' } })).toBe('0:40 · 45 lb')
  })
  it('a band set keeps its bands', () => {
    expect(previousText({ w: 20, r: 15, bands: ['b1'] }, { ...opts, unit: '', id: 'x', target: { mode: 'reps' } })).toBe('20 × 15 + band')
  })
  it('one side of a per-side set, or none when last time had no sides', () => {
    const p = { w: 20, r: 20, sides: { L: { w: 20, r: 10 }, R: { w: 22, r: 9 } } }
    expect(previousText(p, { ...opts, side: 'R' })).toBe('22 kg × 9')
    expect(previousText({ w: 20, r: 10 }, { ...opts, side: 'L' })).toBe('–')
  })
})

describe('previousCell (D127)', () => {
  const opts = { mode: 'reps', unit: 'kg', id: 'x', target: { reps: 8 } }
  it('leaves the effort out', () => {
    expect(previousCell({ w: 60, r: 8, rpe: 9 }, opts)).toBe('60 kg × 8')
    expect(previousCell({ w: 60, r: 8, rpe: 9 }, { ...opts, unit: '' })).toBe('60 × 8')
  })
  it('reads a per-side set whole as two lines, and one side as its own', () => {
    const p = { w: 15, r: 30, sides: { L: { w: 15, r: 15, done: true, rpe: 6 }, R: { w: 15, r: 15, done: true, rpe: 6 } } }
    expect(previousCell(p, { ...opts, unit: '' })).toBe('L 15 × 15\nR 15 × 15')
    expect(previousCell(p, opts)).toBe('L 15 kg × 15\nR 15 kg × 15')
    expect(previousCell(p, { ...opts, side: 'R' })).toBe('15 kg × 15')
  })
})

