// @vitest-environment happy-dom
/* A phone updated from any Go Hevier release keeps its data. Each fixture was saved by that
 * release's own importer and store, with its own readers' numbers (hevier/tools/upgrade-fixture.sh,
 * write-fixture.js); the current code opens it and has to say the same. Upstream's own state, back
 * to openGym v1.0.0, is legacy-state.test.jsx. */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn(), restOver: vi.fn() }))
vi.mock('../../lib/api.js', async importOriginal => ({ ...(await importOriginal()), api: vi.fn(() => Promise.reject(new Error('offline'))) }))

const fixtures = Object.entries(import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' }))
  .map(([path, fixture]) => [path.replace(/.*\/|\.json$/g, ''), fixture])

it('there are fixtures', () => expect(fixtures.length).toBeGreaterThan(0))

describe.each(fixtures)('a phone on %s updates to this build', (_version, { saved, facts }) => {
  const mounted = []
  const render = el => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    mounted.push(root)
    act(() => root.render(<MemoryRouter>{el}</MemoryRouter>))
    return host
  }

  // The store reads the saved copy when it is first imported, as on an app start.
  let useStore, H
  beforeEach(async () => {
    vi.resetModules()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.body.innerHTML = ''
    localStorage.clear()
    localStorage.setItem('gym_state_v1', saved)
    ;({ useStore } = await import('../../store/useStore.js'))
    H = await import('../../lib/history.js')
  }, 120000)
  afterEach(() => {
    act(() => mounted.splice(0).forEach(r => r.unmount()))
    localStorage.clear()
  })

  const read = S => {
    const entries = S.workouts.flatMap(w => w.entries)
    return {
      workouts: S.workouts.length,
      entries: entries.length,
      sets: entries.flatMap(e => e.sets).length,
      volume: S.workouts.reduce((sum, w) => sum + H.workoutVolume(w), 0),
      brands: entries.map(e => e.hvBrand).filter(Boolean),
      bodyweight: S.bodyweight.map(b => b.w),
      restSec: S.restSec,
    }
  }

  it('opens with the same numbers it had', () => {
    expect(read(useStore.getState().S)).toEqual(facts)
  })

  it('keeps all of it through the next save', () => {
    useStore.getState().update(s => { s.restSec = facts.restSec + 1 })
    const again = JSON.parse(localStorage.getItem('gym_state_v1'))
    expect(read(again)).toEqual({ ...facts, restSec: facts.restSec + 1 })
  })

  it('draws History and Stats with its workouts in them', async () => {
    const History = (await import('../../views/History.jsx')).default
    const Stats = (await import('../../views/Stats.jsx')).default
    expect(render(<History />).textContent).toContain('Lower A')
    expect(render(<Stats />).textContent.length).toBeGreaterThan(0)
  })
})
