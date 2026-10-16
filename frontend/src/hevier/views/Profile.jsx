// Hevy's Profile tab (hevier/DECISIONS.md D14; reference/SCREENS.md §5): name and workout count,
// the weekly chart, a 2×2 dashboard into upstream's screens, then every workout as a feed card.
// ⚙ opens upstream's Settings.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { historyRows } from '../../views/History.jsx'
import { useConnectionTrouble } from '../../components/SyncBanner.jsx'
import Icon from '../../components/Icon.jsx'
import WeeklyChart from '../components/WeeklyChart.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'

export const PAGE = 10

export function WorkoutFeed({ S }) {
  const [n, setN] = useState(PAGE)
  const ws = historyRows(S).filter(r => r.w).map(r => r.w)
  if (!ws.length) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet. Your first one will land here.')}</div>
  return <>
    {ws.slice(0, n).map(w => <WorkoutCard key={w.id || w.start} w={w} />)}
    {ws.length > n && <button type="button" className="btn hv-moreb" onClick={() => setN(n + PAGE)}>{t('Show more')}</button>}
  </>
}

export default function Profile() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const trouble = useConnectionTrouble()
  const tile = (icon, label, onClick) => <button type="button" className="btn hv-tile" onClick={onClick}><Icon name={icon} />{label}</button>
  return <div className="narrow hv-profile">
    <div className="hdr">
      <div><h1>{user?.name || t('Profile')}</h1><div className="sub">{t('Workouts')} {S.workouts.length}</div></div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}>
        <Icon name="gear" />{trouble && <span className="tab-dot" aria-hidden="true" />}</button>
    </div>
    <div className="card"><WeeklyChart /></div>
    <h4 className="sec">{t('Dashboard')}</h4>
    <div className="hv-dash">
      {tile('chart', t('Statistics'), () => nav('/stats'))}
      {tile('dumbbell', t('Exercises'), () => nav('/library'))}
      {tile('ruler', t('Measures'), () => nav('/measures'))}
      {tile('calendar', t('Calendar'), () => nav('/calendar'))}
    </div>
    <h4 className="sec">{t('Workouts')}</h4>
    <WorkoutFeed S={S} />
  </div>
}
