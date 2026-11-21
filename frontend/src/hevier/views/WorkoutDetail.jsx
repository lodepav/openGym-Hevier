// Hevy's Workout Detail page (reference/SCREENS.md §4): ‹ · Workout Detail · ⋯, the title, Time ·
// Volume · Sets · Records, the muscle line, the description, then each exercise with its sets, effort
// in its own column and a per-side set as an L row and an R row (D133).
// Seam S14 sends upstream's workoutDetailSheet here, so the feed, History, Stats, the calendar and
// exercise details all open it. ⋯ has Hevy's actions (upstream's, as on the feed card) and
// All details, upstream's own sheet: the session note editor, photos, date, duration, copy, share, .fit.
// The muscle line counts each set once for its main muscle (DECISIONS.md D18); D133 took the bars.
// Heart rate (D27), when a watch saved one: the session's under the stats, each set's on its row.
import HvIcon from '../components/HvIcon.jsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtVol, fmtNum } from '../../lib/format.js'
import { fmtDate } from '../lib/dates.js'
import { sessionSections, sessionVolume, EFFORT } from '../../lib/history.js'
import { hasCompletedWork, isWarmupRow, isSideSet } from '../../lib/workout-model.js'
import { speedUnitOf } from '../../lib/speed.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { nav as navTo, onSheetEntry } from '../../lib/nav.js'
import { exerciseDetailSheet, upstreamWorkoutDetailSheet } from '../../sheets.jsx'
import WorkoutMediaSection, { workoutMediaCount } from '../../components/WorkoutMedia.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { shareWorkoutSheet } from '../components/ShareSheet.jsx'
import { setText, noEffort } from '../lib/set-text.js'
import { entryTimes } from '../lib/exercise-time.js'
import { elapsedWords, durationWords } from '../lib/elapsed.js'
import { workoutActions, editWorkout } from '../components/WorkoutCard.jsx'
import { hooks } from '../hooks.js'
import { workoutRecords, recordsAt, KINDS } from '../lib/records.js'
import { volumeMode, muscleMode, workSets } from '../lib/volume.js'
import MuscleLine from '../components/MuscleLine.jsx'
import { savedGym, gymName, savedCable, cableText } from '../lib/gym-labels.js'
import { PHASE_LABEL, workoutPhase } from '../lib/shared-phase.js'
import { workoutTrends, workoutSideTrends } from '../lib/set-trend.js'
import { detailRows, recordsOnRow, effortScale, effortShown } from '../lib/side-rows.js'
import TrendMark from '../components/TrendMark.jsx'

// A cable's setup shows when it is not the plain 1:1 (D43).
const cableOn = e => !!savedCable(e) && savedCable(e) !== '1:1'
import { sanitizeHr } from '../../lib/heart-rate.js'
import { workoutTimeText, workoutWhenText } from '../lib/workout-when.js'
import { setMark } from '../lib/history-rows.js'
import { partOn } from '../lib/module-parts.js'
import { setNoteOf } from '../../lib/set-notes.js'
import { Fragment, useEffect } from 'react'
import { workoutCompare } from '../lib/workout-compare.js'
import { signed } from '../lib/delta.js'

export const DETAIL_PATH = '/workout-detail'

// A record's badge: the trophy and what it is a record of (D51).
// Beat last time (D66): each work set against the same set last time.
const Trend = TrendMark

const PrBadge = ({ recs }) => recs.length > 0 && <span className="hv-pr hv-pr-kinds"><Icon name="trophy" />{recs.map(r => t(KINDS[r.kind])).join(' · ')}</span>

// Each row's records and its ↑ = ↓, which a record replaces (D66): what a set row shows beside its numbers.
function rowMarks(e, recs, trends = [], sideTrends = []) {
  const rows = detailRows(e.sets)
  const last = (e.sets || []).map((s, i) => ({ s, i })).filter(({ s }) => hasCompletedWork(s) && !isWarmupRow(s)).at(-1)?.i
  return rows.map(row => {
    const at = recordsOnRow(row, recs, e.sets, last)
    return { row, at, trend: at.length ? null : row.side && isSideSet(e.sets[row.i]) ? sideTrends[row.i]?.[row.side] : trends[row.i] }
  })
}

function ExerciseSets({ e, st, recs, trends = [], sideTrends = [], time, scale, legend = false }) {
  const ex = EXIDX[e.id]
  // A record sits on the set that made it, as in Hevy; a session's (its volume) on the last work set,
  // the one that took the session past it (changed 2026-10-20: it was on the exercise's header).
  // A per-side set is an L row and an R row (D133), its record on its side.
  const marks = rowMarks(e, recs, trends, sideTrends)
  const rows = marks.map(m => m.row)
  const anyHr = rows.some(r => sanitizeHr(r.hr))
  return <div className="hv-wd-ex">
    <div className="hv-exhd">
      <span className="hv-thumb">{ex && <Thumb ex={ex} />}</span>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => ex && exerciseDetailSheet(ex)}>
        {ex ? exerciseNameFor(ex) : (e.n || e.id)}
      </button>
    </div>
    {(e.hvBrand || cableOn(e)) && <div className="hv-brand has"><Icon name="machine" />
      {[e.hvBrand, cableOn(e) && t('Cable') + ' ' + cableText(savedCable(e))].filter(Boolean).join(' · ')}</div>}
    {/* How long the exercise took, from its sets' tick times (D88). */}
    {time > 0 && <div className="hv-brand has hv-extime">
      <Icon name="timer" /><span className="hv-sr">{t('Exercise time')}: </span>{elapsedWords(Math.round(time / 1000))}</div>}
    {e.note && <div className="hv-note">{e.note}</div>}
    <div className="hv-wd-sets">
      <div className="hv-wd-row hv-wd-th"><span>{t('SET')}</span><span>{t('WEIGHT & REPS')}</span>
        {scale && <span className="hv-wd-rpe">{t(EFFORT[scale].hd)}</span>}{anyHr && <span className="hv-wd-hrc" />}</div>
      {marks.map(({ row, at, trend }) => {
        const { i, s } = row
        const hr = row.head && sanitizeHr(row.hr)
        const effort = effortShown(row.effort, scale)
        return <Fragment key={i + (row.side || '')}><div className="hv-wd-row">
          {/* W for a warm-up, H for a hold (D89), else the set's number among the rep sets; once a set. */}
          {(mark => <span className={mark === 'W' ? 'hv-wd-w' : mark === 'H' ? 'hv-wd-h' : ''}>{mark === 'W' || mark === 'H' ? t(mark) : mark}</span>)(row.head ? setMark(e.sets, i) : '')}
          {/* A record says more than an arrow: the set shows only its badge (D66). */}
          <span className="hv-wd-v">{row.side && <span className="hv-lr">{row.side === 'L' ? t('L') : t('R')}</span>}
            {row.undone ? '–' : setText(e.id, noEffort(s), e.target, speedUnitOf(st), st.unit)}<Trend v={trend} /></span>
          {scale && <span className="hv-wd-rpe">{effort != null && <><span className="hv-sr">{t(EFFORT[scale].hd)} </span>{fmtNum(effort)}</>}</span>}
          {anyHr && <span className="hv-wd-hrc">{hr && <span className="hv-wd-hr" title={t('Heart rate')}><Icon name="heart" /><span className="hv-sr">{t('Heart rate')}: </span>{hr.avg}</span>}</span>}
          <PrBadge recs={at} />
        </div>
        {/* A set's note (upstream 1.4.4, D5): under its last row. */}
        {row.last && setNoteOf(e.sets[i]) && <div className="hv-wd-setnote"><Icon name="note" /><span>{setNoteOf(e.sets[i])}</span></div>}</Fragment>
      })}
      {rows.length === 0 && <div className="hv-wd-row muted"><span /><span>{t('no sets')}</span></div>}
    </div>
    {legend && <p className="hv-wd-legend small dim" aria-hidden="true">{t('↑ = ↓ against the same set last time')}</p>}
  </div>
}

// The workout is gone (deleted here or in All details): back to the page it was opened from.
function Gone() {
  const nav = useNavigate()
  useEffect(() => { if (window.history.state?.idx > 0) nav(-1); else nav('/home', { replace: true }) }, [nav])
  return null
}

// "+320 kg · +1 set · −4min vs 3 Nov": this workout against the same routine's last one, the
// stats row's own numbers (volume only where the row shows it, D18). A number that did not change
// is left out; with none left the line reads "Same as 3 Nov".
function VsLast({ st, w, mode }) {
  const c = workoutCompare(st, w)
  if (!c) return null
  const part = (n, fmt) => (n ? signed(n, fmt)?.text : null)
  const parts = [
    mode === 'weight' && part(Math.round(c.volume * 10) / 10, v => fmtVol(v, st.unit)),
    part(c.sets, n => tn('{0} set', '{0} sets', n)),
    c.minutes != null && part(c.minutes, n => durationWords(n * 60000)),
  ].filter(Boolean)
  return <div className="hv-wd-vs">{parts.length ? t('{0} vs {1}', parts.join(' · '), fmtDate(c.prev.d)) : t('Same as {0}', fmtDate(c.prev.d))}</div>
}

export function WorkoutDetail() {
  const nav = useNavigate()
  const { state } = useLocation()
  const st = useStore(s => s.S)
  const w = state?.ref ? (st.workouts || []).find(x => sameWorkout(x, state.ref)) : null
  // Deleted (here or in All details) or opened without a workout: back to where it came from.
  if (!w) return <Gone />
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/home'))
  const setN = workSets(w.entries)
  const prs = workoutRecords(st, w)
  const times = partOn(st, 'hvStats', 'time') ? entryTimes(w) : [] // D114
  const mode = volumeMode(st)
  // D133: the effort column shows when the workout has any effort logged, in the profile's scale.
  const scale = (w.entries || []).some(e => detailRows(e.sets).some(r => r.effort)) ? effortScale(st) : null
  const units = sessionSections(w.entries || []).flatMap(g => g.units)
  const legendAt = units.flat().find(i => rowMarks(w.entries[i], recordsAt(prs, i), workoutTrends(st, w, i), workoutSideTrends(st, w, i)).some(m => m.trend != null))
  const gym = gymName(st, savedGym(w))   // D28: null without a gym, '' for one deleted since
  const phase = workoutPhase(w)   // D93: OpenBite's phase when it was saved
  const more = () => workoutActions(w, nav, [
    { icon: 'list', label: t('All details'), sub: t('Note, photos, date, duration, copy, share, .fit'), onClick: () => upstreamWorkoutDetailSheet(w) },
  ])

  return <div className="hv-wd">
    <PageBar title={t('Workout Detail')} onBack={back}>
      {partOn(st, 'motivation', 'share') && <button type="button" className="iconbtn" aria-label={t('Share workout')} onClick={() => shareWorkoutSheet(w)}><Icon name="share" /></button>}
      <button type="button" className="iconbtn" aria-label={t('More')} onClick={more}><Icon name="more" /></button>
    </PageBar>
    <div className="hv-wd-d">{workoutWhenText(w)}{gym != null && <> · <span className="hv-wd-gym"><HvIcon name="mapPin" />{gym || t('Removed gym')}</span></>}{phase && <> · {t(PHASE_LABEL[phase])}</>}</div>
    <h2 className="hv-wd-t">{w.name || t('Workout')}</h2>
    <div className="hv-stats">
      <div><span>{t('Time')}</span><b>{workoutTimeText(w)}</b></div>
      {mode === 'weight' && <div><span>{t('Volume')}</span><b>{fmtVol(sessionVolume(w, st), st.unit)}</b></div>}
      <div><span>{t('Sets')}</span><b>{setN}</b></div>
      {prs.length > 0 && <div><span>{t('Records')}</span><b className="hv-pr"><Icon name="trophy" />{prs.length}</b></div>}
    </div>
    {mode === 'sets' && <MuscleLine entries={w.entries} mode={muscleMode(st)} />}
    <VsLast st={st} w={w} mode={mode} />
    {sanitizeHr(w.hr) && <div className="hv-wd-hrline"><Icon name="heart" />
      {t('Heart rate {0} avg · {1} max', sanitizeHr(w.hr).avg, sanitizeHr(w.hr).max)}</div>}
    {w.note && <p className="hv-wd-note">{w.note}</p>}
    {/* Shown when there is something to show; adding one is in All details. */}
    {workoutMediaCount(w) > 0 && <WorkoutMediaSection w={w} />}
    <h3 className="sec">{t('Workout')}</h3>
    {/* The ↑ = ↓ explained once, under the first exercise that shows one; each mark is read out on its own (the critique, 2026-11-21). */}
    {units.map(unit => <div key={unit[0]} className={'hv-unit' + (unit.length > 1 ? ' ss' : '')}>
      {unit.map(i => <ExerciseSets key={i} e={w.entries[i]} st={st} recs={recordsAt(prs, i)} trends={workoutTrends(st, w, i)}
        sideTrends={workoutSideTrends(st, w, i)} time={times[i]} scale={scale} legend={i === legendAt} />)}
    </div>)}
    <button type="button" className="btn hv-wd-edit" onClick={() => editWorkout(w, nav)}>{t('Edit Workout')}</button>
  </div>
}

/** Points upstream's workoutDetailSheet at this page (seam S14). Sheets on top (the calendar,
 *  exercise details) close first, so the page is not hidden under them; opened from a sheet, the
 *  page takes the sheet's history entry, as upstream's closeThenNav does (lib/nav.js). */
export function installWorkoutDetail() {
  hooks.workoutDetail = w => {
    const replace = onSheetEntry()
    useUI.getState().closeAll()
    navTo(DETAIL_PATH, { replace, state: { ref: { id: w.id, d: w.d, start: w.start } } })
  }
}
