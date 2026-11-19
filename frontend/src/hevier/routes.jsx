// The fork's screens, reached through seam S2 (frontend/src/App.jsx). The routes are placed
// before upstream's own, and React Router gives an exact tie to the first one, so a fork route
// replaces upstream's same path without its line being touched.
import { useEffect, useState } from 'react'
import { Navigate, Route, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Workout from '../views/Workout.jsx'
import Stats from '../views/Stats.jsx'
import Measurements from '../views/Measurements.jsx'
import ProgressPhotos from '../views/ProgressPhotos.jsx'
import StructuralBalance from '../views/StructuralBalance.jsx'
import PhaseFilter from './components/PhaseFilter.jsx'
import Plan from '../views/Plan.jsx'
import Icon from '../components/Icon.jsx'
import PageBar, { useBack } from './components/PageBar.jsx'
import Today from './views/Today.jsx'
import Lifts from './views/Lifts.jsx'
import History, { HISTORY_PATH } from './views/History.jsx'
import WorkoutTab from './views/WorkoutTab.jsx'
import Statistics from './views/Statistics.jsx'
import ArrangeStats from './views/ArrangeStats.jsx'
import Measures from './views/Measures.jsx'
import RoutineEditHevy from './views/RoutineEditHevy.jsx'
import RoutinePreview from './views/RoutinePreview.jsx'
import { hooks } from './hooks.js'
import { installFinishHook } from './components/FinishSheet.jsx'
import { nav } from '../lib/nav.js'
import HevyTabBar from './components/HevyTabBar.jsx'
import { installExerciseDetails } from './views/ExerciseDetails.jsx'
import { installSettings } from './views/SettingsRootHevy.jsx'
import Muscles from '../views/Muscles.jsx'
import { installExercisePicker, Exercises } from './views/ExercisePickerHevy.jsx'
import { WorkoutDetail, DETAIL_PATH, installWorkoutDetail } from './views/WorkoutDetail.jsx'
import Calendar from './views/Calendar.jsx'
import MonthReport from './views/MonthReport.jsx'
import StrengthLevels from './views/StrengthLevels.jsx'
import ExerciseTime from './views/ExerciseTime.jsx'
import { atTabRoot, backPath } from './lib/back-root.js'
import { HEVIER } from './flag.js'

// Every exercise's details open the fork's exercise page (seam S10), a finished workout the fork's
// Workout Detail page (S14), every exercise picker the fork's Hevy picker (S13), Settings is
// regrouped (S11, S12), and Finish opens the fork's Finish sheet (S9). Installed here rather than in
// ./index.js because App imports this module after sheets.jsx, which they are built from.
if (HEVIER) { installExerciseDetails(); installExercisePicker(); installWorkoutDetail(); installSettings(); installFinishHook(nav) }
// Android back on a tab screen offers to exit (seam S16). The path is the HashRouter's.
if (HEVIER) hooks.backPath = backPath
if (HEVIER) hooks.backEvent = ev =>
  atTabRoot(ev, (location.hash.slice(1) || '/').split('?')[0], window.history.state?.idx || 0)

// /workout is upstream's screen while a session is open (seam S3); without one it goes to Today (D126).
function WorkoutRoute() {
  const active = useStore(s => !!s.S.active)
  const nav = useNavigate()
  const [opened] = useState(active)
  // A session ending here mostly navigates itself (Save, an edit's ✕): Today waits a tick for that,
  // so it only catches one that ended without (on another device).
  useEffect(() => {
    if (active || !opened) return
    const id = setTimeout(() => nav('/home', { replace: true }))
    return () => clearTimeout(id)
  }, [active, opened, nav])
  return active ? <Workout /> : opened ? null : <Navigate to="/home" replace />
}

// Upstream's Stats was a tab and has no way back; in the fork it opens from Statistics as All
// statistics, so it gets the fork's page bar (D49) with upstream's History button, and its own
// "Stats / Progress & history" header is hidden (hevier.css).
function WithBack({ label, to, title, children }) {
  const nav = useNavigate()
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav(to))
  return <>
    <PageBar title={t(title)} onBack={back} backLabel={t(label)} className="hv-allstats">
      <button type="button" className="iconbtn" aria-label={t('History')} onClick={() => nav('/history')}><Icon name="history" /></button>
    </PageBar>
    {children}
  </>
}

// Upstream's Plan (the Workout tab's Schedule) had no way back: the fork's page bar goes over it,
// and its own "Plan" heading is hidden, its subtitle and Plan options kept (hevier.css).
// Upstream's links into one part of its Stats (1.4.4: `/stats?section=lifts`, Plan's
// `/stats?focus=weekly-volume`) open upstream's page, the fork's All statistics, on that part; the
// fork's own Statistics page is `/stats` without them.
function StatsEntry() {
  const { search } = useLocation()
  return /[?&](section|focus)=/.test(search) ? <Navigate to={'/stats/all' + search} replace /> : <Statistics />
}

function PlanPage() {
  return <>
    <PageBar title={t('Plan')} onBack={useBack('/routines')} backLabel={t('Routines')} className="hv-planbar" />
    <Plan />
  </>
}

// Upstream's Measurements, Progress photos and Structural balance have their own ‹ in the header,
// hard-wired to /home or /stats. In the fork they open from Statistics or Measures, so that ‹
// goes back where the user came from instead. Caught before upstream's handler, which is left as is.
function BackWhereFrom({ to, className, children }) {
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
  return <div className={className} onClickCapture={catchBack}>{children}</div>
}

export const hevierRoutes = [
  <Route key="hv-home" path="/home" element={<Today />} />,
  <Route key="hv-lifts" path="/lifts" element={<Lifts />} />,
  <Route key="hv-history" path={HISTORY_PATH} element={<History />} />,
  <Route key="hv-workout" path="/workout" element={<WorkoutRoute />} />,
  <Route key="hv-routines" path="/routines" element={<WorkoutTab />} />,
  // D126: Profile's place is the History tab.
  <Route key="hv-profile" path="/profile" element={<Navigate to={HISTORY_PATH} replace />} />,
  <Route key="hv-stats" path="/stats" element={<StatsEntry />} />,
  // D142: Sets per muscle is a card on Statistics now; an old link to its page lands there.
  <Route key="hv-muscle-sets" path="/muscle-sets" element={<Navigate to="/stats" replace />} />,
  <Route key="hv-stats-arrange" path="/stats/arrange" element={<ArrangeStats />} />,
  // D102: a module's parts unfold on Modules now; an old link to a module's own page lands there.
  <Route key="hv-module-parts" path="/settings/modules/:mod" element={<Navigate to="/settings/modules" replace />} />,
  <Route key="hv-stats-all" path="/stats/all" element={<WithBack label="Statistics" to="/stats" title="All statistics"><PhaseFilter /><Stats /></WithBack>} />,
  <Route key="hv-measures" path="/measures" element={<Measures />} />,
  <Route key="hv-measurements" path="/measurements" element={<BackWhereFrom to="/measures"><Measurements /></BackWhereFrom>} />,
  <Route key="hv-photos" path="/progress-photos" element={<BackWhereFrom to="/measures"><ProgressPhotos /></BackWhereFrom>} />,
  <Route key="hv-balance" path="/structural-balance" element={<BackWhereFrom to="/stats" className="hv-phase-page"><PhaseFilter /><StructuralBalance /></BackWhereFrom>} />,
  <Route key="hv-library" path="/library" element={<Exercises />} />,
  // Upstream's explorer goes "back" by opening /library anew, so Exercises' back led to it again.
  <Route key="hv-muscles" path="/muscles" element={<BackWhereFrom to="/library"><Muscles /></BackWhereFrom>} />,
  <Route key="hv-calendar" path="/calendar" element={<Calendar />} />,
  <Route key="hv-report" path="/report" element={<MonthReport />} />,
  <Route key="hv-strength" path="/strength" element={<StrengthLevels />} />,
  <Route key="hv-extime" path="/exercise-time" element={<ExerciseTime />} />,
  <Route key="hv-plan" path="/plan" element={<PlanPage />} />,
  <Route key="hv-routine" path="/plan/r/:id" element={<RoutineEditHevy />} />,
  <Route key="hv-routine-view" path="/plan/r/:id/view" element={<RoutinePreview />} />,
  <Route key="hv-detail" path={DETAIL_PATH} element={<WorkoutDetail />} />,
]

export { HevyTabBar }
