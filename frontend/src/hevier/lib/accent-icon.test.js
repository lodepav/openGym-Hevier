import { describe, expect, it } from 'vitest'
import { ACCENTS } from '../../lib/format.js'
import { HV_ACCENTS, accentFields } from './accents.js'
import { DEFAULT_ICON, ICON_IDS, accentIcon, iconFor } from './accent-icon.js'

describe('the launcher icon follows the accent (D123)', () => {
  it('each offered accent has its own icon', () => {
    for (const a of HV_ACCENTS) expect(accentIcon(accentFields(a.hex))).toBe(a.id)
    expect(ICON_IDS).toEqual(HV_ACCENTS.map(a => a.id))
  })
  it('the default green is the green icon', () => {
    expect(DEFAULT_ICON).toBe('green')
    expect(iconFor('#34D08A')).toBe('green')
  })
  it('a colour near an offered accent takes its icon', () => {
    expect(iconFor('#3fc8e8')).toBe('teal')
    expect(iconFor('#0a84ff')).toBe('blue') // upstream's sky, a kept old pick
    expect(accentIcon({ accent: 'sky' })).toBe('blue')
  })
  it('a far colour and a kept dropped preset keep the green', () => {
    expect(iconFor('#e34b37')).toBe('green')
    expect(accentIcon({ accent: 'orange' })).toBe('green')
    expect(accentIcon({ accent: 'red' })).toBe('green')
  })
  it('junk keeps the green', () => {
    for (const v of [undefined, '', 'teal', '#abc']) expect(iconFor(v)).toBe('green')
  })
})
