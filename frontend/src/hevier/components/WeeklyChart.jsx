// Hevy's Profile chart (reference/SCREENS.md §5): the last 12 weeks as bars, switched between
// Duration · Volume · Reps. Values come from hevier/lib/weekly-series.js.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, fmtDur, todayISO, weekStartOf } from '../../lib/format.js'
import { weeklySeries, SERIES } from '../lib/weekly-series.js'

const LABEL = { duration: 'Duration', volume: 'Volume', reps: 'Reps' }
const HOUR = 3600000

export default function WeeklyChart() {
  const S = useStore(s => s.S)
  const [kind, setKind] = useState('duration')
  const pts = weeklySeries(S.workouts, kind, { today: todayISO(), weekStart: weekStartOf(S) })
  const max = Math.max(...pts.map(p => p.value), kind === 'duration' ? HOUR : 1)
  const fmt = v => (kind === 'duration' ? (v ? fmtDur(v) : '0') : kind === 'volume' ? fmtNum(Math.round(v)) + ' ' + S.unit : fmtNum(v))
  const cur = pts.at(-1).value
  const head = kind === 'duration' ? t('{0} this week', cur ? fmtDur(cur) : '0 min') : t('{0} this week', fmt(cur))
  return <div className="hv-chart">
    <div className="hv-chart-h"><b>{head}</b><span className="hv-sub">{t('Last 12 weeks')}</span></div>
    <div className="hv-bars" role="img" aria-label={t(LABEL[kind])}>
      {pts.map(p => <div key={p.week} className="hv-barcol" title={p.week + ': ' + fmt(p.value)}>
        <i style={{ height: Math.round((p.value / max) * 100) + '%' }} className={p.value ? '' : 'zero'} />
      </div>)}
    </div>
    <div className="hv-chips">{SERIES.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(LABEL[k])}</button>)}</div>
  </div>
}
