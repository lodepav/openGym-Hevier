// The fork's screens, reached through seam S2 (frontend/src/App.jsx). The routes are placed
// before upstream's own, and React Router gives an exact tie to the first one, so a fork route
// replaces upstream's same path without its line being touched.
import { Route, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Workout from '../views/Workout.jsx'
import Stats from '../views/Stats.jsx'
import Library from '../views/Library.jsx'
import Icon from '../components/Icon.jsx'
import HevyHome from './views/HevyHome.jsx'
import WorkoutTab from './views/WorkoutTab.jsx'
import Profile from './views/Profile.jsx'
import RoutineEditHevy from './views/RoutineEditHevy.jsx'
import { SaveWorkout, WorkoutDone } from './views/SaveWorkout.jsx'
import { SAVE_PATH, DONE_PATH } from './finish-hook.js'
import HevyTabBar from './components/HevyTabBar.jsx'

// /workout is the Workout tab until a session opens, then upstream's screen (seam S3).
function WorkoutRoute() {
  const active = useStore(s => !!s.S.active)
  return active ? <Workout /> : <WorkoutTab />
}

// Upstream's Stats and Exercises were tabs and have no way back; in the fork they open from
// Profile, so they get a back row above their own header.
function WithBack({ children }) {
  const nav = useNavigate()
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/profile'))
  return <>
    <button type="button" className="hv-back" onClick={back}><Icon name="chevronLeft" />{t('Profile')}</button>
    {children}
  </>
}

export const hevierRoutes = [
  <Route key="hv-home" path="/home" element={<HevyHome />} />,
  <Route key="hv-workout" path="/workout" element={<WorkoutRoute />} />,
  <Route key="hv-profile" path="/profile" element={<Profile />} />,
  <Route key="hv-stats" path="/stats" element={<WithBack><Stats /></WithBack>} />,
  <Route key="hv-library" path="/library" element={<WithBack><Library /></WithBack>} />,
  <Route key="hv-routine" path="/plan/r/:id" element={<RoutineEditHevy />} />,
  <Route key="hv-save" path={SAVE_PATH} element={<SaveWorkout />} />,
  <Route key="hv-done" path={DONE_PATH} element={<WorkoutDone />} />,
]

export { HevyTabBar }
