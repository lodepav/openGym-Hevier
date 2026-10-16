// The fork's screens, reached through seam S2 (frontend/src/App.jsx). The routes are placed
// before upstream's own, and React Router gives an exact tie to the first one, so a fork route
// replaces upstream's same path without its line being touched.
import { Route } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import Workout from '../views/Workout.jsx'
import HevyHome from './views/HevyHome.jsx'
import WorkoutTab from './views/WorkoutTab.jsx'
import Profile from './views/Profile.jsx'
import HevyTabBar from './components/HevyTabBar.jsx'

// /workout is the Workout tab until a session opens, then upstream's screen (seam S3).
function WorkoutRoute() {
  const active = useStore(s => !!s.S.active)
  return active ? <Workout /> : <WorkoutTab />
}

export const hevierRoutes = [
  <Route key="hv-home" path="/home" element={<HevyHome />} />,
  <Route key="hv-workout" path="/workout" element={<WorkoutRoute />} />,
  <Route key="hv-profile" path="/profile" element={<Profile />} />,
]

export { HevyTabBar }
