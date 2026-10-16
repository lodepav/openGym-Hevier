// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { decideBack } from '../../lib/back.js'
import { isTabRoot, atTabRoot } from './back-root.js'

describe('hevier: back on a tab screen', () => {
  it('knows the three tab screens', () => {
    expect(['/home', '/profile', '/', ''].every(p => isTabRoot(p, false))).toBe(true)
    expect(isTabRoot('/workout', false)).toBe(true)
    expect(isTabRoot('/workout', true)).toBe(false)
    expect(isTabRoot('/library', false)).toBe(false)
    expect(isTabRoot('/workout-detail', false)).toBe(false)
  })

  it('arms upstream’s exit on a tab screen, walks history elsewhere', () => {
    const ev = { canGoBack: true }
    const on = path => decideBack({ top: undefined, canGoBack: atTabRoot(ev, path, false).canGoBack, exitArmed: false })
    expect(on('/profile')).toBe('arm-exit')
    expect(on('/library')).toBe('history')
  })

  it('a sub-page the router pushed walks back even when the WebView says it cannot', () => {
    const on = idx => decideBack({ top: undefined, canGoBack: atTabRoot({ canGoBack: false }, '/calendar', false, idx).canGoBack, exitArmed: false })
    expect(on(2)).toBe('history')
    expect(on(0)).toBe('arm-exit')
    expect(atTabRoot({ canGoBack: false }, '/profile', false, 2).canGoBack).toBe(false)
  })

  it('an open sheet still closes first', () => {
    expect(decideBack({ top: { id: 's' }, canGoBack: atTabRoot({ canGoBack: true }, '/home', false).canGoBack, exitArmed: false })).toBe('sheet')
  })
})
