// Hevy's monthly report (hevier/DECISIONS.md D23; reference/SCREENS.md §6), Profile → Statistics →
// Monthly report: the month's totals against the month before, its records, its calendar, sets per
// muscle and top exercises, all read from the log by hevier/lib/month-report.js.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtVol, fmtDate, todayISO, weekStartOf, MONTHS_LONG } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { volumeMode, muscleMode } from '../lib/volume.js'
import { workoutsByDay } from '../lib/calendar.js'
import { durationWords } from '../lib/elapsed.js'
import { byExercise, change, defaultMonth, firstMonth, monthReport } from '../lib/month-report.js'
import { workoutRecords, recordValue, KINDS } from '../lib/records.js'
import { Month } from './Calendar.jsx'
import { BackTo } from './Statistics.jsx'
import { countedWorkouts } from '../lib/counted.js'
import { usePhasedS } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { shareMonthSheet } from '../components/ShareSheet.jsx'
import { sessionVolume } from '../../lib/history.js'

const PR_ROWS = 5

function Stat({ label, value, delta }) {
  return <div><span>{label}</span><b>{value}</b>
    {delta && <em className={delta.up ? 'up' : 'down'}>{delta.text}</em>}</div>
}

export default function MonthReport() {
  const st = useStore(s => s.S)
  const today = todayISO()
  const [at, setAt] = useState(() => defaultMonth(st.workouts, today))
  const [allPrs, setAllPrs] = useState(false)
  const ws = weekStartOf(st)
  const mm = muscleMode(st)
  // Exercises kept out of progression are kept out of the report (D57); its calendar shows every day.
  const log = usePhasedS(st).workouts   // D93
  const counted = useMemo(() => countedWorkouts(log, st.routines), [log, st.routines])
  const r = useMemo(() => monthReport(counted, at.y, at.mo, ws, mm, w => workoutRecords(st, w), w => sessionVolume(w, st)), [counted, st.dbLoad, at, ws, mm, st.volumeWarmups]) // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => workoutsByDay(log), [log])
  const first = firstMonth(st.workouts)
  const ym = `${at.y}-${String(at.mo + 1).padStart(2, '0')}-`
  const trained = Object.keys(byDay).some(d => d.startsWith(ym))
  const isNow = at.y === Number(today.slice(0, 4)) && at.mo === Number(today.slice(5, 7)) - 1
  const canBack = !!first && (at.y > first.y || (at.y === first.y && at.mo > first.mo))
  const step = by => { setAllPrs(false); setAt(({ y, mo }) => { const d = new Date(y, mo + by, 1); return { y: d.getFullYear(), mo: d.getMonth() } }) }
  const prRows = byExercise(r.records)
  const unit = st.unit
  const sets = volumeMode(st) === 'sets'
  const topMuscle = r.muscles[0]?.sets || 1
  const title = t('{0} Report', t(MONTHS_LONG[at.mo])) + (at.y !== Number(today.slice(0, 4)) ? ' ' + at.y : '')

  return <div className="narrow hv-report">
    <BackTo label={t('Statistics')} to="/stats" title={t('Monthly report')}>
      {trained && <button type="button" className="iconbtn" aria-label={t('Share report')} onClick={() => shareMonthSheet({
        y: at.y, mo: at.mo, report: r, workouts: counted, byDay, ws, title, when: isNow ? t('so far') : '',
        before: t(MONTHS_LONG[(at.mo + 11) % 12]),
      })}><Icon name="share" /></button>}
    </BackTo>
    <PhaseFilter />
    <div className="hv-report-bar">
      <button type="button" className="iconbtn" aria-label={t('Previous month')} disabled={!canBack} onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
      <div><h1>{title}</h1>{isNow && <span className="hv-sub">{t('so far')}</span>}</div>
      <button type="button" className="iconbtn" aria-label={t('Next month')} disabled={isNow} onClick={() => step(1)}><Icon name="chevronRight" /></button>
    </div>
    {!trained ? <div className="empty"><div className="ico"><Icon name="calendar" /></div>{t('No workouts this month')}</div> : <>
      <div className="hv-stats hv-report-stats">
        <Stat label={t('Workouts')} value={r.workouts} delta={change(r.workouts, r.prev.workouts)} />
        <Stat label={t('Duration')} value={durationWords(r.duration)} delta={change(r.duration, r.prev.duration, durationWords)} />
        {sets
          ? <Stat label={t('Sets')} value={r.sets} delta={change(r.sets, r.prev.sets)} />
          : <Stat label={t('Volume')} value={fmtVol(r.volume, unit)} delta={change(Math.round(r.volume), Math.round(r.prev.volume), v => fmtVol(v, unit))} />}
      </div>
      <div className="hv-sub hv-report-vs">{t('Against {0}', t(MONTHS_LONG[(at.mo + 11) % 12]))}</div>

      {r.records.length > 0 && <>
        <h4 className="sec"><Icon name="trophy" /> {t('PRs')} <span className="dim">{r.records.length}</span></h4>
        {/* One row per exercise: each kind of record once, its best this month, ×N when it was beaten
            N times, so the rows add up to the count above. The first five, then all on a tap. */}
        <div className="list">{(allPrs ? prRows : prRows.slice(0, PR_ROWS)).map(x => <button key={x.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(exOr(x.id))}>
          <span className="grow"><span className={exerciseNameClass(exOr(x.id))}>{exerciseNameFor(exOr(x.id))}</span>
            {x.recs.map(rec => <span key={rec.kind} className="hv-sub">{t(KINDS[rec.kind])} · {recordValue(rec, unit, t)}{rec.times > 1 && ' · ' + t('{0} times', rec.times)} · {fmtDate(rec.d)}</span>)}</span>
        </button>)}</div>
        {!allPrs && prRows.length > PR_ROWS && <button type="button" className="btn hv-report-more" onClick={() => setAllPrs(true)}>{t('Show all ({0})', prRows.length)}</button>}
      </>}

      <h4 className="sec">{t('{0} of {1} weeks trained', r.weeks.trained, r.weeks.total)}</h4>
      <Month y={at.y} mo={at.mo} st={st} byDay={byDay} today={today} />

      {r.muscles.length > 0 && <>
        <h4 className="sec">{t('Muscle Split')}</h4>
        <div className="hv-msets">{r.muscles.map(m => <div key={m.muscle} className="hv-wd-split">
          <span>{t(m.muscle)}</span>
          <span className="hv-mset-bar"><i style={{ width: (m.sets / topMuscle) * 100 + '%' }} /></span>
          <b>{tn('{0} set', '{0} sets', m.sets)}</b>
        </div>)}</div>
      </>}

      {r.top.length > 0 && <>
        <h4 className="sec">{t('Top exercises')}</h4>
        <div className="list">{r.top.map(x => <button key={x.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(exOr(x.id))}>
          <span className={'grow ' + exerciseNameClass(exOr(x.id))}>{exerciseNameFor(exOr(x.id))}</span>
          <span className="dim">{tn('{0} set', '{0} sets', x.sets)}{x.best > 0 && ' · ' + fmtNum(x.best) + ' ' + unit}</span>
        </button>)}</div>
      </>}
    </>}
  </div>
}
