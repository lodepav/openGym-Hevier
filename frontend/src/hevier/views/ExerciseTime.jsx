// Profile → Statistics → Exercise time (D88): how long each exercise takes, from its sets' tick
// times (lib/exercise-time.js), over 30 days, 90 days, a year or all. A row is the exercise, its
// average time a session and, under it, its sessions and total. Longest first; ↓ / ↑ turns it
// round, and Muscle or Gym puts the rows into sections (the main muscle, D74 / D76; the gym the
// exercise was done at, D28). A tap opens exercise details.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { BackTo } from './Statistics.jsx'
import { timedSessions, timeSections, periodSince } from '../lib/exercise-time.js'
import { elapsedWords, durationWords } from '../lib/elapsed.js'
import { mainMuscleOf } from '../lib/main-muscle.js'
import { gymName } from '../lib/gym-labels.js'

const PERIODS = [['30d', '30 days'], ['90d', '90 days'], ['year', 'Year'], ['all', 'All']]
const secs = ms => elapsedWords(Math.round(ms / 1000))

export default function ExerciseTime() {
  const st = useStore(s => s.S)
  const [period, setPeriod] = useState('90d')
  const [by, setBy] = useState(null)
  const [asc, setAsc] = useState(false)
  const sessions = useMemo(() => timedSessions(st.workouts, periodSince(period, todayISO())),
    [st.workouts, period])
  const sections = timeSections(sessions, { by, asc, muscleOf: id => mainMuscleOf(exOr(id)) })
  const title = key => (by === 'gym' ? (key ? gymName(st, key) || t('A removed gym') : t('No gym'))
    : key ? t(key) : t('Other'))
  const group = k => setBy(by === k ? null : k)
  return <div className="narrow hv-statpage">
    <BackTo label={t('Statistics')} to="/stats" title={t('Exercise time')} />
    <div className="hv-chips">{PERIODS.map(([k, label]) => <button key={k} type="button" className={'hv-chip' + (k === period ? ' on' : '')}
      aria-pressed={k === period} onClick={() => setPeriod(k)}>{t(label)}</button>)}</div>
    <div className="hv-extime-sort">
      <button type="button" className="hv-chip" onClick={() => setAsc(!asc)}>
        <Icon name={asc ? 'arrowUp' : 'arrowDown'} />{t(asc ? 'Shortest first' : 'Longest first')}</button>
      {[['muscle', 'Muscle'], ['gym', 'Gym']].map(([k, label]) => <button key={k} type="button"
        className={'hv-chip' + (by === k ? ' on' : '')} aria-pressed={by === k} onClick={() => group(k)}>{t(label)}</button>)}
    </div>
    <div className="small dim">{t('Average time a session, from the times your sets were ticked: the rest before each set counts.')}</div>
    {!sections.length && <div className="muted small" style={{ marginTop: 10 }}>{t('No timed exercises in this period. Workouts imported from other apps have no set times.')}</div>}
    {sections.map(sec => <section key={sec.key}>
      {by && <h4 className="sec">{title(sec.key)} <span className="dim">· {durationWords(sec.total)}</span></h4>}
      <div className="list">{sec.rows.map(r => {
        const ex = exOr(r.id)
        return <button key={r.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(ex)}>
          <span className="grow"><b className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</b>
            <span className="small dim">{r.sessions} {t(r.sessions === 1 ? 'session' : 'sessions')} · {durationWords(r.total)} {t('total')}</span>
          </span>
          <b>{secs(r.avg)}</b>
        </button>
      })}</div>
    </section>)}
  </div>
}
