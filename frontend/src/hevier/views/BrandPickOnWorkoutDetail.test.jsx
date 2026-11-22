// @vitest-environment happy-dom
// Repro (2026-11-22): History > a workout > an exercise > Brand menu > a brand. The picker sheet
// closes with history.go(-1) onto the exercise sheet's own history entry (Modals.jsx), whose state
// has no router `usr`, so Workout Detail gets a location without `state.ref`: it renders Gone, whose
// nav(-1) spends the exercise sheet's entry too. On the phone that closes the exercise sheet.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { bindUI } from '../../components/ui.jsx'
import Modals from '../../components/Modals.jsx'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { setNav, nav } from '../../lib/nav.js'
import { workoutDetailSheet } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { installWorkoutDetail, DETAIL_PATH } from './WorkoutDetail.jsx'
import { installExerciseDetails } from './ExerciseDetails.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
bindUI(useUI)
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell bench press/i.test(e.n) && modeOf({ id: e.id }) === 'reps')
const when = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const session = (id, n, brand, w) => ({ id, d: when(n), name: id, start: Date.now() - n * 86400000, end: Date.now() - n * 86400000 + 3600000,
  entries: [{ id: EX.id, hvBrand: brand, sets: [{ w, r: 8, done: true }] }] })
const LOG = [session('s1', 3, 'Technogym', 50), session('s2', 5, 'Hammer', 70), session('s3', 7, 'Technogym', 60)]

let root, el, path
let lost = 0   // renders of Workout Detail's path without its workout ref
function Bridge() { setNav(useNavigate()); const l = useLocation(); path = l.pathname; if (path === DETAIL_PATH && !l.state?.ref) lost++; return null }
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 30)) })

beforeEach(async () => {
  useUI.setState({ sheets: [] }); lost = 0
  installWorkoutDetail(); installExerciseDetails()
  const S = clone(DEF); S.workouts = clone(LOG)
  useStore.setState({ S, user: null })
  history.replaceState(null, '', '#/home')
  el = document.createElement('div'); document.body.appendChild(el)
  root = createRoot(el)
  await act(async () => {
    root.render(<HashRouter><Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><Bridge /><Modals /></HashRouter>)
  })
  await act(async () => { nav('/history') })
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  el.remove()
  useUI.setState({ sheets: [] })
  hooks.workoutDetail = null; hooks.exerciseDetail = null
})

describe('hevier: a brand picked in exercise details opened from Workout Detail', () => {
  it('applies the brand and keeps the sheet and the page', async () => {
    await act(async () => { workoutDetailSheet(LOG[0]) })
    expect(path).toBe(DETAIL_PATH)
    await act(async () => { el.querySelector('.hv-name').click() })
    await settle()
    expect(useUI.getState().sheets).toHaveLength(1)
    await act(async () => { document.querySelector('#modal-root .hv-xd-labels .menu-btn').click() })
    await settle()
    expect(useUI.getState().sheets).toHaveLength(2)
    const pick = [...document.querySelectorAll('#modal-root button.lrow')].find(b => b.querySelector('.lrow-t')?.textContent === 'Technogym (2)')
    await act(async () => { pick.click() })
    await settle()
    expect(lost).toBe(0)
    // The exercise sheet still sits on its own history entry, so back closes it, not the page.
    expect(history.state?.openGymSheet).toBe(true)
    expect(path).toBe(DETAIL_PATH)
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(document.querySelector('#modal-root .hv-xd-labels .menu-btn').textContent).toBe('Technogym (2)')
  })
})
