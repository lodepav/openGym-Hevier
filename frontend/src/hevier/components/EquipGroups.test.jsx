// @vitest-environment happy-dom
// A gym's checklist by group (DECISIONS.md D63, seam S36): a group's chip ticks all its kinds, its
// chevron opens them to tick one by one.
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { GymEquipmentChips, EquipChipStrip } from './EquipGroups.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host, have

function Harness({ start }) {
  const [checked, setChecked] = useState(new Set(start))
  have = checked
  return <GymEquipmentChips kinds={['dumbbell', 'kettlebell', 'cable', 'body weight']} checked={checked} setChecked={setChecked} />
}
function render(start) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<Harness start={start} />))
}
const chip = label => [...host.querySelectorAll('.hv-eqg-chip')].find(c => c.textContent.startsWith(label))
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('hevier: a gym’s equipment by group (D63)', () => {
  it('a group’s chip ticks its kinds as one, showing a part ticked', () => {
    render(['dumbbell'])
    expect(chip('Free weights').className).toContain('some')
    expect(chip('Free weights').textContent).toBe('Free weights 1/2')
    act(() => chip('Free weights').querySelector('.hv-eqg-t').click())
    expect([...have].sort()).toEqual(['dumbbell', 'kettlebell'])
    expect(chip('Free weights').className).toContain(' on')
    act(() => chip('Free weights').querySelector('.hv-eqg-t').click())
    expect([...have]).toEqual([])
  })

  it('the chevron at its right edge opens its kinds; a group of one has none', () => {
    render([])
    expect(chip('Cables').querySelector('.hv-eqg-x')).toBeNull()
    expect(host.querySelector('.hv-eqg-sub')).toBeNull()
    act(() => chip('Free weights').querySelector('.hv-eqg-x').click())
    const sub = [...host.querySelectorAll('.hv-eqg-sub .chip')]
    expect(sub.map(c => c.textContent)).toEqual(['dumbbell', 'kettlebell'])
    act(() => sub[1].click())
    expect([...have]).toEqual(['kettlebell'])
    act(() => chip('Free weights').querySelector('.hv-eqg-x').click())
    expect(host.querySelector('.hv-eqg-sub')).toBeNull()
  })
})

// The explorer's equipment strip (seam S38), as offered upstream in #901.
describe('hevier: the explorer’s equipment strip by group (D63)', () => {
  let strip
  function Strip({ kinds, start = '' }) {
    const [value, setValue] = useState(start)
    strip = { value }
    return <EquipChipStrip kinds={kinds} value={value} onChange={setValue} />
  }
  function show(kinds, start) { act(() => root.render(<Strip kinds={kinds} start={start} />)) }
  const byText = text => [...host.querySelectorAll('.chips .chip')].find(c => c.textContent === text)

  it('a group with one kind present is a plain chip of that kind', () => {
    render([])
    show(['dumbbell', 'cable', 'barbell', 'ez barbell'])
    expect(chip('Free weights')).toBeUndefined()
    const dumbbell = byText('dumbbell')
    expect(dumbbell.matches('button.chip')).toBe(true)
    expect(dumbbell.querySelector('.hv-eqg-x')).toBeNull()
    act(() => dumbbell.click())
    expect(strip.value).toBe('dumbbell')
    expect(chip('Barbells').querySelector('.hv-eqg-x')).toBeTruthy()
  })

  it('opens a chosen kind’s group once the list puts it among several', () => {
    render([])
    show(['dumbbell', 'cable'], 'dumbbell')
    expect(host.querySelector('.hv-eqg-strip')).toBeNull()
    show(['dumbbell', 'kettlebell', 'cable'])
    expect([...host.querySelectorAll('.hv-eqg-strip .chip')].map(c => c.textContent)).toEqual(['dumbbell', 'kettlebell'])
    expect(byText('dumbbell').className).toContain(' on')
    act(() => chip('Free weights').querySelector('.hv-eqg-x').click())
    expect(host.querySelector('.hv-eqg-strip')).toBeNull()
    expect(chip('Free weights').className).toContain('some')
  })
})
