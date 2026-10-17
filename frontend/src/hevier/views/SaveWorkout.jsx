// Hevy's Save Workout page and its "Nice work!" summary (hevier/DECISIONS.md D10; reference/
// SCREENS.md §3). Finish reaches the page through seam S9: upstream's finishWorkout asks the fork
// first. The title and description are the session's own name and note, written the way
// upstream's Rename and Session note sheets write them; Save is upstream's doFinishWorkout,
// unchanged, and a When or Duration changed here is applied to the saved record afterwards, the
// way upstream's history sheets change them (hevier/lib/save-workout.js).
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtDur, todayISO } from '../../lib/format.js'
import { workoutVolume, setsDoneActive, setUnitsTotal, NOTE_MAX } from '../../lib/history.js'
import { loadOfWorkouts } from '../../lib/muscles.js'
import { EXIDX } from '../../lib/exercises.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { confirmSheet, doFinishWorkout, LastAndNext, CardioDone } from '../../sheets.jsx'
import BodyMap from '../../components/BodyMap.jsx'
import WorkoutMediaSection from '../../components/WorkoutMedia.jsx'
import Icon from '../../components/Icon.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import MuscleLine from '../components/MuscleLine.jsx'
import { volumeMode } from '../lib/volume.js'
import { whenOf, whenProblem, applyWhen, workoutNumber, workoutsInDays, TITLE_MAX } from '../lib/save-workout.js'
import { labelsAtFinish, withLabels } from '../lib/gym-labels.js'
import { routineUpdates, applyRoutineUpdates, undoRoutineUpdates, summaryParts } from '../lib/routine-update.js'

// D34: the session as it stood at Save, for the summary's Update routine button. The saved
// record drops an exercise with no ticked set, so what was taken out can only be read from here.
let savedSession = null

// Upstream's discard (views/Workout.jsx discardWorkout), from the Save page.
const discard = nav => confirmSheet({
  title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true,
  onConfirm: () => {
    useStore.getState().update(s => { s.active = null })
    useUI.getState().stopRest()
    useUI.getState().stopWork()
    nav('/home', { replace: true })
  },
})

export function SaveWorkout() {
  const nav = useNavigate()
  const A = useStore(s => s.S.active)
  const unit = useStore(s => s.S.unit)
  const mode = useStore(s => volumeMode(s.S))
  const [base] = useState(() => (A ? whenOf(A) : null))
  const [title, setTitle] = useState(A?.name || '')
  const [note, setNote] = useState(A?.note || '')
  const [date, setDate] = useState(base?.date || '')
  const [time, setTime] = useState(base?.time || '')
  const [min, setMin] = useState(null)   // null: the session's own length, still running
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 15000); return () => clearInterval(id) }, [])
  // Reached with no session to save (a reload after saving, a link): back to the Workout tab. A
  // session that ends while the page is open (Save, Discard) leaves through its own navigation,
  // which a redirect from here would overtake.
  const opened = useRef(!!base && !A?.editingWorkoutId)
  if (!opened.current) return <Navigate to="/workout" replace />
  if (!A) return null

  const done = setsDoneActive(A)
  const total = setUnitsTotal(A.entries)
  const live = whenOf(A).min
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/workout', { replace: true }))

  const save = () => {
    const when = { date, time, min }
    const problem = whenProblem(base, when, todayISO())
    if (problem) { useUI.getState().toast(t(problem)); return }
    const update = useStore.getState().update
    update(s => {
      if (!s.active) return
      const name = title.trim().slice(0, TITLE_MAX)
      if (name && name !== s.active.name) { s.active.name = name; s.active.customName = true }
      const text = note.trim().slice(0, NOTE_MAX)
      if (text) s.active.note = text; else delete s.active.note
    })
    const { S: cur0 } = useStore.getState()
    const cur = cur0.active
    const ref = { id: cur.id, d: cur.d, start: cur.start }
    // D28: upstream's finish keeps only the fields it knows, so the gym and machine labels are
    // written onto the saved record here, before it is moved.
    const labels = labelsAtFinish(cur0, cur)
    savedSession = structuredClone(cur)
    doFinishWorkout()
    update(s => {
      s.workouts = s.workouts.map(w => (sameWorkout(w, ref) ? withLabels(w, labels) : w))
      s.workouts = applyWhen(s.workouts, ref, base, when)
    })
  }

  return <div className="hv-save">
    <div className="hv-pagebar">
      <button type="button" className="iconbtn" aria-label={t('Back')} onClick={back}><Icon name="chevronLeft" /></button>
      <div className="hv-title">{t('Save Workout')}</div>
      <button type="button" className="btn primary pill hv-finish" onClick={save}>{t('Save')}</button>
    </div>
    <input className="hv-stitle" value={title} maxLength={TITLE_MAX} placeholder={t('Workout title')}
      aria-label={t('Workout title')} onChange={e => setTitle(e.target.value)} />
    <div className="hv-stats">
      <div><span>{t('Duration')}</span><b className="acc">{fmtDur((min ?? live) * 60000)}</b></div>
      {mode === 'weight' && <div><span>{t('Volume')}</span><b>{fmtNum(Math.round(workoutVolume(A)))} {unit}</b></div>}
      <div><span>{t('Sets')}</span><b>{done}</b></div>
    </div>
    {mode === 'sets' && <MuscleLine entries={A.entries} />}
    {done < total && <p className="hv-sub hv-warn">{!done
      ? t('You haven’t checked off any sets. Finish the workout anyway?')
      : tn('{0} set still unchecked. Finish the workout now?', '{0} sets still unchecked. Finish the workout now?', total - done)}</p>}
    <div className="hv-sgroup">
      <label className="hv-srow"><span>{t('When')}</span>
        <span className="hv-sval">
          <input type="date" className="timef" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
          <input type="time" className="timef" value={time} onChange={e => setTime(e.target.value)} />
        </span></label>
      <label className="hv-srow"><span>{t('Duration')}</span>
        <span className="hv-sval">
          <input type="number" inputMode="numeric" className="timef hv-smin" min={1} value={min ?? live}
            onChange={e => setMin(e.target.value === '' ? 0 : Math.round(Number(e.target.value)))} />
          <span className="muted">{t('min')}</span>
        </span></label>
    </div>
    <h4 className="sec">{t('Description')}</h4>
    <textarea className="input hv-sdesc" rows={4} maxLength={NOTE_MAX} value={note}
      placeholder={t('How did your workout go? Leave some notes here…')} onChange={e => setNote(e.target.value)} />
    <button type="button" className="btn hv-danger hv-sdiscard" onClick={() => discard(nav)}>{t('Discard Workout')}</button>
  </div>
}

// The summary, once upstream has saved the workout: the record is read back from the history, so
// a When or Duration changed on the Save page, and the badges worked out again, are what it shows.
export function WorkoutDone() {
  const nav = useNavigate()
  const { state } = useLocation()
  const st = useStore(s => s.S)
  // Read once, against the routines as they are after the save, so a swapped-in exercise starts
  // from today's weight (replaceSlotExercise).
  const [updates] = useState(() => {
    const session = savedSession?.id === state?.ref?.id ? savedSession : null
    savedSession = null
    return session ? routineUpdates(useStore.getState().S, session) : []
  })
  const w = state?.ref ? (st.workouts || []).find(x => sameWorkout(x, state.ref)) : null
  if (!w) return <Navigate to="/home" replace />
  const n = workoutNumber(st.workouts, w)
  const week = workoutsInDays(st.workouts, w, 7)
  const prs = w.prs || []
  const e1prs = (state.e1prs || []).filter(p => !prs.includes(p.id))
  const name = id => (EXIDX[id] ? exerciseNameFor(EXIDX[id]) : id)
  const finish = () => nav('/home', { replace: true })

  return <div className="hv-done">
    <div className="hv-pagebar">
      <div className="hv-title">{updates.length > 0 && <RoutineUpdateButton updates={updates} />}</div>
      <button type="button" className="btn primary pill hv-finish" onClick={finish}>{t('Done')}</button>
    </div>
    <div className="hv-done-top">
      <span className="hv-done-ic"><Icon name="trophy" /></span>
      <h2>{t('Nice work!')}</h2>
      {n > 0 && <p>{t('That’s workout number {0}.', n)}</p>}
    </div>
    <WorkoutCard w={w} />
    {(prs.length > 0 || e1prs.length > 0) && <div className="card hv-done-prs">
      {prs.map(id => <div key={id} className="hv-done-pr"><Icon name="trophy" />{t('New PR:')} <b className={exerciseNameClass(EXIDX[id])}>{name(id)}</b></div>)}
      {e1prs.map(p => <div key={p.id} className="hv-done-pr"><Icon name="chartLine" />{t('Best estimated 1RM:')} <b className={exerciseNameClass(EXIDX[p.id])}>{name(p.id)}</b> · {fmtNum(p.est)} {st.unit}</div>)}
    </div>}
    <p className="hv-done-week">{t('Workouts in the last 7 days: {0}', week)}</p>
    <h4 className="sec">{t('What you just trained')}</h4>
    <BodyMap load={loadOfWorkouts([w])} body={st.body} />
    <div style={{ height: 14 }} />
    <LastAndNext st={st} w={w} />
    <CardioDone st={st} w={w} />
    <WorkoutMediaSection w={w} hint />
    <button type="button" className="btn primary hv-done-btn" onClick={finish}>{t('Done')}</button>
  </div>
}


const SHOWN_MS = 5000

// D34: Hevy's "Update routine?" as a small button in the corner that goes by itself after five
// seconds. Ignored, nothing changes; a tap keeps everything the workout changed, with Undo.
function RoutineUpdateButton({ updates }) {
  const [state, setState] = useState('shown')   // shown → leaving → gone
  useEffect(() => {
    const ids = [setTimeout(() => setState(s => (s === 'shown' ? 'leaving' : s)), SHOWN_MS),
      setTimeout(() => setState('gone'), SHOWN_MS + 400)]
    return () => ids.forEach(clearTimeout)
  }, [])
  if (state === 'gone') return null
  const n = summaryParts(updates)
  const parts = [
    n.added && '+' + n.added,
    n.removed && '−' + n.removed,
    n.swapped && t('{0} swapped', n.swapped),
    n.changed && t('{0} changed', n.changed),
    n.moved && t('new order'),
  ].filter(Boolean).join(' · ')
  const label = updates.length === 1 ? t('Update {0}', updates[0].name) : t('Update {0} routines', updates.length)
  const run = () => {
    setState('gone')
    const { update } = useStore.getState()
    let before = []
    update(s => { before = applyRoutineUpdates(s, updates) })
    useUI.getState().toast(updates.length === 1 ? t('“{0}” updated', updates[0].name) : t('Routines updated'), {
      action: t('Undo'), onAction: () => update(s => { undoRoutineUpdates(s, before) }),
    })
  }
  return <button type="button" className={'hv-ru' + (state === 'leaving' ? ' leaving' : '')} onClick={run}>
    <Icon name="clipboard" />
    <span><b>{label}</b><small>{parts}</small></span>
  </button>
}
