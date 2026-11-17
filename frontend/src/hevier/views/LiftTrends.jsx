// Profile → Statistics → Lift trends: each exercise of the last three weeks, Falling, Holding or
// Rising as D95 reads it (lib/lift-trends.js), with the change in its estimated 1RM over that time
// and the days since its last record. Falling first. A tap opens exercise details.
import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { BackTo } from './Statistics.jsx'
import TrendMark from '../components/TrendMark.jsx'
import { signed } from '../lib/delta.js'
import { partOn } from '../lib/module-parts.js'
import { liftTrends } from '../lib/lift-trends.js'
import { labelText } from '../lib/gym-labels.js'

const STATE = { falling: [-1, 'Falling'], holding: [0, 'Holding'], rising: [1, 'Rising'] }

const change = pct => (pct == null ? null : (signed(pct)?.text ?? '0') + '% ' + t('est. 1RM'))
function record(r) {
  if (r.recordDays != null) return r.recordDays === 0 ? t('record today') : r.recordDays === 1 ? t('record 1 day ago') : t('record {0} days ago', r.recordDays)
  return r.sinceDays > 0 ? t('no record in {0} days', r.sinceDays) : t('no record yet')
}

export default function LiftTrends() {
  const on = useStore(s => partOn(s.S, 'hvStats', 'trends'))
  return on ? <LiftTrendsPage /> : <Navigate to="/stats" replace />
}

function LiftTrendsPage() {
  const nav = useNavigate()
  const st = useStore(s => s.S)
  const rows = useMemo(() => liftTrends(st, todayISO()), [st])
  const records = partOn(st, 'motivation', 'records')
  // One row per machine label (D82): an exercise done on two names its label to tell them apart.
  const twice = new Set(rows.filter((r, i) => rows.findIndex(x => x.id === r.id) !== i).map(r => r.id))
  return <div className="narrow hv-statpage">
    <BackTo label={t('Statistics')} to="/stats" title={t('Lift trends')} />
    <div className="small dim">{t('The last 3 weeks, each session against the one before it.')}</div>
    {!rows.length && <>
      <div className="muted small" style={{ marginTop: 10 }}>{t('An exercise shows here once you have done it in two workouts of the last 3 weeks, each with a workout before it to compare with.')}</div>
      <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => nav('/lifts')}>{t('Open Lifts')}</button>
    </>}
    {rows.length > 0 && <div className="list">{rows.map(r => {
      const ex = exOr(r.id)
      const [v, word] = STATE[r.state]
      const sub = [change(r.pct), records ? record(r) : null].filter(Boolean).join(' · ')
      return <button key={r.id + '|' + r.key} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(ex)}>
        <span className="grow"><b className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</b>
          {twice.has(r.id) && <span className="small dim">{labelText({ brand: r.key.split('|')[0], cable: r.key.split('|')[1] }, t)}</span>}
          {sub && <span className="small dim">{sub}</span>}
        </span>
        <b className="hv-lift-state"><TrendMark v={v} hidden />{t(word)}</b>
      </button>
    })}</div>}
  </div>
}
