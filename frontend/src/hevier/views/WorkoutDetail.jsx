// Hevy's Workout Detail page (reference/SCREENS.md §4): ‹ · Workout Detail · ⋯, the title, Time ·
// Volume · Sets · Records, the description, the muscle split, then each exercise with its sets.
// Seam S14 sends upstream's workoutDetailSheet here, so the feed, History, Stats, the calendar and
// exercise details all open it. ⋯ has Hevy's actions (upstream's, as on the feed card) and
// All details, upstream's own sheet: the session note editor, photos, date, duration, copy, share, .fit.
// The muscle split counts sets, as the fork's Statistics does (hevier/lib/muscle-sets.js).
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtDate, fmtDur, fmtVol } from '../../lib/format.js'
import { setLabel, sessionSections } from '../../lib/history.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'
import { speedUnitOf } from '../../lib/speed.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { nav as navTo, onSheetEntry } from '../../lib/nav.js'
import { exerciseDetailSheet, upstreamWorkoutDetailSheet } from '../../sheets.jsx'
import { setNumberAt } from '../../views/Workout.jsx'
import WorkoutMediaSection, { workoutMediaCount } from '../../components/WorkoutMedia.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import { workoutActions } from '../components/WorkoutCard.jsx'
import { hooks } from '../hooks.js'
import { workoutSplit } from '../lib/muscle-sets.js'
import { prSetIndex } from '../lib/pr-set.js'

export const DETAIL_PATH = '/workout-detail'

function ExerciseSets({ w, e, st }) {
  const ex = EXIDX[e.id]
  // The record sits on the set that made it, as in Hevy; on the exercise when no set can be named.
  const prAt = prSetIndex(w, e)
  const pr = !!w.prs?.includes(e.id)
  const sets = (e.sets || []).map((s, i) => ({ s, i })).filter(({ s }) => hasCompletedWork(s))
  return <div className="hv-wd-ex">
    <div className="hv-exhd">
      <span className="hv-thumb">{ex && <Thumb ex={ex} />}</span>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => ex && exerciseDetailSheet(ex)}>
        {ex ? exerciseNameFor(ex) : (e.n || e.id)}
      </button>
      {pr && prAt < 0 && <span className="hv-pr"><Icon name="trophy" />{t('PR')}</span>}
    </div>
    {e.note && <div className="hv-note">{e.note}</div>}
    <div className="hv-wd-sets">
      <div className="hv-wd-row hv-wd-th"><span>{t('SET')}</span><span>{t('WEIGHT & REPS')}</span></div>
      {sets.map(({ s, i }) => <div key={i} className="hv-wd-row">
        <span className={isWarmupRow(s) ? 'hv-wd-w' : ''}>{isWarmupRow(s) ? t('W') : setNumberAt(e.sets, i)}</span>
        <span>{setLabel(e.id, s, e.target, speedUnitOf(st))}</span>
        {i === prAt && <span className="hv-pr"><Icon name="trophy" />{t('PR')}</span>}
      </div>)}
      {sets.length === 0 && <div className="hv-wd-row muted"><span /><span>{t('no sets')}</span></div>}
    </div>
  </div>
}

export function WorkoutDetail() {
  const nav = useNavigate()
  const { state } = useLocation()
  const st = useStore(s => s.S)
  const w = state?.ref ? (st.workouts || []).find(x => sameWorkout(x, state.ref)) : null
  // Deleted (here or in All details) or opened without a workout: back to where it came from.
  if (!w) return <Navigate to="/home" replace />
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/home'))
  const ms = Math.max(0, (w.end || w.start) - w.start)
  const setN = (w.entries || []).reduce((n, e) => n + (e.sets || []).filter(s => hasCompletedWork(s) && !isWarmupRow(s)).length, 0)
  const prs = w.prs || []
  const split = workoutSplit(w)
  const top = split[0]?.sets || 1
  const units = sessionSections(w.entries || []).flatMap(g => g.units)
  const more = () => workoutActions(w, nav, [
    { icon: 'list', label: t('All details'), sub: t('Note, photos, date, duration, copy, share, .fit'), onClick: () => upstreamWorkoutDetailSheet(w) },
  ])

  return <div className="hv-wd">
    <div className="hv-pagebar">
      <button type="button" className="iconbtn" aria-label={t('Back')} onClick={back}><Icon name="chevronLeft" /></button>
      <div className="hv-title">{t('Workout Detail')}</div>
      <button type="button" className="iconbtn" aria-label={t('More')} onClick={more}><Icon name="more" /></button>
    </div>
    <div className="hv-wd-d">{fmtDate(w.d, true)}</div>
    <h2 className="hv-wd-t">{w.name || t('Workout')}</h2>
    <div className="hv-stats">
      <div><span>{t('Time')}</span><b>{ms >= 60000 ? fmtDur(ms) : '–'}</b></div>
      <div><span>{t('Volume')}</span><b>{fmtVol(w.vol || 0, st.unit)}</b></div>
      <div><span>{t('Sets')}</span><b>{setN}</b></div>
      {prs.length > 0 && <div><span>{t('Records')}</span><b className="hv-pr"><Icon name="trophy" />{prs.length}</b></div>}
    </div>
    {w.note && <p className="hv-wd-note">{w.note}</p>}
    {/* Shown when there is something to show; adding one is in All details. */}
    {workoutMediaCount(w) > 0 && <WorkoutMediaSection w={w} />}
    {split.length > 0 && <>
      <h4 className="sec">{t('Muscle Split')}</h4>
      <div className="hv-msets">
        {split.map(r => <div key={r.muscle} className="hv-wd-split">
          <span>{t(MUSCLE_NAME[r.muscle] || r.muscle)}</span>
          <span className="hv-mset-bar"><i style={{ width: (r.sets / top) * 100 + '%' }} /></span>
          <b>{tn('{0} set', '{0} sets', r.sets)}</b>
        </div>)}
      </div>
    </>}
    <h4 className="sec">{t('Workout')}</h4>
    {units.map(unit => <div key={unit[0]} className={'hv-unit' + (unit.length > 1 ? ' ss' : '')}>
      {unit.map(i => <ExerciseSets key={i} w={w} e={w.entries[i]} st={st} />)}
    </div>)}
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
