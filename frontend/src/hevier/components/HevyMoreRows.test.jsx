// @vitest-environment happy-dom
// The Hevy import sheet's extra rows (hevier/DECISIONS.md D31).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { HevyMoreRows, moreToast } from './HevyMoreRows.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, el
const draw = props => {
  el = document.createElement('div')
  root = createRoot(el)
  act(() => root.render(<HevyMoreRows {...props} />))
  return el.textContent
}
afterEach(() => { act(() => root.unmount()) })

const st = { unit: 'kg', measurements: [{ d: '2026-10-01' }], routines: [{ id: 'R', hevyId: 'r1' }],
  workouts: [{ id: 'x', d: '2026-10-14', start: 1000, routineId: null }] }
const data = {
  hvMeasures: [{ d: '2026-10-01', neck: 38 }, { d: '2026-10-05', neck: 39 }],
  workouts: { workouts: [{ d: '2026-10-14', start: 1000, hvHevyRoutine: 'r1' }] },
  hvUnit: 'lb',
}

describe('hevier Hevy import sheet rows (D31)', () => {
  it('shows the measurements with their counts, the links to make and the unit line', () => {
    const txt = draw({ data, st, want: true, setWant: () => {} })
    expect(txt).toContain('Import body measurements')
    expect(txt).toContain('1 new · 1 days already here')
    expect(txt).toContain('Workouts to link to their routine: 1')
    expect(txt).toContain('Your Hevy account shows weights in lb, this app in kg')
  })

  it('shows nothing when Hevy has nothing more', () => {
    expect(draw({ data: { hvMeasures: [], workouts: { workouts: [] }, hvUnit: 'kg' }, st, want: true, setWant: () => {} })).toBe('')
    expect(moreToast({ measures: 0, linked: 0 })).toBe('')
    expect(moreToast({ measures: 2, linked: 3 })).toBe('Body measurements imported: 2 · Workouts linked to their routine: 3')
  })
})
