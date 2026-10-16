// The Hevy "Log Workout" screen (hevier/DECISIONS.md D1, D10; reference/SCREENS.md §2). It is the
// fork's only workout layout: views/Workout.jsx hands over at seam S3 after every one of its hooks
// has run, passing this screen its own handlers. Nothing here writes the session except through
// those handlers and upstream's sheets, so finishing, discarding, rest and progression are
// upstream's, unchanged.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { workoutVolume } from '../../lib/history.js'
import { sessionNoProg } from '../../lib/session-noprog.js'
import {
  finishWorkout, exitWorkoutEdit, menuSheet, sessionNoteSheet, renameWorkoutSheet,
  addRoutineToSessionSheet,
} from '../../sheets.jsx'
import { workoutSettingsSheet } from '../../components/WorkoutSettingsSheet.jsx'
import { adjustRestSheet } from '../../components/RestTimer.jsx'
import Elapsed from '../../components/Elapsed.jsx'
import Icon from '../../components/Icon.jsx'
import HevyExerciseBlock from '../components/HevyExerciseBlock.jsx'
import KeypadBar from '../components/KeypadBar.jsx'
import HvIcon from '../components/HvIcon.jsx'

export default function HevyWorkout({ units, editing, done, blockProps, bindExRef, bindSetRef, actions }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const resting = useUI(s => !!s.timer)
  const A = S.active
  const { addExercise, discardWorkout, markAllDone, pairAt, unpairAt, noProgSwitchable, toggleSessionNoProg } = actions

  // Finish: the editor of a saved workout saves at once; a session goes to the Save Workout page
  // (seam S9 sends upstream's finishWorkout there).
  const finish = () => finishWorkout()
  // Hevy's footer "Settings": the session's own options, upstream's header ⋯ without Layout (D1).
  const openSettings = () => menuSheet({
    sections: [
      { items: [{ icon: 'gear', accent: true, chevron: true, label: t('Workout settings'), onClick: workoutSettingsSheet }] },
      { items: [
        !editing && { icon: 'clipboard', label: t('Add routine'), sub: t('Bring another routine into this session'), onClick: addRoutineToSessionSheet },
        { icon: 'pencil', label: t('Rename workout'), onClick: renameWorkoutSheet },
        { icon: 'note', label: A.note ? t('Edit session note') : t('Add session note'), onClick: sessionNoteSheet },
        noProgSwitchable && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('Every exercise in this workout'), on: sessionNoProg(A), onClick: toggleSessionNoProg },
        A.backfill && A.entries.length > 0 && { icon: 'checkCircle', label: t('Mark all sets done'), onClick: markAllDone },
      ] },
    ],
  })

  const block = (idx, unit) => {
    const props = blockProps(idx)
    const entry = A.entries[idx]
    return <HevyExerciseBlock entryIdx={idx} {...props}
      superset={unit.length > 1 ? unit : null}
      onUnpair={unit.length > 1 ? () => unpairAt(idx) : null}
      onPairPrev={idx > 0 ? () => pairAt(idx - 1, idx) : null}
      onPairNext={idx < A.entries.length - 1 ? () => pairAt(idx, idx + 1) : null}
      onSetRowRef={(i, el) => bindSetRef(entry, i, el)} />
  }

  return <div className="hv-workout">
    <div className="hv-whdr">
      <div className="hv-bar">
        {editing
          ? <button className="iconbtn" aria-label={t('Close editor')} onClick={() => exitWorkoutEdit()}><Icon name="xmark" /></button>
          : <button className="iconbtn" aria-label={t('Minimize')} onClick={() => nav('/home')}><Icon name="chevronDown" /></button>}
        <div className="hv-title">{editing ? t('Edit workout') : A.name || t('Log workout')}</div>
        {!editing && !A.backfill && <button className="iconbtn" aria-label={t('Rest timer')} disabled={!resting}
          onClick={adjustRestSheet}><HvIcon name="alarm" /></button>}
        <button className="btn primary pill hv-finish" onClick={finish}>{editing ? t('Save') : t('Finish')}</button>
      </div>
      <div className="hv-stats">
        <div><span>{t('Duration')}</span><b className="acc">{(A.backfill || editing) ? fmtDate(A.d, true) : <Elapsed start={A.start} />}</b></div>
        <div><span>{t('Volume')}</span><b>{fmtNum(Math.round(workoutVolume(A)))} {S.unit}</b></div>
        <div><span>{t('Sets')}</span><b>{done}</b></div>
      </div>
    </div>
    {editing && <p className="hv-sub">{t('Editing a saved workout. Date and duration stay unchanged.')}</p>}
    {A.backfill && <p className="hv-sub">{t('Logging a past workout, so no rest timers.')}</p>}

    {A.entries.length ? units.map(u => <section key={u.join('-')} className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
      {u.map(idx => <div key={idx} ref={el => bindExRef(A.entries[idx], el)} data-exidx={idx}>{block(idx, u)}</div>)}
    </section>) : <div className="hv-empty">
      <Icon name="dumbbell" />
      <b>{t('Get started')}</b>
      <span>{t('Add an exercise to start your workout')}</span>
    </div>}

    <button type="button" className="btn primary hv-addex" onClick={addExercise}><Icon name="plus" />{t('Add Exercise')}</button>
    <div className="hv-foot">
      <button type="button" className="btn" onClick={openSettings}>{t('Settings')}</button>
      {!editing && <button type="button" className="btn hv-danger" onClick={discardWorkout}>{t('Discard Workout')}</button>}
    </div>
    <div className="workout-end-spacer" />
    <KeypadBar />
  </div>
}
