// @vitest-environment happy-dom
// Seam S60: the delete toast's set number is the one the Hevy table shows (hold-set.js
// setNumberOf), an L/R hold pair one set and a per-side rep set one set each.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { deleteActiveSet } from '../../views/Workout.jsx'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { hooks } from '../hooks.js'
import { setNumberOf } from '../lib/hold-set.js'

vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), chime: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), beacon: vi.fn(), appBase: () => '/' }))

const side = { w: 10, r: 16, done: false, sides: { L: { w: 10, r: 8, done: false }, R: { w: 10, r: 8, done: false } } }
const hold = k => ({ side: k, mode: 'time', w: 0, sec: 30, done: false })

describe('hevier: the delete toast numbers sets as the table does (S60)', () => {
  beforeAll(() => { hooks.setNumber = setNumberOf })   // as hevier/index.js installs it
  afterAll(() => { hooks.setNumber = null })

  it('with two per-side sets and an L/R hold pair, removing the pair says Set 3', () => {
    const S = JSON.parse(JSON.stringify(DEF))
    S.active = { id: 'n', d: '2026-10-06', start: Date.now(), name: 'N', cur: 0,
      entries: [{ id: 'x', target: { sets: 3, reps: 8 }, sets: [side, side, hold('L'), hold('R')] }] }
    useStore.setState({ S, user: null })
    expect(setNumberOf(S.active.entries[0].sets, 2)).toBe(3)
    expect(deleteActiveSet(0, 2)).toBe(true)
    expect(useUI.getState().toastMsg).toBe('Set 3 gone.')
  })
})
