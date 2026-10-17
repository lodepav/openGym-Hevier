// Hevy's Profile chart (reference/SCREENS.md §5): the last 12 weeks as bars, switched between
// Duration · Volume · Reps. In sets mode (hevier/DECISIONS.md D18) Volume is Sets, and a tap on a
// week lists its sets per muscle. Values come from hevier/lib/weekly-series.js.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn } from '../../lib/i18n.js'
import { fmtNum, fmtDur, fmtDate, todayISO, weekStartOf } from '../../lib/format.js'
import { weeklySeries, SERIES, inWeek } from '../lib/weekly-series.js'
import { volumeMode, muscleMode, muscleSets } from '../lib/volume.js'

const LABEL = { duration: 'Duration', volume: 'Volume', sets: 'Sets', reps: 'Reps' }
const HOUR = 3600000

/** A week's sets per muscle, from a tap on its bar. */
function weekSheet(S, week) {
  const ws = (S.workouts || []).filter(w => inWeek(w, week, weekStartOf(S)))
  const list = muscleSets(ws.flatMap(w => w.entries || []), muscleMode(S))
  useUI.getState().openSheet(() => <>
    <h3>{t('Week of {0}', fmtDate(week, true))}</h3>
    {list.length ? <div className="hv-msets">{list.map(m => <div key={m.muscle} className="hv-wd-split">
      <span>{t(m.muscle)}</span>
      <span className="hv-mset-bar"><i style={{ width: (m.sets / list[0].sets) * 100 + '%' }} /></span>
      <b>{tn('{0} set', '{0} sets', m.sets)}</b>
    </div>)}</div> : <div className="muted small">{t('No sets in this period yet.')}</div>}
  </>)
}

export default function WeeklyChart() {
  const S = useStore(s => s.S)
  const [pick, setKind] = useState('duration')
  const sets = volumeMode(S) === 'sets'
  // The Volume chip is Sets in sets mode; the choice follows a switch made in Settings.
  const kinds = SERIES.map(k => (k === 'volume' && sets ? 'sets' : k))
  const kind = pick === 'volume' || pick === 'sets' ? (sets ? 'sets' : 'volume') : pick
  const pts = weeklySeries(S.workouts, kind, { today: todayISO(), weekStart: weekStartOf(S) })
  const max = Math.max(...pts.map(p => p.value), kind === 'duration' ? HOUR : 1)
  const fmt = v => (kind === 'duration' ? (v ? fmtDur(v) : '0') : kind === 'volume' ? fmtNum(Math.round(v)) + ' ' + S.unit
    : kind === 'sets' ? tn('{0} set', '{0} sets', v) : fmtNum(v))
  const cur = pts.at(-1).value
  const head = kind === 'duration' ? t('{0} this week', cur ? fmtDur(cur) : '0 min') : t('{0} this week', fmt(cur))
  return <div className="hv-chart">
    <div className="hv-chart-h"><b>{head}</b><span className="hv-sub">{t('Last 12 weeks')}</span></div>
    <div className="hv-bars" role="img" aria-label={t(LABEL[kind])}>
      {pts.map(p => {
        const bar = <i style={{ height: Math.round((p.value / max) * 100) + '%' }} className={p.value ? '' : 'zero'} />
        return kind === 'sets'
          ? <button key={p.week} type="button" className="hv-barcol" title={p.week + ': ' + fmt(p.value)} onClick={() => weekSheet(S, p.week)}>{bar}</button>
          : <div key={p.week} className="hv-barcol" title={p.week + ': ' + fmt(p.value)}>{bar}</div>
      })}
    </div>
    <div className="hv-chips">{kinds.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(LABEL[k])}</button>)}</div>
  </div>
}
