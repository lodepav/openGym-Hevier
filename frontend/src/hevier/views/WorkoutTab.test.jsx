// @vitest-environment happy-dom
// The Workout tab's routines (hevier/DECISIONS.md D13): folders, Move to folder, drag handles.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'
import { FOLDERS_KEY } from '../lib/routine-folders.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const R = (id, folder) => ({ id, name: 'R ' + id, emoji: 'dumbbell', ex: [{ id: EX, sets: 3, reps: 8, weight: 0 }], ...(folder ? { folder } : {}) })
let root, container

function render(routines) {
  const S = Object.assign(clone(DEF), { weighIn: false, routines })
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/workout']}><Routes>{hevierRoutes}</Routes></MemoryRouter>))
}
const ids = () => useStore.getState().S.routines.map(r => r.id)
const heads = () => [...container.querySelectorAll('.hv-ftoggle')].map(b => b.textContent)
// Renders the top sheet with its own act, so call it outside another act.
const sheet = () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  act(() => createRoot(host).render(useUI.getState().sheets.at(-1).render(() => {})))
  return host
}
const item = (host, text) => [...host.querySelectorAll('.menu-item')].find(m => m.textContent.includes(text))
const key = (el, k) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})

describe('hevier: routine folders and reordering', () => {
  it('shows My Routines, then each folder in the order of its first routine', () => {
    render([R('a'), R('p1', 'Push'), R('l1', 'Legs'), R('p2', 'Push')])
    expect(heads()).toEqual(['My Routines (1)', 'Push (2)', 'Legs (1)'])
  })

  it('⋯ → Move to folder puts a routine in a folder, on the routine itself', () => {
    render([R('a'), R('b'), R('p1', 'Push')])
    act(() => container.querySelector('.hv-rcard .iconbtn').click())
    const menu = sheet()
    act(() => item(menu, 'Move to folder').click())
    const folders = sheet()
    act(() => item(folders, 'Push').click())
    expect(useStore.getState().S.routines.find(r => r.id === 'a').folder).toBe('Push')
    expect(heads()).toEqual(['My Routines (1)', 'Push (2)'])
  })

  it('a new folder stays on this device until a routine goes into it', () => {
    render([R('a')])
    act(() => container.querySelector('[aria-label="New folder"]').click())
    const host = sheet()
    const input = host.querySelector('input')
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Arms')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(JSON.parse(localStorage.getItem(FOLDERS_KEY))).toEqual(['Arms'])
    expect(heads()).toEqual(['My Routines (1)', 'Arms (0)'])
    expect(useStore.getState().S.routines[0]).not.toHaveProperty('folder')
  })

  it('a routine’s handle reorders it inside its folder', () => {
    render([R('p1', 'Push'), R('a'), R('p2', 'Push')])
    const pushGrips = container.querySelectorAll('.hv-folders .hv-rcard .hv-grip')
    key(pushGrips[0], 'ArrowDown')
    expect(ids()).toEqual(['p2', 'a', 'p1'])
  })

  it('a folder’s handle moves the folder and its routines as a block', () => {
    render([R('p1', 'Push'), R('l1', 'Legs'), R('p2', 'Push')])
    key(container.querySelector('.hv-fhead .hv-grip'), 'ArrowDown')
    expect(heads()).toEqual(['My Routines (0)', 'Legs (1)', 'Push (2)'])
    expect(ids()).toEqual(['l1', 'p1', 'p2'])
  })

  it('folds a folder shut and remembers it on this device', () => {
    render([R('p1', 'Push')])
    act(() => [...container.querySelectorAll('.hv-ftoggle')][1].click())
    expect(container.querySelectorAll('.hv-rcard').length).toBe(0)
    expect(JSON.parse(localStorage.getItem('hevier_folders_closed'))).toEqual(['Push'])
  })

  it('deleting a folder keeps its routines', () => {
    render([R('p1', 'Push')])
    act(() => container.querySelector('.hv-folders .hv-fhead .iconbtn').click())
    const menu = sheet()
    act(() => item(menu, 'Delete folder').click())
    expect(useStore.getState().S.routines[0]).not.toHaveProperty('folder')
    expect(ids()).toEqual(['p1'])
  })
})
