// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { cameBack } from './came-back.js'

const go = (key, pop) => {
  window.history.pushState({ key }, '')
  if (pop) window.dispatchEvent(new PopStateEvent('popstate', { state: { key } }))
}

describe('cameBack', () => {
  it('is true only on the entry a popstate landed on', () => {
    expect(cameBack(window)).toBe(false)              // a fresh load
    go('a')
    expect(cameBack(window)).toBe(false)              // a push
    go('b', true)
    expect(cameBack(window)).toBe(true)               // back to b
    window.history.replaceState({ key: 'c' }, '')
    expect(cameBack(window)).toBe(false)              // a replace has a new key
    go('d')
    expect(cameBack(window)).toBe(false)              // a push after the back
  })
})
