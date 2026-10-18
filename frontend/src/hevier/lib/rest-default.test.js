import { describe, it, expect } from 'vitest'
import { restOpen } from './rest-default.js'
import { t } from '../../lib/i18n.js'
import { fmtRest } from '../../lib/duration.js'

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
})
