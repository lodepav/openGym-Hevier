// Hevy's Statistics page (hevier/DECISIONS.md D14; reference/SCREENS.md §6), opened from History:
// Profile's weekly chart (D135), the last 7 days as a week strip and a body map, then rows to the
// sets per muscle (views/MuscleSets.jsx), the monthly report (D23) and upstream's own statistics
// and structural balance, whole.
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { todayISO, DAYS } from '../../lib/format.js'
import BodyMap from '../../components/BodyMap.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar, { useBack } from '../components/PageBar.jsx'
import { lastDays, WEEK_HEAT } from '../lib/muscle-sets.js'
import { muscleMode } from '../lib/volume.js'
import { countedS } from '../../lib/counted-log.js'
import { usePhasedS } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { entryTimes } from '../lib/exercise-time.js'
import { partOn } from '../lib/module-parts.js'
import { isOn } from '../../lib/modules.js'
import WeeklyChart from '../components/WeeklyChart.jsx'
import { HISTORY_PATH } from './History.jsx'

const hasTimes = w => entryTimes(w).length > 0

/** The page bar of a fork page under a tab: ‹ back to `to` (named `label`) and the page's title. */
export function BackTo({ label, to, title, children }) {
  return <PageBar title={title} onBack={useBack(to)} backLabel={label}>{children}</PageBar>
}

export function LinkRow({ icon, title, sub, onClick }) {
  return <button type="button" className="card hv-linkrow" onClick={onClick}>
    <Icon name={icon} />
    <span className="hv-linkrow-t"><b>{title}</b>{sub && <span className="hv-sub">{sub}</span>}</span>
    <Icon name="chevronRight" />
  </button>
}

function LastSevenDays({ S, today }) {
  const { days, workouts, load } = lastDays(S.workouts, today, 7, muscleMode(S))
  return <div className="card">
    <h2>{t('Last 7 days body graph')}</h2>
    <div className="hv-week">{days.map(d => <div key={d.d} className={'hv-day' + (d.trained ? ' on' : '') + (d.d === today ? ' today' : '')}>
      <span>{t(DAYS[new Date(d.d + 'T12:00:00').getDay()])}</span><b>{Number(d.d.slice(8))}</b>
    </div>)}</div>
    {workouts.length
      ? <BodyMap load={load} thresholds={WEEK_HEAT} body={S.body} />
      : <div className="muted small">{t('No workouts in the last 7 days.')}</div>}
  </div>
}

export default function Statistics() {
  const nav = useNavigate()
  const { search } = useLocation()
  // Exercises kept out of progression are kept out of these numbers too (D57).
  const S = usePhasedS(countedS(useStore(s => s.S)))
  const today = todayISO()
  // Upstream links into its own statistics with ?focus=… (Plan's weekly muscle volume row).
  if (/[?&]focus=/.test(search)) return <Navigate to={'/stats/all' + search} replace />
  return <div className="narrow hv-statpage">
    <BackTo label={t('History')} to={HISTORY_PATH} title={t('Statistics')} />
    {/* D135: the weekly chart of hours left the History tab for here; it reads the whole log. */}
    <div className="card hv-weekchart"><WeeklyChart /></div>
    <PhaseFilter />
    <LastSevenDays S={S} today={today} />
    <h2 className="sec">{t('More')}</h2>
    <LinkRow icon="figureStrength" title={t('Sets per muscle')} sub={t('By week, month or year, and against your weekly range')} onClick={() => nav('/muscle-sets')} />
    {partOn(S, 'hvStats', 'report') && S.workouts.length > 0 && <LinkRow icon="calendar" title={t('Monthly report')} sub={t('Your month against the one before')} onClick={() => nav('/report')} />}
    {partOn(S, 'hvStats', 'levels') && isOn(S, 'strength') && S.hvStrength && Object.keys(S.hvStrength).length > 0 && <LinkRow icon="trophy" title={t('Strength levels')} sub={t('Your exercises by the level they reach')} onClick={() => nav('/strength')} />}
    {partOn(S, 'hvStats', 'time') && S.workouts.some(hasTimes) && <LinkRow icon="timer" title={t('Exercise time')} sub={t('How long each exercise takes')} onClick={() => nav('/exercise-time')} />}
    {partOn(S, 'hvStats', 'trends') && S.workouts.length > 0 && <LinkRow icon="chartLine" title={t('Lift trends')} sub={t('Which lifts are rising, holding or falling')} onClick={() => nav('/lift-trends')} />}
    <LinkRow icon="chart" title={t('All statistics')} sub={t('Muscle balance, activity, effort, exercise progress')} onClick={() => nav('/stats/all')} />
    {S.workouts.length > 0 && <LinkRow icon="target" title={t('Structural balance')} sub={t('See which lift is holding back the rest.')} onClick={() => nav('/structural-balance')} />}
  </div>
}
