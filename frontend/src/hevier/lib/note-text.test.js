import { describe, it, expect } from 'vitest'
import { unescapeNote, unescapeWorkout, fixImportedNotes } from './note-text.js'

describe('unescapeNote', () => {
  it('turns Hevy\'s escaped line breaks into line breaks', () => {
    expect(unescapeNote('Tired\\nNext week')).toBe('Tired\nNext week')
    expect(unescapeNote('a\\r\\nb\\n\\nc')).toBe('a\nb\n\nc')
  })
  it('leaves other text alone', () => {
    expect(unescapeNote('plain')).toBe('plain')
    expect(unescapeNote('real\nbreak')).toBe('real\nbreak')
    expect(unescapeNote(undefined)).toBe(undefined)
  })
})

describe('unescapeWorkout', () => {
  it('fixes the workout note and the exercises\' notes in a copy', () => {
    const w = { note: 'a\\nb', entries: [{ id: 'x', note: 'c\\nd' }, { id: 'y' }] }
    const out = unescapeWorkout(w)
    expect(out.note).toBe('a\nb')
    expect(out.entries[0].note).toBe('c\nd')
    expect(out.entries[1]).toEqual({ id: 'y' })
    expect(w.note).toBe('a\\nb')
  })
  it('returns the same workout when nothing changes', () => {
    const w = { note: 'fine', entries: [{ id: 'x' }] }
    expect(unescapeWorkout(w)).toBe(w)
  })
})

describe('fixImportedNotes', () => {
  it('fixes imported workouts only, stamps them, and finds nothing the second time', () => {
    const S = { workouts: [
      { id: 'iw1', note: 'a\\nb', entries: [] },
      { id: 'iw2', note: 'ok', entries: [{ id: 'x', note: 'c\\nd' }] },
      { id: 'iw3', note: 'ok', entries: [] },
      { id: 'w4', note: 'typed \\n by hand', entries: [] },
    ] }
    expect(fixImportedNotes(S, 123)).toBe(2)
    expect(S.workouts[0]).toMatchObject({ note: 'a\nb', _ts: 123 })
    expect(S.workouts[1].entries[0].note).toBe('c\nd')
    expect(S.workouts[1]._ts).toBe(123)
    expect(S.workouts[2]._ts).toBeUndefined()
    expect(S.workouts[3].note).toBe('typed \\n by hand')
    expect(fixImportedNotes(S, 456)).toBe(0)
  })
})
