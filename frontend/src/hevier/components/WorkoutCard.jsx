// A finished workout as a Hevy feed card (reference/SCREENS.md §4): title, its note, date, Time · Volume ·
// Records, then the first exercises with their set counts. Tapping it opens the workout's details
// (the fork's Workout Detail, seam S14); ⋯ offers Hevy's four actions, each the one upstream's details sheet runs.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtVol, exCount } from '../../lib/format.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { workoutDetailSheet, repeatWorkout, menuSheet, confirmSheet } from '../../sheets.jsx'
import { editCompletedSession } from '../../lib/session-edit.js'
import { saveSessionAsRoutine } from '../../lib/session-routines.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { workoutMediaOf } from '../../lib/media-refs.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { Thumb } from '../../components/Media.jsx'
import MuscleLine from './MuscleLine.jsx'
import { shareWorkoutSheet } from './ShareSheet.jsx'
import { volumeMode, workSets } from '../lib/volume.js'
import Icon from '../../components/Icon.jsx'
import { sanitizeHr } from '../lib/heart-rate.js'
import { workoutTimeText, workoutWhenText } from '../lib/workout-when.js'
import { workoutRecords } from '../lib/records.js'
import { setUnits } from '../lib/hold-set.js'

const SHOWN = 3
const toast = msg => useUI.getState().toast(msg)

// The actions of upstream's WorkoutDetail (sheets.jsx), with its wording and its confirms. `extra`
// items go last (Workout Detail's All details).
/** Opens a saved workout in upstream's editor (Workout Detail's Edit Workout, the ⋯ menu's Edit). */
export function editWorkout(w, nav) {
  try { useStore.getState().update(s => { editCompletedSession(s, w) }); nav('/workout') } catch (e) { toast(t(e.message)) }
}

export function workoutActions(w, nav, extra = []) {
  const update = useStore.getState().update
  const media = workoutMediaOf(w, Infinity).length
  return menuSheet({
    title: w.name,
    items: [
      { icon: 'plus', label: t('Save as routine'), onClick: () => confirmSheet({
        title: t('Save as routine?'),
        message: t('Create an independent routine from these exercise targets. Your workout history is kept.'),
        confirmText: t('Save'),
        onConfirm: () => {
          let id
          try { update(s => { id = saveSessionAsRoutine(s, w, w.name) }) } catch (e) { toast(t(e.message)); return }
          nav('/plan/r/' + id)
        },
      }) },
      { icon: 'reset', label: t('Repeat today'), onClick: () => repeatWorkout(w) },
      { icon: 'pencil', label: t('Edit workout'), onClick: () => editWorkout(w, nav) },
      { icon: 'trash', label: t('Delete workout'), danger: true, onClick: () => confirmSheet({
        title: t('Delete workout?'),
        message: t('This removes it from your history for good.') + (media ? ' ' + tn('Its photo or video is deleted with it.', 'Its {0} photos or videos are deleted with it.', media) : ''),
        confirmText: t('Delete'), danger: true,
        onConfirm: () => { update(s => { s.workouts = s.workouts.filter(x => !sameWorkout(x, w)) }); toast(t('Workout deleted')) },
      }) },
      ...extra,
    ],
  })
}

export default function WorkoutCard({ w }) {
  const nav = useNavigate()
  const unit = useStore(s => s.S.unit)
  const mode = useStore(s => volumeMode(s.S))
  const entries = (w.entries || []).filter(e => (e.sets || []).some(hasCompletedWork))
  // D51: every record the workout set, worked out from the log; a trophy on each exercise that set one.
  const recs = useStore(s => workoutRecords(s.S, w))
  const prs = recs.length
  const prOf = e => recs.filter(r => r.i === w.entries.indexOf(e)).length
  const who = (useStore(s => s.user?.name) || '').trim()
  const hr = sanitizeHr(w.hr)   // D27: the session's average, when a watch saved one
  return <div className="card hv-wcard" {...tappable(() => workoutDetailSheet(w))} aria-label={(w.name || t('Workout')) + ', ' + workoutWhenText(w)}>
    {/* Hevy's head: avatar, who and when, ⋯; then the title */}
    <div className="hv-wcard-h">
      <span className="hv-avatar" aria-hidden="true">{who ? who[0].toUpperCase() : <Icon name="person" />}</span>
      <div className="hv-wcard-who">{who && <b>{who}</b>}<span className="hv-wcard-d">{workoutWhenText(w)}</span></div>
      <button type="button" className="iconbtn" aria-label={t('Share workout') + ', ' + (w.name || t('Workout'))}
        onClick={e => { e.stopPropagation(); shareWorkoutSheet(w) }}><Icon name="share" /></button>
      <button type="button" className="iconbtn" aria-label={t('More') + ', ' + (w.name || t('Workout'))}
        onClick={e => { e.stopPropagation(); workoutActions(w, nav) }}><Icon name="more" /></button>
    </div>
    <div className="hv-wcard-t">{w.name || t('Workout')}</div>
    {w.note && <p className="hv-wcard-note">{w.note}</p>}
    <div className="hv-wcard-stats">
      <div><span>{t('Time')}</span><b>{workoutTimeText(w)}</b></div>
      {mode === 'weight'
        ? <div><span>{t('Volume')}</span><b>{fmtVol(w.vol || 0, unit)}</b></div>
        : <div><span>{t('Sets')}</span><b>{workSets(w.entries)}</b></div>}
      {prs > 0 && <div><span>{t('Records')}</span><b className="hv-pr"><Icon name="trophy" />{prs}</b></div>}
      {hr && <div><span>{t('Heart rate')}</span><b className="hv-wcard-hr"><Icon name="heart" />{hr.avg}</b></div>}
    </div>
    {mode === 'sets' && <MuscleLine entries={w.entries} />}
    {entries.length > 0 && <div className="hv-wcard-lh">{t('Workout')}</div>}
    {entries.slice(0, SHOWN).map((e, i) => {
      const ex = EXIDX[e.id]
      const n = setUnits(e.sets, s => hasCompletedWork(s) && !isWarmupRow(s)).length
      // An exercise done only as warm-ups says so, rather than "0 sets" (D18 counts work sets).
      const warm = n ? 0 : e.sets.filter(s => hasCompletedWork(s) && isWarmupRow(s)).length
      return <div key={i} className="hv-wcard-ex">
        <span className="hv-thumb sm">{ex && <Thumb ex={ex} />}</span>
        <span className="grow"><b>{warm ? tn('{0} set', '{0} sets', warm) + ' (' + t('Warm-up') + ')' : tn('{0} set', '{0} sets', n)}</b> <span className={exerciseNameClass(ex)}>{ex ? exerciseNameFor(ex) : (e.n || e.id)}</span></span>
        {prOf(e) > 0 && <span className="hv-pr" aria-label={t('Records')}><Icon name="trophy" />{prOf(e)}</span>}
      </div>
    })}
    {entries.length > SHOWN && <div className="hv-wcard-more">{t('See more: {0}', exCount(entries.length - SHOWN))}</div>}
  </div>
}
