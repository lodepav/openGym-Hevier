// @vitest-environment happy-dom
// Profile's feed with no workout yet points to the Hevy import (Settings → Integrations).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
function Page() { return <div id="page">{useParams().page}</div> }

afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})

describe('hevier: the empty feed', () => {
  it('points to the Hevy import on Settings → Integrations', () => {
    useStore.setState({ S: Object.assign(JSON.parse(JSON.stringify(DEF)), { weighIn: false, workouts: [] }), user: null, isGuest: () => true })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<MemoryRouter initialEntries={['/profile']}><Routes>{hevierRoutes}
      <Route path="/settings/:page" element={<Page />} /></Routes></MemoryRouter>))
    expect(container.textContent).toContain('No workouts yet.')
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Import from Hevy').click())
    expect(container.querySelector('#page').textContent).toBe('integrations')
  })
})
