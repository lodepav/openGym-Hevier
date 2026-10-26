// Hevy's Profile chart (reference/SCREENS.md §5): the last 12 weeks as bars, switched between
// Duration · Volume · Reps. In sets mode (hevier/DECISIONS.md D18) Volume is Sets, and a tap on a
// week lists its sets per muscle. A tap on any week puts its value in the headline (2026-10-25). Values come from hevier/lib/weekly-series.js.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn, dateLocale } from '../../lib/i18n.js'
import { fmtNum, fmtDate, todayISO, weekStartOf } from '../../lib/format.js'
import { durationWords } from '../lib/elapsed.js'
import { weeklySeries, SERIES, inWeek, niceMax, labelledWeeks } from '../lib/weekly-series.js'
import { menuSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { volumeMode, muscleMode, muscleSets } from '../lib/volume.js'
import { countedWorkouts } from '../lib/counted.js'
import { sessionVolume } from '../../lib/history.js'

const LABEL = { duration: 'Duration', volume: 'Volume', sets: 'Sets', reps: 'Reps' }
// Hevy's range picker over the chart, a view choice that is not kept.
const RANGES = [{ weeks: 12, label: 'Last 12 weeks' }, { weeks: 26, label: 'Last 6 months' }, { weeks: 52, label: 'Last year' }]

/** A week's sets per muscle, from a tap on its bar. */
function weekSheet(S, week) {
  const ws = countedWorkouts(S.workouts, S.routines).filter(w => inWeek(w, week, weekStartOf(S)))
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
  const [weeks, setWeeks] = useState(12)
  const [sel, setSel] = useState(null)
  const sets = volumeMode(S) === 'sets'
  // The Volume chip is Sets in sets mode; the choice follows a switch made in Settings.
  const kinds = SERIES.map(k => (k === 'volume' && sets ? 'sets' : k))
  const kind = pick === 'volume' || pick === 'sets' ? (sets ? 'sets' : 'volume') : pick
  // Exercises kept out of progression are kept out of the chart (D57).
  const pts = weeklySeries(countedWorkouts(S.workouts, S.routines), kind, { today: todayISO(), weeks, weekStart: weekStartOf(S), vol: w => sessionVolume(w, S) })
  const max = niceMax(Math.max(...pts.map(p => p.value)), kind)
  const fmt = v => (kind === 'duration' ? (v ? durationWords(v) : '0') : kind === 'volume' ? fmtNum(Math.round(v)) + ' ' + S.unit
    : kind === 'sets' ? tn('{0} set', '{0} sets', v) : fmtNum(v) + ' ' + (v === 1 ? t('rep') : t('reps')))
  const cur = pts.at(-1).value
  const axis = v => (kind === 'duration' ? Math.round(v / 3600000 * 10) / 10 + ' h' : fmtNum(Math.round(v)))
  const day = iso => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })
  const picked = pts.find(p => p.week === sel)
  const weekText = p => t('Week of {0}', fmtDate(p.week, true)) + ': ' + fmt(p.value)
  const head = picked ? weekText(picked) : kind === 'duration' ? t('{0} this week', durationWords(cur)) : t('{0} this week', fmt(cur))
  return <div className="hv-chart">
    <div className="hv-chart-h"><b>{head}</b>
      <button type="button" className="hv-link hv-range" onClick={() => menuSheet({
        title: t('Period'), items: RANGES.map(o => ({ label: t(o.label), on: o.weeks === weeks, onClick: () => setWeeks(o.weeks) })) })}>
        {t(RANGES.find(o => o.weeks === weeks).label)}<Icon name="chevronDown" /></button></div>
    <div className="hv-plot">
    <div className="hv-bars" role="group" aria-label={t(LABEL[kind])}>
      {pts.map(p => {
        const bar = <i style={{ height: Math.round((p.value / max) * 100) + '%' }} className={p.value ? '' : 'zero'} />
        const on = p.week === sel
        return <button key={p.week} type="button" className={'hv-barcol' + (on ? ' on' : '')} title={weekText(p)} aria-pressed={on}
          onClick={() => { setSel(on ? null : p.week); if (kind === 'sets' && !on) weekSheet(S, p.week) }}>{bar}</button>
      })}
    </div>
    {/* the axis on the right, Hevy's: the top line and its half */}
    <div className="hv-yaxis" aria-hidden="true"><span>{axis(max)}</span><span>{axis(max / 2)}</span><span>0</span></div>
    <div className="hv-xaxis" aria-hidden="true" style={{ '--n': pts.length }}>
      {labelledWeeks(pts.length).map(i => <span key={i} style={{ '--i': i }}>{day(pts[i].week)}</span>)}
    </div>
    </div>
    <div className="hv-chips">{kinds.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(LABEL[k])}</button>)}</div>
  </div>
}
