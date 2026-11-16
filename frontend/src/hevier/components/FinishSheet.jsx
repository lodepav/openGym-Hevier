// The Finish sheet over the live workout (hevier/DECISIONS.md D132, D129): the routine's name, the
// sets and new best sets, the duration (a tap changes it), a word on sets left unticked, an
// unticked "Update the routine too" when the workout changed its routine, Save, and under it the
// title, gym and note, and Discard. Finish reaches it through seam S9 (upstream's finishWorkout
// asks the fork first). Save is upstream's doFinishWorkout, unchanged; the gym and brand labels,
// OpenBite's phase and a changed duration are then written onto the saved record, as the Save
// Workout page did, and the workout lands on Today with a "Workout saved" message.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn } from '../../lib/i18n.js'
import { NOTE_MAX } from '../../lib/history.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { confirmSheet, doFinishWorkout } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { hooks } from '../hooks.js'
import { durationWords } from '../lib/elapsed.js'
import { sessionMin, durationProblem, applyDuration, TITLE_MAX } from '../lib/save-workout.js'
import { labelsAtFinish, withLabels, workoutGym, gymName } from '../lib/gym-labels.js'
import { withPhase } from '../lib/shared-phase.js'
import { readSharedPhase } from '../lib/shared-phase-run.js'
import { routineUpdates, applyRoutineUpdates } from '../lib/routine-update.js'
import { finishFacts, changedText } from '../lib/finish-facts.js'
import { partOn } from '../lib/module-parts.js'
import { gymSheet } from './GymLabels.jsx'
import { markDiscarded } from '../../lib/watch-sync.js'

// Upstream's discard (views/Workout.jsx discardWorkout), from the sheet.
const discard = (nav, close) => confirmSheet({
  title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true,
  onConfirm: () => {
    close()
    markDiscarded(useStore.getState().S.active?.id)   // a watch must not save it to Health (upstream #776)
    useStore.getState().update(s => { s.active = null })
    useUI.getState().stopRest()
    useUI.getState().stopWork()
    nav('/home', { replace: true })
  },
})

// The minutes of `h` hours and `m` minutes as typed, a cleared field being 0.
const hm = (h, m) => Math.max(0, Math.round(Number(h) || 0) * 60 + Math.round(Number(m) || 0))

function FinishSheet({ nav, close }) {
  const A = useStore(s => s.S.active)
  const gym = useStore(s => { const g = workoutGym(s.S, s.S.active); return g ? (gymName(s.S, g) || t('Removed gym')) : '' })
  // Worked out once as the sheet opens: typing a title or note changes none of it.
  const [facts] = useState(() => finishFacts(useStore.getState().S))
  const [keepInRoutine, setKeep] = useState(false)
  const [title, setTitle] = useState(A?.name || '')
  const was = useRef({ name: A?.name, customName: A?.customName })
  const [note, setNote] = useState(A?.note || '')
  const [min, setMin] = useState(null)   // null: the session's own length, still running
  const [editMin, setEditMin] = useState(false)
  const [more, setMore] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 15000); return () => clearInterval(id) }, [])
  // D93: OpenBite's phase, read as the sheet opens so Save has it at once. A workout logged into
  // the past gets none: today's phase says nothing about that day.
  const phase = useRef(null)
  useEffect(() => { const S = useStore.getState().S; if (!S.active?.backfill && partOn(S, 'integrations', 'openbite')) readSharedPhase().then(p => { phase.current = p }) }, [])
  // The session ended elsewhere (another device): nothing left to finish.
  useEffect(() => { if (!A) close() }, [A, close])
  if (!A) return null

  const len = min ?? sessionMin(A)
  // The title and note go into the session as they are typed, so closing the sheet or an app
  // kill keeps them; Save writes them once more.
  const keep = (title, note) => useStore.getState().update(s => {
    if (!s.active) return
    const name = title.trim().slice(0, TITLE_MAX)
    // A title cleared or typed back to what the sheet opened with: that name as it was.
    if (!name || name === was.current.name) {
      s.active.name = was.current.name
      if (was.current.customName) s.active.customName = true; else delete s.active.customName
    } else if (name !== s.active.name) { s.active.name = name; s.active.customName = true }
    const text = note.trim().slice(0, NOTE_MAX)
    if (text) s.active.note = text; else delete s.active.note
  })

  const save = () => {
    const problem = durationProblem(A, min)
    if (problem) { useUI.getState().toast(t(problem)); return }
    keep(title, note)
    const { S: cur0 } = useStore.getState()
    const cur = cur0.active
    const ref = { id: cur.id, d: cur.d, start: cur.start }
    // D28: upstream's finish keeps only the fields it knows, so the gym and machine labels are
    // written onto the saved record here, after it is saved.
    const labels = labelsAtFinish(cur0, cur)
    // The saved record drops an exercise with no ticked set: what was taken out is read from here.
    const session = keepInRoutine ? structuredClone(cur) : null
    close()
    doFinishWorkout()
    useStore.getState().update(s => {
      s.workouts = s.workouts.map(w => (sameWorkout(w, ref) ? withPhase(withLabels(w, labels), phase.current) : w))
      s.workouts = applyDuration(s.workouts, ref, min)
      // Against the routines as they are after the save, so a swapped-in exercise starts from
      // today's weight (replaceSlotExercise).
      if (session) applyRoutineUpdates(s, routineUpdates(s, session))
    })
    // doFinishWorkout wrote the day's auto-backup before the labels and the date above: again,
    // so the backup holds the workout as saved (D20).
    useStore.getState().autoBackupNow()
  }

  const left = facts.unticked
  return <div className="hv-fin">
    <div className="hv-fin-hd">
      <h3>{t('Finish {0}?', A.name || t('Workout'))}</h3>
      <span className="hv-sub">{tn('{0} set', '{0} sets', facts.sets)}
        {facts.best > 0 && <> · <Icon name="trophy" className="hv-fin-best" />{t('{0} best', facts.best)}</>}</span>
    </div>
    <div className="hv-fin-kv">
      <span>{t('Duration')}</span>
      {editMin
        ? <span className="hv-fin-dur">
          {/* hours and minutes, each typed on its own */}
          <input type="number" inputMode="numeric" className="timef hv-fin-min" min={0} value={Math.floor(len / 60)} autoFocus
            aria-label={t('Hours')} onChange={e => setMin(hm(e.target.value, len % 60))} />
          <span className="muted">h</span>
          <input type="number" inputMode="numeric" className="timef hv-fin-min" min={0} max={59} value={len % 60}
            aria-label={t('Minutes')} onChange={e => setMin(hm(Math.floor(len / 60), e.target.value))} />
          <span className="muted">{t('min')}</span>
        </span>
        : <button type="button" className="hv-fin-durbtn" aria-label={t('Duration') + ': ' + durationWords(len * 60000) + '. ' + t('Change')}
          onClick={() => setEditMin(true)}>{durationWords(len * 60000)}</button>}
    </div>
    {left > 0 && <p className="hv-fin-warn">{facts.none
      ? t('You haven’t checked off any sets. Finish the workout anyway?')
      : tn('{0} set still unchecked. Finish the workout now?', '{0} sets still unchecked. Finish the workout now?', left)}</p>}
    {facts.changed && <button type="button" role="checkbox" aria-checked={keepInRoutine} className="hv-fin-chk" onClick={() => setKeep(v => !v)}>
      <span className={'chk' + (keepInRoutine ? ' on' : '')} aria-hidden="true"><Icon name="check" /></span>
      <span><b>{t('Update the routine too')}</b><small>{changedText(facts.changed, t)}</small></span>
    </button>}
    <button type="button" className="btn primary hv-fin-save" onClick={save}>{t('Save')}</button>
    <div className="hv-fin-foot">
      <button type="button" className="hv-fin-more" aria-expanded={more} onClick={() => setMore(v => !v)}>
        {t('Title, gym, note')}<Icon name={more ? 'chevronDown' : 'chevronRight'} /></button>
      <button type="button" className="hv-fin-discard" onClick={() => discard(nav, close)}>{t('Discard')}</button>
    </div>
    {more && <div className="hv-fin-fields">
      <input className="input hv-fin-title" value={title} maxLength={TITLE_MAX} placeholder={t('Workout title')}
        aria-label={t('Workout title')} onChange={e => { setTitle(e.target.value); keep(e.target.value, note) }} />
      <button type="button" className="hv-fin-gym" onClick={() => gymSheet(nav)}><span>{t('Gym')}</span>
        <span>{gym || t('No gym')}<Icon name="chevronRight" /></span></button>
      <textarea className="input hv-fin-note" rows={3} maxLength={NOTE_MAX} value={note} aria-label={t('Description')}
        placeholder={t('How did your workout go? Leave some notes here…')} onChange={e => { setNote(e.target.value); keep(title, e.target.value) }} />
    </div>}
  </div>
}

/** Finish opens the sheet over the workout, and a saved workout lands on Today with a message
 *  whose Open shows it (S9). */
export function installFinishHook(nav) {
  hooks.finish = () => useUI.getState().openSheet(close => <FinishSheet nav={nav} close={close} />)
  hooks.done = ({ w }) => {
    nav('/home', { replace: true })
    useUI.getState().toast(t('Workout saved'), { action: t('Open'), onAction: () => hooks.workoutDetail?.(w) })
  }
}
