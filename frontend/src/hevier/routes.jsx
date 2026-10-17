// The fork's screens, reached through seam S2 (frontend/src/App.jsx). The routes are placed
// before upstream's own, and React Router gives an exact tie to the first one, so a fork route
// replaces upstream's same path without its line being touched.
import { Route, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Workout from '../views/Workout.jsx'
import Stats from '../views/Stats.jsx'
import Measurements from '../views/Measurements.jsx'
import ProgressPhotos from '../views/ProgressPhotos.jsx'
import StructuralBalance from '../views/StructuralBalance.jsx'
import Icon from '../components/Icon.jsx'
import HevyHome from './views/HevyHome.jsx'
import WorkoutTab from './views/WorkoutTab.jsx'
import Profile from './views/Profile.jsx'
import Statistics from './views/Statistics.jsx'
import Measures from './views/Measures.jsx'
import RoutineEditHevy from './views/RoutineEditHevy.jsx'
import RoutinePreview from './views/RoutinePreview.jsx'
import { SaveWorkout, WorkoutDone } from './views/SaveWorkout.jsx'
import { hooks, SAVE_PATH, DONE_PATH } from './hooks.js'
import HevyTabBar from './components/HevyTabBar.jsx'
import { installExerciseDetails } from './views/ExerciseDetails.jsx'
import { installSettings } from './views/SettingsRootHevy.jsx'
import { installExercisePicker, Exercises } from './views/ExercisePickerHevy.jsx'
import { WorkoutDetail, DETAIL_PATH, installWorkoutDetail } from './views/WorkoutDetail.jsx'
import Calendar from './views/Calendar.jsx'
import MonthReport from './views/MonthReport.jsx'
import { atTabRoot } from './lib/back-root.js'
import { HEVIER } from './flag.js'

// Every exercise's details open the fork's tabbed sheet (seam S10), a finished workout the fork's
// Workout Detail page (S14), every exercise picker the fork's Hevy picker (S13), and Settings is
// regrouped (S11, S12). Installed here rather than in
// ./index.js because App imports this module after sheets.jsx, which they are built from.
if (HEVIER) { installExerciseDetails(); installExercisePicker(); installWorkoutDetail(); installSettings() }
// Android back on a tab screen offers to exit (seam S16). The path is the HashRouter's.
if (HEVIER) hooks.backEvent = ev =>
  atTabRoot(ev, (location.hash.slice(1) || '/').split('?')[0], !!useStore.getState().S.active, window.history.state?.idx || 0)

// /workout is the Workout tab until a session opens, then upstream's screen (seam S3).
function WorkoutRoute() {
  const active = useStore(s => !!s.S.active)
  return active ? <Workout /> : <WorkoutTab />
}

// Upstream's Stats was a tab and has no way back; in the fork it opens from Statistics, so it gets
// a back row above its own header.
function WithBack({ label = 'Profile', to = '/profile', children }) {
  const nav = useNavigate()
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav(to))
  return <>
    <button type="button" className="hv-back" onClick={back}><Icon name="chevronLeft" /><span>{t(label)}</span></button>
    {children}
  </>
}

// Upstream's Measurements, Progress photos and Structural balance have their own ‹ in the header,
// hard-wired to /home or /stats. In the fork they open from Statistics or Measures, so that ‹
// goes back where the user came from instead. Caught before upstream's handler, which is left as is.
function BackWhereFrom({ to, children }) {
  const nav = useNavigate()
  const catchBack = e => {
    const b = e.target.closest?.('button')
    const hdr = b?.parentElement
    if (!b || !hdr?.classList.contains('hdr') || hdr.firstElementChild !== b || !b.classList.contains('iconbtn')) return
    e.preventDefault()
    e.stopPropagation()
    if (window.history.state?.idx > 0) nav(-1)
    else nav(to, { replace: true })
  }
  return <div onClickCapture={catchBack}>{children}</div>
}

export const hevierRoutes = [
  <Route key="hv-home" path="/home" element={<HevyHome />} />,
  <Route key="hv-workout" path="/workout" element={<WorkoutRoute />} />,
  <Route key="hv-routines" path="/routines" element={<WorkoutTab />} />,
  <Route key="hv-profile" path="/profile" element={<Profile />} />,
  <Route key="hv-stats" path="/stats" element={<Statistics />} />,
  <Route key="hv-stats-all" path="/stats/all" element={<WithBack label="Statistics" to="/stats"><Stats /></WithBack>} />,
  <Route key="hv-measures" path="/measures" element={<Measures />} />,
  <Route key="hv-measurements" path="/measurements" element={<BackWhereFrom to="/measures"><Measurements /></BackWhereFrom>} />,
  <Route key="hv-photos" path="/progress-photos" element={<BackWhereFrom to="/measures"><ProgressPhotos /></BackWhereFrom>} />,
  <Route key="hv-balance" path="/structural-balance" element={<BackWhereFrom to="/stats"><StructuralBalance /></BackWhereFrom>} />,
  <Route key="hv-library" path="/library" element={<Exercises />} />,
  <Route key="hv-calendar" path="/calendar" element={<Calendar />} />,
  <Route key="hv-report" path="/report" element={<MonthReport />} />,
  <Route key="hv-routine" path="/plan/r/:id" element={<RoutineEditHevy />} />,
  <Route key="hv-routine-view" path="/plan/r/:id/view" element={<RoutinePreview />} />,
  <Route key="hv-save" path={SAVE_PATH} element={<SaveWorkout />} />,
  <Route key="hv-done" path={DONE_PATH} element={<WorkoutDone />} />,
  <Route key="hv-detail" path={DETAIL_PATH} element={<WorkoutDetail />} />,
]

export { HevyTabBar }
