// The History tab (hevier/DECISIONS.md D126, D135, D142): one row of ways into the statistics (this
// week's numbers are on Statistics and Today, the critique 2026-11-20), then the phase filter and every workout as a feed card (D14's feed, unchanged).
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, tn } from '../../lib/i18n.js'
import { DEMO } from '../../lib/demo.js'
import { historyRows } from '../../views/History.jsx'
import { monthName, monthLabel } from '../../lib/month-story.js'
import { todayISO } from '../../lib/format.js'
import { monthHeads } from '../lib/history-months.js'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { SettingsGear } from './Today.jsx'
import { usePhasedS } from '../lib/shared-phase-run.js'
import { partOn } from '../lib/module-parts.js'

// "November · 3 workouts", the year too when it is not this one.
const monthHead = ({ ym, n }) => (ym.slice(0, 4) === todayISO().slice(0, 4) ? monthName(ym) : monthLabel(ym))
  + ' · ' + tn('{0} workout', '{0} workouts', n)

export const HISTORY_PATH = '/history-tab'
export const PAGE = 10

export function WorkoutFeed({ S }) {
  const nav = useNavigate()
  const [n, setN] = useState(PAGE)
  const ws = historyRows(usePhasedS(S)).filter(r => r.w).map(r => r.w)   // D93
  const heads = monthHeads(ws)
  if (!ws.length) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet. Your first one will land here.')}
    {!DEMO && <><br /><button type="button" className="hv-link hv-empty-import" onClick={() => nav('/settings/integrations')}>{t('Import from Hevy')}</button></>}</div>
  return <>
    <PhaseFilter />
    {ws.slice(0, n).map((w, i) => <Fragment key={w.id || w.start}>
      {heads.has(i) && <h3 className="hv-cap hv-hmonth">{monthHead(heads.get(i))}</h3>}
      <WorkoutCard w={w} />
    </Fragment>)}
    {ws.length > n && <button type="button" className="btn hv-moreb" onClick={() => setN(n + PAGE)}>{t('Show more')}</button>}
  </>
}

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  // Each chip goes with the module part its page goes with; one row (D142), the rest is on Statistics.
  const chips = [
    partOn(S, 'hvStats', 'calendar') && ['Calendar', () => nav('/calendar')],
    partOn(S, 'hvStats', 'report') && ['Monthly report', () => nav('/report')],
    ['Statistics', () => nav('/stats')],
  ].filter(Boolean)
  return <div className="narrow hv-history">
    <PageBar title={t('History')}><SettingsGear /></PageBar>
    <div className="hv-hgroup">
      <span className="hv-cap">{t('Look back')}</span>
      <div className="hv-chips hv-hlinks">{chips.map(([label, go]) => <button key={label} type="button" className="hv-chip" onClick={go}>{t(label)}</button>)}</div>
    </div>
    <WorkoutFeed S={S} />
  </div>
}
