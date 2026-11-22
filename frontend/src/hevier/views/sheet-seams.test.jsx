// @vitest-environment happy-dom
// Seams S72 and S73 in sheets.jsx (the tenth critique, 2026-11-22): a weigh-in far off the last asks
// before it is saved, and the effort picker's unset Exact field says "Not set", not "–".
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { bwSheet, EffortPicker } from '../../sheets.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const mounted = []
function mount(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(el))
  return host
}
const top = () => useUI.getState().sheets.at(-1)
const openTop = () => { const s = top(); return mount(s.render(() => useUI.getState().closeSheet(s.id))) }
function type(el, value) {
  Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const btn = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label)

beforeEach(() => {
  useUI.setState({ sheets: [] })
  useStore.setState(s => ({ S: { ...s.S, unit: 'kg', bodyweight: [{ d: '2026-11-01', w: 70 }], targetW: null } }))
  document.body.innerHTML = ''
})
afterEach(() => act(() => { mounted.splice(0).forEach(r => r.unmount()) }))

describe('S72: a weigh-in far off the last asks first', () => {
  it('Fix it saves nothing and keeps the sheet; Save saves as typed', () => {
    act(() => bwSheet())
    const sheet = openTop()
    act(() => type(sheet.querySelector('.bw-read input'), '700'))
    act(() => btn(sheet, 'Save').click())
    const ask = openTop()
    expect(ask.textContent).toContain('700 kg is 900% off your last weigh-in, 70 kg. Save it?')
    expect(useStore.getState().S.bodyweight).toHaveLength(1)
    act(() => btn(ask, 'Fix it').click())
    expect(useStore.getState().S.bodyweight).toHaveLength(1)
    expect(useUI.getState().sheets).toHaveLength(1)   // the weigh-in, to correct
    act(() => btn(sheet, 'Save').click())
    const again = openTop()
    act(() => btn(again, 'Save').click())
    expect(useStore.getState().S.bodyweight.map(b => b.w)).toContain(700)
  })

  it('a usual change saves at once', () => {
    act(() => bwSheet())
    const sheet = openTop()
    act(() => type(sheet.querySelector('.bw-read input'), '71'))
    act(() => btn(sheet, 'Save').click())
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(useStore.getState().S.bodyweight.map(b => b.w)).toContain(71)
  })

  it('editing the latest weigh-in never asks, however far off', () => {
    act(() => bwSheet({ edit: { d: '2026-11-01', id: '0' } }))
    const sheet = openTop()
    act(() => type(sheet.querySelector('.bw-read input'), '700'))
    act(() => btn(sheet, 'Save').click())
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(useStore.getState().S.bodyweight.map(b => b.w)).toEqual([700])
  })
})

describe('S73: the unset Exact effort', () => {
  it('says Not set, not a dash between − and +', () => {
    const host = mount(<EffortPicker kind="rir" value={null} onPick={() => {}} close={() => {}} />)
    expect(host.querySelector('.effpick-free input').getAttribute('placeholder')).toBe('Not set')
  })
})
