// Hevy's Statistics page (hevier/DECISIONS.md D14; reference/SCREENS.md §6), opened from Profile:
// the last 7 days as a week strip and a body map, the set count per muscle group (week, month,
// year, against the one before), then the monthly report (D23) and upstream's own statistics and
// structural balance, whole.
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, todayISO, weekStartOf, DAYS } from '../../lib/format.js'
import { signed } from '../lib/delta.js'
import BodyMap from '../../components/BodyMap.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar, { useBack } from '../components/PageBar.jsx'
import { muscleSetCounts, lastDays, PERIODS } from '../lib/muscle-sets.js'
import { muscleMode } from '../lib/volume.js'
import { countedS } from '../lib/counted.js'

const PERIOD_LABEL = { week: 'Week', month: 'Month', year: 'Year' }
const SINCE = { week: 'vs last week', month: 'vs last month', year: 'vs last year' }

/** The page bar of a fork page under Profile: ‹ back to `to` (named `label`) and the page's title. */
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
  const { days, workouts, load } = lastDays(S.workouts, today, 7)
  return <div className="card">
    <h2>{t('Last 7 days body graph')}</h2>
    <div className="hv-week">{days.map(d => <div key={d.d} className={'hv-day' + (d.trained ? ' on' : '') + (d.d === today ? ' today' : '')}>
      <span>{t(DAYS[new Date(d.d + 'T12:00:00').getDay()])}</span><b>{Number(d.d.slice(8))}</b>
    </div>)}</div>
    {workouts.length
      ? <BodyMap load={load} body={S.body} />
      : <div className="muted small">{t('No workouts in the last 7 days.')}</div>}
  </div>
}

function SetCounts({ S, today }) {
  const [kind, setKind] = useState('week')
  const { rows } = muscleSetCounts(S.workouts, kind, { today, weekStart: weekStartOf(S), mode: muscleMode(S) })
  const max = Math.max(1, ...rows.map(r => r.sets))
  return <div className="card">
    <h2>{t('Set count per muscle group')}</h2>
    <div className="hv-chips">{PERIODS.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(PERIOD_LABEL[k])}</button>)}</div>
    {/* What the numbers count, under the chips where it is read first (review T1, T6). */}
    <div className="small dim hv-msets-cap">{t(muscleMode(S) === 'share' ? 'Work sets, a secondary muscle counted in part' : 'Work sets, each for its main muscle')} · {t(SINCE[kind])}</div>
    {rows.length ? <div className="hv-msets">{rows.map(r => {
      const d = signed(Math.round((r.sets - r.prev) * 10) / 10)
      return <div key={r.muscle} className="hv-mset">
        <span className="hv-mset-n">{t(r.muscle)}</span>
        <span className="hv-mset-bar"><i style={{ width: Math.round((r.sets / max) * 100) + '%' }} /></span>
        <b>{fmtNum(r.sets)}</b>
        <span className={'hv-mset-d' + (d ? (d.up ? ' up' : ' down') : '')}>{d?.text}</span>
      </div>
    })}
    </div> : <div className="muted small" style={{ marginTop: 10 }}>{t('No sets in this period yet.')}</div>}
  </div>
}

export default function Statistics() {
  const nav = useNavigate()
  const { search } = useLocation()
  // Exercises kept out of progression are kept out of these numbers too (D57).
  const S = countedS(useStore(s => s.S))
  const today = todayISO()
  // Upstream links into its own statistics with ?focus=… (Plan's weekly muscle volume row).
  if (/[?&]focus=/.test(search)) return <Navigate to={'/stats/all' + search} replace />
  return <div className="narrow hv-statpage">
    <BackTo label={t('Profile')} to="/profile" title={t('Statistics')} />
    <LastSevenDays S={S} today={today} />
    <SetCounts S={S} today={today} />
    <h4 className="sec">{t('More')}</h4>
    {S.workouts.length > 0 && <LinkRow icon="calendar" title={t('Monthly report')} sub={t('Your month against the one before')} onClick={() => nav('/report')} />}
    <LinkRow icon="chart" title={t('All statistics')} sub={t('Muscle balance, activity, effort, exercise progress')} onClick={() => nav('/stats/all')} />
    {S.workouts.length > 0 && <LinkRow icon="target" title={t('Structural balance')} sub={t('See which lift is holding back the rest.')} onClick={() => nav('/structural-balance')} />}
  </div>
}
