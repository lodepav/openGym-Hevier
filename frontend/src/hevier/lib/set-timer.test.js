import { describe, expect, it } from 'vitest'
import { secOf, stopped, stopAll, startRun, runningSec, anyRunning, RUN } from './set-timer.js'
import { digitsIn, fromDigits, showDigits } from './duration-entry.js'

const T = Date.parse('2026-10-18T10:00:00')
const session = () => ({
  entries: [
    { id: 'treadmill', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 8 }, { min: 20, speed: 8 }] },
    { id: 'plank', target: { mode: 'time' }, sets: [{ sec: 60 }, { sec: 60, done: true }] },
  ],
})

describe('hevier set timer (D53)', () => {
  it('reads cardio minutes and hold seconds as seconds', () => {
    expect(secOf({ min: 12.5 }, 'cardio')).toBe(750)
    expect(secOf({ sec: 45 }, 'time')).toBe(45)
    expect(secOf({}, 'cardio')).toBeNull()
  })
  it('counts up from the stamp and writes the time where upstream keeps it', () => {
    const run = { min: 20, speed: 8, [RUN]: T }
    expect(runningSec(run, T + 754_400)).toBe(754)
    expect(stopped(run, 'cardio', T + 754_400)).toEqual({ min: 754 / 60, speed: 8 })
    expect(stopped({ sec: 60, [RUN]: T }, 'time', T + 75_000)).toEqual({ sec: 75 })
    expect(stopped({ sec: 60 }, 'time', T)).toEqual({ sec: 60 })
  })
  it('one timer at a time: starting a set stops the one running', () => {
    const A = session()
    startRun(A, 0, 0, T)
    expect(A.entries[0].sets[0][RUN]).toBe(T)
    startRun(A, 1, 0, T + 90_000)
    expect(A.entries[0].sets[0]).toEqual({ min: 1.5, speed: 8 })
    expect(A.entries[1].sets[0][RUN]).toBe(T + 90_000)
    expect(anyRunning(A)).toBe(true)
    expect(stopAll(A, T + 120_000)).toEqual([[1, 0]])
    expect(A.entries[1].sets[0]).toEqual({ sec: 30 })
    expect(anyRunning(A)).toBe(false)
  })
  it('a ticked set does not start', () => {
    const A = session()
    startRun(A, 1, 1, T)
    expect(anyRunning(A)).toBe(false)
  })
})

describe('hevier duration entry (D53)', () => {
  it('fills a clock from the right', () => {
    expect(showDigits(digitsIn('5'))).toBe('0:05')
    expect(showDigits(digitsIn('12:345'))).toBe('1:23:45')   // a digit typed after "12:34"
    expect(showDigits(digitsIn('12:3'))).toBe('1:23')        // backspace on "12:34"
    expect(showDigits(digitsIn('13000'))).toBe('1:30:00')
    expect(digitsIn('0:00')).toBe('')
    expect(digitsIn('1234567')).toBe('123456')
  })
  it('reads the digits as seconds', () => {
    expect(fromDigits('1234')).toBe(754)
    expect(fromDigits('90')).toBe(90)
    expect(fromDigits('13000')).toBe(5400)
    expect(fromDigits('')).toBe(0)
  })
})
