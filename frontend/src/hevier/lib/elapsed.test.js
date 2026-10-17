import { describe, it, expect } from 'vitest'
import { elapsedWords, elapsedClock, restTimerText } from './elapsed.js'

describe('elapsedWords', () => {
  it('writes seconds, minutes and hours as Hevy does', () => {
    expect(elapsedWords(0)).toBe('0s')
    expect(elapsedWords(8)).toBe('8s')
    expect(elapsedWords(60)).toBe('1min')
    expect(elapsedWords(18 * 60 + 19)).toBe('18min 19s')
    expect(elapsedWords(3600)).toBe('1h')
    expect(elapsedWords(75 * 60 + 40)).toBe('1h 15min')
    expect(elapsedWords(598 * 60 + 38)).toBe('9h 58min')
  })
  it('reads junk and negatives as 0', () => {
    expect(elapsedWords(-5)).toBe('0s')
    expect(elapsedWords(undefined)).toBe('0s')
  })
})

describe('elapsedClock', () => {
  it('is m:ss under an hour and h:mm:ss from one up', () => {
    expect(elapsedClock(8)).toBe('0:08')
    expect(elapsedClock(18 * 60 + 19)).toBe('18:19')
    expect(elapsedClock(3600 + 2)).toBe('1:00:02')
    expect(elapsedClock(598 * 60 + 38)).toBe('9:58:38')
  })
})

describe('restTimerText', () => {
  it('reads the own rest, else the default, in Hevy words', () => {
    expect(restTimerText(120, 90, 'Off')).toBe('2min 0s')
    expect(restTimerText(0, 90, 'Off')).toBe('1min 30s')
    expect(restTimerText(undefined, 45, 'Off')).toBe('45s')
    expect(restTimerText(0, 0, 'Off')).toBe('Off')
  })
})
