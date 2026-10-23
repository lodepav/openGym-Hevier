// @vitest-environment happy-dom
// The routine editor's Backups sheet (D45, D86): the backups' order, and the gyms each exercise is at.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { BackupsSheet } from './BackupsSheet.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const PRESS = EXDB.find(e => /leg press/i.test(e.n)).id
const HACK = EXDB.find(e => e.id !== PRESS && /hack squat/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell (full )?squat$/i.test(e.n)).id
let root, el

const S = () => useStore.getState().S
const slot = () => S().routines[0].ex[0]
function render(gyms = [{ id: 'g1', name: 'City Gym' }, { id: 'g2', name: 'Home' }]) {
  const st = structuredClone(DEF)
  st.equipProfiles = gyms
  st.routines = [{ id: 'r', name: 'Legs', ex: [{ id: PRESS, mode: 'reps', sets: 3, reps: 10, subs: [HACK, SQUAT] }] }]
  useStore.setState({ S: st, user: null })
  act(() => root.render(<BackupsSheet rid="r" i={0} exId={PRESS} close={() => {}} />))
}
const chips = () => [...el.querySelectorAll('.hv-bk-gyms .chip')]

beforeEach(() => { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el) })
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = '' })

describe('hevier: BackupsSheet', () => {
  it('a chip per gym on the routine’s exercise and each backup; a tap marks it missing there, a second tap back', () => {
    render()
    expect(chips()).toHaveLength(6)
    expect(chips().every(c => c.getAttribute('aria-pressed') === 'true')).toBe(true)
    act(() => chips()[0].click())
    expect(S().hvGymMissing).toEqual({ [PRESS]: ['g1'] })
    expect(chips()[0].getAttribute('aria-pressed')).toBe('false')
    act(() => chips()[3].click())
    expect(S().hvGymMissing).toEqual({ [PRESS]: ['g1'], [HACK]: ['g2'] })
    act(() => chips()[0].click())
    expect(S().hvGymMissing).toEqual({ [HACK]: ['g2'] })
  })

  it('without gyms, no chips and no routine row', () => {
    render([])
    expect(chips()).toHaveLength(0)
    expect(el.textContent).not.toContain('In the routine')
  })

  it('the backups are reordered from their handle, and the order is saved on the slot', () => {
    render()
    const grip = el.querySelector('[data-reorder-row] .hv-grip')
    act(() => grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(slot().subs).toEqual([SQUAT, HACK])
  })
})
