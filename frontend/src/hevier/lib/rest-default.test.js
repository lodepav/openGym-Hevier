import { describe, it, expect } from 'vitest'
import { restOpen } from './rest-default.js'
import { t } from '../../lib/i18n.js'
import { fmtRest } from '../../lib/duration.js'
import sheetsSrc from '../../sheets.jsx?raw'
import workoutSrc from '../../views/Workout.jsx?raw'
import routineSrc from '../views/RoutineEditHevy.jsx?raw'

const off = sec => t('Default ({0})', fmtRest(sec))

describe('restOpen (D56)', () => {
  it('opens a rest with none of its own on the default, and saves the default as none', () => {
    const got = []
    const o = restOpen({ value: 0, off: off(90), onDone: v => got.push(v) }, 90)
    expect(o.value).toBe(90)
    o.onDone(90); o.onDone(120); o.onDone(0)
    expect(got).toEqual([0, 120, 0])
  })
  it('leaves an exercise\'s own rest, other wheels and no default alone', () => {
    const onDone = () => {}
    expect(restOpen({ value: 60, off: off(90), onDone }, 90)).toEqual({ value: 60, onDone })
    expect(restOpen({ value: 0, off: t('Longest exercise rest'), onDone }, 90)).toEqual({ value: 0, onDone })
    expect(restOpen({ value: 0, off: null, onDone }, 90)).toEqual({ value: 0, onDone })
    expect(restOpen({ value: 0, off: off(0), onDone }, 0)).toEqual({ value: 0, onDone })
  })
  // restOpen recognises the default rest by the label the callers give the wheel. If upstream
  // rewords it in one of them, D56 would stop working there without a sound: fail here instead.
  it('rewords upstream\'s "0:00 means your default rest", whatever the rest, and no other line', () => {
    const foot = 'Rest after each set of this exercise. 0:00 means your default rest.'
    const said = 'Rest after each set of this exercise. Left on your default rest (1:30), it follows the default when you change it.'
    expect(restOpen({ value: 0, off: off(90), footer: foot, onDone: () => {} }, 90).footer).toBe(said)
    expect(restOpen({ value: 60, off: off(90), footer: foot, onDone: () => {} }, 90).footer).toBe(said)
    expect(restOpen({ value: 0, off: off(90), footer: 'Other', onDone: () => {} }, 90).footer).toBe('Other')
  })

  it('matches the label every per-exercise rest wheel passes', () => {
    const label = /off: t\('Default \(\{0\}\)', fmtRest\((st|state|S)\.restSec\)\)/g
    expect(sheetsSrc.match(label)).toHaveLength(1)     // the exercise settings' rest
    expect(workoutSrc.match(label)).toHaveLength(1)    // the workout's rest row
    expect(routineSrc.match(label)).toHaveLength(1)    // the fork's routine editor
  })
})
