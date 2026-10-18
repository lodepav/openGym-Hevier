// @vitest-environment happy-dom
// A gym's checklist by group (DECISIONS.md D63, seam S36): a group's chip ticks all its kinds, its
// chevron opens them to tick one by one.
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { GymEquipmentChips } from './EquipGroups.jsx'

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
