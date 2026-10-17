// A finished workout as a Hevy feed card (reference/SCREENS.md §4): title, date, Time · Volume ·
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
import { volumeMode, workSets } from '../lib/volume.js'
import Icon from '../../components/Icon.jsx'
import { workoutTimeText, workoutWhenText } from '../lib/workout-when.js'

const SHOWN = 3
const toast = msg => useUI.getState().toast(msg)

// The actions of upstream's WorkoutDetail (sheets.jsx), with its wording and its confirms. `extra`
// items go last (Workout Detail's All details).
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
      { icon: 'pencil', label: t('Edit workout'), onClick: () => {
        try { update(s => { editCompletedSession(s, w) }); nav('/workout') } catch (e) { toast(t(e.message)) }
      } },
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
  const prs = w.prs?.length || 0
  return <div className="card hv-wcard" {...tappable(() => workoutDetailSheet(w))}>
    <div className="hv-wcard-h">
      <div className="hv-wcard-t">{w.name || t('Workout')}</div>
      <button type="button" className="iconbtn" aria-label={t('More')}
        onClick={e => { e.stopPropagation(); workoutActions(w, nav) }}><Icon name="more" /></button>
    </div>
    <div className="hv-wcard-d">{workoutWhenText(w)}</div>
    <div className="hv-wcard-stats">
      <div><span>{t('Time')}</span><b>{workoutTimeText(w)}</b></div>
      {mode === 'weight'
        ? <div><span>{t('Volume')}</span><b>{fmtVol(w.vol || 0, unit)}</b></div>
        : <div><span>{t('Sets')}</span><b>{workSets(w.entries)}</b></div>}
      {prs > 0 && <div><span>{t('Records')}</span><b className="hv-pr"><Icon name="trophy" />{prs}</b></div>}
    </div>
    {mode === 'sets' && <MuscleLine entries={w.entries} />}
    {entries.slice(0, SHOWN).map((e, i) => {
      const ex = EXIDX[e.id]
      const n = e.sets.filter(s => hasCompletedWork(s) && !isWarmupRow(s)).length
      return <div key={i} className="hv-wcard-ex">
        <span className="hv-thumb sm">{ex && <Thumb ex={ex} />}</span>
        <span className={'grow ' + exerciseNameClass(ex)}><b>{tn('{0} set', '{0} sets', n)}</b> {ex ? exerciseNameFor(ex) : (e.n || e.id)}</span>
      </div>
    })}
    {entries.length > SHOWN && <div className="hv-wcard-more">{t('See more: {0}', exCount(entries.length - SHOWN))}</div>}
  </div>
}
