// Profile → Statistics → Exercise time (D88): how long each exercise takes, from its sets' tick
// times (lib/exercise-time.js), over 30 days, 90 days, a year or all. A row is the exercise, its
// average time a session and, under it, its sessions and total, and its typical time between sets
// against the rest set for it (lib/set-gaps.js). Longest first; ↓ / ↑ turns it
// round, and Muscle or Gym puts the rows into sections (the main muscle, D74 / D76; the gym the
// exercise was done at, D28). A tap opens exercise details.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { usePhasedS, useStatsPhase } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { BackTo } from './Statistics.jsx'
import { timedSessions, timeSections, periodSince, timeSpoken } from '../lib/exercise-time.js'
import { setGaps } from '../lib/set-gaps.js'
import { elapsedSpaced, elapsedClock, restTimerText } from '../lib/elapsed.js'
import { mainMuscleOf, muscleText } from '../lib/main-muscle.js'
import { gymName } from '../lib/gym-labels.js'
import { untimedApart } from '../lib/untimed-rows.js'
import { useLargeText } from '../components/useLargeText.js'

const PERIODS = [['30d', '30 days'], ['90d', '90 days'], ['year', 'Year'], ['all', 'All']]
// "1 min 30 s", the fork's one duration style (the ninth critique, 2026-11-22).
const secs = ms => elapsedSpaced(Math.round(ms / 1000))
// A gap between sets reads as a clock, as the rest beside it does.
const clock = ms => elapsedClock(Math.round(ms / 1000))
// Each said in words (role img, so the label is read in the row's name): TalkBack read "1min 30s" and "1:30" as letters and a clock (the eighth audit, 2026-11-22).
const said = ms => timeSpoken(Math.round(ms / 1000))

// The page's choices for the app's session, not stored: back from an exercise's page they are as left (the tenth critique, 2026-11-22).
export const kept = { period: '90d', by: null, asc: false }
const useKept = key => {
  const [v, set] = useState(kept[key])
  return [v, nv => { kept[key] = nv; set(nv) }]
}

export default function ExerciseTime() {
  const st = useStore(s => s.S)
  const [period, setPeriod] = useKept('period')
  const [by, setBy] = useKept('by')
  const [asc, setAsc] = useKept('asc')
  const [noTimeOpen, setNoTimeOpen] = useState(false)
  const log = usePhasedS(st).workouts   // D93
  // A picked phase makes the log a new copy on each write: key on what it is made from (the fifth audit, 2026-11-21).
  const phase = useStatsPhase(s => s.phase)
  const made = [st.workouts, st.routines, phase, st.modules, st.hvModuleParts]
  const sessions = useMemo(() => timedSessions(log, periodSince(period, todayISO()), st.routines),
    [...made, period]) // eslint-disable-line react-hooks/exhaustive-deps
  // Per exercise over the whole period, the same number in whichever section its row shows.
  // setGaps reads only the rest settings from S, so another write leaves the gaps alone (the audit leftovers).
  const gaps = useMemo(() => setGaps(log, periodSince(period, todayISO()), { restSec: st.restSec, warmupRestSec: st.warmupRestSec }),
    [...made, period, st.restSec, st.warmupRestSec]) // eslint-disable-line react-hooks/exhaustive-deps
  // The main muscle is the user's choice (S.hvMainMuscle) or the exercise's, a custom one's from S.customEx.
  const sections = useMemo(() => timeSections(sessions, { by, asc, muscleOf: id => mainMuscleOf(exOr(id)) }),
    [sessions, by, asc, st.hvMainMuscle, st.customEx]) // eslint-disable-line react-hooks/exhaustive-deps
  const title = key => (by === 'gym' ? (key ? gymName(st, key) || t('A removed gym') : t('No gym'))
    : key ? muscleText(key) : t('Other'))
  const group = k => setBy(by === k ? null : k)
  const count = sections.reduce((n, sec) => n + sec.rows.length, 0)
  const { timed, untimed } = untimedApart(sections)
  const row = r => {
    const ex = exOr(r.id)
    const g = gaps.get(r.id)
    return <button key={r.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(ex)}>
      <span className="grow"><b className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</b>
        <span className="small dim">{r.sessions} {t(r.sessions === 1 ? 'session' : 'sessions')}{r.avg != null && r.sessions > 1 && <> · <span role="img" aria-label={said(r.total)}>{secs(r.total)}</span> {t('total')}</>}</span>
        {g && <span className="small dim" role="img" aria-label={g.rest > 0 ? t('Between sets {0}, rest set to {1}', said(g.gap), timeSpoken(g.rest)) : t('Between sets {0}, no rest timer', said(g.gap))}>
          {g.rest > 0 ? t('Between sets {0} · rest set to {1}', clock(g.gap), restTimerText(g.rest, 0, '')) : t('Between sets {0} · no rest timer', clock(g.gap))}</span>}
      </span>
      {/* One set a session is one gap, not a time (the sixth audit, 2026-11-22); nor are sets ticked seconds apart (the eighth critique). */}
      {r.avg == null ? <span className="small dim hv-extime-st">{t(r.quick ? 'Ticked all at once' : 'Too few sets')}</span>
        : <b className="hv-extime-avg" role="img" aria-label={t('Average') + ': ' + said(r.avg)}>{secs(r.avg)} <span className="small dim">{t('avg')}</span></b>}
    </button>
  }
  // With large text a row's average goes under the exercise's name (hevier.css .hv-big .hv-extime-list; the tenth critique, 2026-11-22).
  const big = useLargeText()
  return <div className={'narrow hv-statpage' + (big ? ' hv-big' : '')}>
    <BackTo label={t('Statistics')} to="/stats" title={t('Exercise time')} />
    <PhaseFilter />
    <div className="hv-chips hv-extime-periods">{PERIODS.map(([k, label]) => <button key={k} type="button" className={'hv-chip' + (k === period ? ' on' : '')}
      aria-pressed={k === period} onClick={() => setPeriod(k)}>{t(label)}</button>)}</div>
    <div className="hv-extime-sort">
      {/* An order, not a filter: a bare text toggle, not a chip like the two beside it (the ninth critique, 2026-11-22). */}
      <button type="button" className="hv-link hv-extime-order" onClick={() => setAsc(!asc)} aria-label={t('Order: {0}', t(asc ? 'shortest first' : 'longest first'))}>
        <Icon name={asc ? 'arrowUp' : 'arrowDown'} />{t(asc ? 'Shortest first' : 'Longest first')}</button>
      {[['muscle', 'Muscle'], ['gym', 'Gym']].map(([k, label]) => <button key={k} type="button"
        className={'hv-chip' + (by === k ? ' on' : '')} aria-pressed={by === k} onClick={() => group(k)}>{t(label)}</button>)}
    </div>
    {/* A new period or order is said, not only redrawn (the fresh audit, 2026-11-21). */}
    <span className="hv-sr" role="status">{[t(asc ? 'Shortest first' : 'Longest first'), by && t(by === 'gym' ? 'Gym' : 'Muscle'),
      tn('{0} exercise', '{0} exercises', count)].filter(Boolean).join(', ')}</span>
    {/* The count shown too, not only said (the ninth critique, 2026-11-22). */}
    <div className="small dim hv-extime-cap">{count > 0 && <span aria-hidden="true">{tn('{0} exercise', '{0} exercises', count)} · </span>}{t('average per session, rest included')}</div>
    {!sections.length && <div className="muted small" style={{ marginTop: 10 }}>{t('No timed exercises in this period. Workouts imported from other apps have no set times.')}</div>}
    {timed.map(sec => <section key={sec.key}>
      {by && <h2 className="sec">{title(sec.key)} {sec.total > 0 && <span className="dim">· <span role="img" aria-label={said(sec.total)}>{secs(sec.total)}</span> {t('total')}</span>}</h2>}
      <div className="list hv-flat hv-extime-list">{sec.rows.map(row)}</div>
    </section>)}
    {/* The rows without a time after the timed ones, folded under one heading (the tenth critique; no caption, the owner, 2026-11-22). */}
    {untimed.length > 0 && <section>
      <h2 className="sec hv-extime-none"><button type="button" className="hv-extime-fold" aria-expanded={noTimeOpen} aria-controls="hv-extime-none"
        onClick={() => setNoTimeOpen(!noTimeOpen)}>{t('No time ({0})', untimed.length)}<Icon name={noTimeOpen ? 'chevronUp' : 'chevronDown'} /></button></h2>
      <div id="hv-extime-none" hidden={!noTimeOpen}>{noTimeOpen && <>
        <div className="list hv-flat hv-extime-list">{untimed.map(row)}</div></>}</div>
    </section>}
  </div>
}
