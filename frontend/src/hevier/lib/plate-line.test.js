import { describe, expect, it } from 'vitest'
import { makeSideSet } from '../../lib/workout-model.js'
import { setLoads, plateLineAt } from './plate-line.js'

const inv = [{ w: 20, n: 4 }, { w: 10, n: 2 }, { w: 5, n: 2 }]
const opts = { perSide: false, base: 20, inv }

describe('hevier: the plate line (D84)', () => {
  it('loads each set, none for an exercise without plates', () => {
    const loads = setLoads('pairs', [{ w: 60 }, { w: 20 }, { w: 0 }], opts)
    expect(loads[0].plates).toEqual([20])
    expect(loads[1].barOnly).toBe(true)
    expect(loads[2]).toBeNull()
    expect(setLoads('none', [{ w: 60 }], opts)).toEqual([])
  })

  it('a per-side set loads only when both sides are the same weight', () => {
    const side = (L, R) => { const s = makeSideSet({ w: 0, r: 8 }); s.sides.L.w = L; s.sides.R.w = R; return s }
    const loads = setLoads('pairs', [side(60, 60), side(60, 70), side(0, 60)], { ...opts, perSide: true })
    expect(loads[0].plates).toEqual([20])
    expect(loads[1]).toBeNull()
    expect(loads[2].plates).toEqual([20])
  })

  it('draws a line only where the stack changes, past sets with no load', () => {
    const loads = setLoads('pairs', [{ w: 60 }, { w: 0 }, { w: 60 }, { w: 80 }], opts)
    expect(plateLineAt(loads, 0)).toBe(loads[0])
    expect(plateLineAt(loads, 1)).toBeNull()
    expect(plateLineAt(loads, 2)).toBeNull()
    expect(plateLineAt(loads, 3).plates).toEqual([20, 10])
    expect(plateLineAt([], 0)).toBeNull()
  })
})
