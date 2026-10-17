// Hevy's bottom tabs (hevier/DECISIONS.md D11; reference/SCREENS.md §0): Home · Workout · Profile,
// no Coach. A session you stepped away from rides above the tabs as a "Workout in progress" bar
// that takes you back to it — the same rule upstream's Start/Resume button uses (TabBar.jsx) — or
// discards it.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { confirmSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import Elapsed from './Elapsed.jsx'
import { SAVE_PATH } from '../hooks.js'
import { useConnectionTrouble } from '../../components/SyncBanner.jsx'

// Which tab an upstream route belongs to now that it is reached from a fork screen.
const TAB_OF = {
  home: 'home', checkin: 'home',
  workout: 'workout', routines: 'workout', plan: 'workout',
  profile: 'profile', stats: 'profile', history: 'profile', library: 'profile', muscles: 'profile',
  'structural-balance': 'profile', 'progress-photos': 'profile', measurements: 'profile', measures: 'profile', settings: 'profile',
  calendar: 'profile', report: 'profile',
}
export const tabOf = path => TAB_OF[path.split('/')[1] || 'home'] || null

function Tab({ active, icon, label, onClick, dot }) {
  return <button className={active ? 'on' : ''} onClick={onClick} aria-current={active ? 'page' : undefined}
    aria-label={dot ? label + ', ' + t('Connection problem') : undefined}>
    <span className="tab-ic"><Icon name={icon} />{dot && <span className="tab-dot" aria-hidden="true" />}</span><span>{label}</span>
  </button>
}

export default function HevyTabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const A = useStore(s => s.S.active)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const trouble = useConnectionTrouble()
  // A page reached from more than one tab (a workout's details) keeps the tab you came from.
  const last = useRef('home')
  const tab = tabOf(loc.pathname) || last.current
  last.current = tab
  // Upstream's condition for a live session away from its screen; a saved workout being edited
  // or one logged after the fact has no clock, and resumes through the Workout tab instead.
  const running = !!A && !A.editingWorkoutId && !A.backfill && A.start > 0
  // The Save Workout page belongs to the session, like its own screen.
  const pending = !!A && loc.pathname !== '/workout' && loc.pathname !== SAVE_PATH
  useEffect(() => {
    document.body.classList.toggle('hv-resume', pending)
    return () => document.body.classList.remove('hv-resume')
  }, [pending])
  if (!user && !isGuest) return null
  // Upstream's own discard (views/Workout.jsx discardWorkout), from outside the workout screen.
  const discard = () => confirmSheet({
    title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true,
    onConfirm: () => {
      useStore.getState().update(s => { s.active = null })
      useUI.getState().stopRest()
      useUI.getState().stopWork()
    },
  })

  return <nav id="tabbar" className="hv-tabbar">
    {pending && <div className="hv-resumebar">
      <button type="button" className="hv-resume-main" onClick={() => nav('/workout')}>
        <span className="hv-resume-t">{A.editingWorkoutId ? t('Editing workout') : t('Workout in progress')}</span>
        <span className={'hv-resume-s' + (running ? ' tm' : '')}>{running ? <Elapsed start={A.start} /> : A.name}</span>
      </button>
      <button type="button" className="hv-resume-go" onClick={() => nav('/workout')}><Icon name="play" />{A.editingWorkoutId ? t('Edit') : t('Resume')}</button>
      {!A.editingWorkoutId && <button type="button" className="hv-resume-x" onClick={discard}><Icon name="xmark" />{t('Discard')}</button>}
    </div>}
    <Tab active={tab === 'home'} icon="house" label={t('Home')} dot={trouble} onClick={() => nav('/home')} />
    {/* with a session open the tab is still the start screen, its bar above the tabs (D13) */}
    <Tab active={tab === 'workout'} icon="dumbbell" label={t('Workout')} onClick={() => nav(A ? '/routines' : '/workout')} />
    <Tab active={tab === 'profile'} icon="person" label={t('Profile')} onClick={() => nav('/profile')} />
  </nav>
}
