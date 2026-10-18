// Hevy's monthly report (hevier/DECISIONS.md D23; reference/SCREENS.md §6), Profile → Statistics →
// Monthly report: the month's totals against the month before, its records, its calendar, sets per
// muscle and top exercises, all read from the log by hevier/lib/month-report.js.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtDur, fmtVol, fmtDate, todayISO, weekStartOf, MONTHS_LONG } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { volumeMode, muscleMode } from '../lib/volume.js'
import { workoutsByDay } from '../lib/calendar.js'
import { change, defaultMonth, firstMonth, monthReport } from '../lib/month-report.js'
import { workoutRecords, recordValue, KINDS } from '../lib/records.js'
import { Month } from './Calendar.jsx'
import { BackTo } from './Statistics.jsx'

function Stat({ label, value, delta }) {
  return <div><span>{label}</span><b>{value}</b>
    {delta && <em className={delta.up ? 'up' : 'down'}>{delta.text}</em>}</div>
}

export default function MonthReport() {
  const st = useStore(s => s.S)
  const today = todayISO()
  const [at, setAt] = useState(() => defaultMonth(st.workouts, today))
  const ws = weekStartOf(st)
  const mm = muscleMode(st)
  const r = useMemo(() => monthReport(st.workouts, at.y, at.mo, ws, mm, w => workoutRecords(st, w)), [st.workouts, st.dbLoad, at, ws, mm]) // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => workoutsByDay(st.workouts), [st.workouts])
  const first = firstMonth(st.workouts)
  const isNow = at.y === Number(today.slice(0, 4)) && at.mo === Number(today.slice(5, 7)) - 1
  const canBack = !!first && (at.y > first.y || (at.y === first.y && at.mo > first.mo))
  const step = by => setAt(({ y, mo }) => { const d = new Date(y, mo + by, 1); return { y: d.getFullYear(), mo: d.getMonth() } })
  const unit = st.unit
  const sets = volumeMode(st) === 'sets'
  const topMuscle = r.muscles[0]?.sets || 1
  const title = t('{0} Report', t(MONTHS_LONG[at.mo])) + (at.y !== Number(today.slice(0, 4)) ? ' ' + at.y : '')

  return <div className="narrow hv-report">
    <BackTo label={t('Statistics')} to="/stats" title={t('Monthly report')} />
    <div className="hv-report-bar">
      <button type="button" className="iconbtn" aria-label={t('Previous month')} disabled={!canBack} onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
      <div><h1>{title}</h1>{isNow && <span className="hv-sub">{t('so far')}</span>}</div>
      <button type="button" className="iconbtn" aria-label={t('Next month')} disabled={isNow} onClick={() => step(1)}><Icon name="chevronRight" /></button>
    </div>
    {!r.workouts ? <div className="empty"><div className="ico"><Icon name="calendar" /></div>{t('No workouts this month')}</div> : <>
      <div className="hv-stats hv-report-stats">
        <Stat label={t('Workouts')} value={r.workouts} delta={change(r.workouts, r.prev.workouts)} />
        <Stat label={t('Duration')} value={fmtDur(r.duration)} delta={change(r.duration, r.prev.duration, true)} />
        {sets
          ? <Stat label={t('Sets')} value={r.sets} delta={change(r.sets, r.prev.sets)} />
          : <Stat label={t('Volume')} value={fmtVol(r.volume, unit)} delta={change(r.volume, r.prev.volume, true)} />}
      </div>
      <div className="hv-sub hv-report-vs">{t('Against {0}', t(MONTHS_LONG[(at.mo + 11) % 12]))}</div>

      {r.records.length > 0 && <>
        <h4 className="sec"><Icon name="trophy" /> {t('PRs')} <span className="dim">{r.records.length}</span></h4>
        <div className="list">{r.records.map((x, i) => <button key={i} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(exOr(x.id))}>
          <span className="grow"><span className={exerciseNameClass(exOr(x.id))}>{exerciseNameFor(exOr(x.id))}</span>
            <span className="hv-sub">{t(KINDS[x.kind])} · {recordValue(x, unit, t)}</span></span>
          <span className="dim">{fmtDate(x.d, true)}</span>
        </button>)}</div>
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
