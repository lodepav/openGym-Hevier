// Hevy's Workout tab (hevier/DECISIONS.md D13; reference/SCREENS.md §1), shown on /workout when no
// session is open: Quick Start, a Today card from openGym's schedule or rotation, then the
// routines with Start Routine. Starting goes through upstream's startFlow, editing through its
// routine editor, and the schedule stays on upstream's Plan screen.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { effectiveRoutines, effectiveRoutineIds } from '../../lib/history.js'
import { todayISO, uid, exCount } from '../../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { pinState } from '../../lib/queue.js'
import { copyRoutine, deleteRoutine } from '../../lib/routines.js'
import { DEFAULT_GLYPH } from '../../lib/glyphs.js'
import { startFlow, starterPlanSheet, menuSheet } from '../../sheets.jsx'
import { deleteRoutineWithUndo } from '../../views/Plan.jsx'
import Icon from '../../components/Icon.jsx'

export default function WorkoutTab() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const todayIds = effectiveRoutineIds(S, todayISO())
  const today = effectiveRoutines(S, todayISO())
  const todayName = today.map(r => r.name).join(' + ')
  const moved = S.dayPlan[todayISO()] !== undefined && pinState(S, S.dayPlan[todayISO()]) !== 'done'
  const doneToday = S.workouts.some(w => w.d === todayISO() && today.some(r => (w.routineIds || [w.routineId]).includes(r.id)))

  // The same new routine Plan makes, opened straight in the editor.
  const newRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }
  // Plan's swipe actions, from Hevy's ⋯: duplicate right below with an Undo, delete with an Undo.
  const duplicate = r => {
    const copy = copyRoutine(r, t('Copy'))
    update(s => {
      const at = s.routines.findIndex(x => x.id === r.id)
      s.routines.splice(at < 0 ? s.routines.length : at + 1, 0, copy)
    })
    useUI.getState().toast(t('Copied as “{0}”.', copy.name), { action: t('Undo'), onAction: () => {
      update(s => { if (s.routines.some(x => x.id === copy.id)) deleteRoutine(s, copy.id) })
    } })
  }
  const more = r => menuSheet({
    title: r.name,
    items: [
      { icon: 'pencil', label: t('Edit routine'), onClick: () => nav('/plan/r/' + r.id) },
      { icon: 'copy', label: t('Duplicate'), onClick: () => duplicate(r) },
      { icon: 'trash', label: t('Delete routine'), danger: true, onClick: () => deleteRoutineWithUndo(r.id) },
    ],
  })
  // Each name keeps its own casing class (lib/i18n-core.js exerciseNameClass), as upstream's lists do.
  const preview = r => r.ex.map((e, i) => <span key={i} className={exerciseNameClass(EXIDX[e.id])}>
    {i ? ', ' : ''}{EXIDX[e.id] ? exerciseNameFor(EXIDX[e.id]) : e.n || e.id}</span>)

  return <div className="narrow hv-wtab">
    <div className="hdr"><h1>{t('Workout')}</h1></div>

    <h4 className="sec">{t('Quick Start')}</h4>
    <button type="button" className="btn hv-quick" onClick={() => startFlow([])}><Icon name="plus" />{t('Start Empty Workout')}</button>

    {today.length > 0 && <div className="card hv-today">
      <div className="grow">
        <div className="hv-sub">{t('Today')}{moved ? ' · ' + t('rescheduled') : ''}{doneToday ? ' · ' + t('done') : ''}</div>
        <div className="hv-today-n">{todayName}</div>
      </div>
      <button type="button" className="btn primary pill" onClick={() => startFlow(todayIds)}>{t('Start')}</button>
    </div>}

    <div className="row between hv-rhead"><h4 className="sec">{t('Routines')}</h4></div>
    <div className="hv-rbtns">
      <button type="button" className="btn" onClick={newRoutine}><Icon name="clipboard" />{t('New Routine')}</button>
      <button type="button" className="btn" onClick={starterPlanSheet}><Icon name="magnifier" />{t('Explore')}</button>
      <button type="button" className="btn" onClick={() => nav('/plan')}><Icon name="calendar" />{t('Schedule')}</button>
    </div>

    {S.routines.length > 0 && <h4 className="sec">{t('My Routines ({0})', S.routines.length)}</h4>}
    {S.routines.map(r => <div key={r.id} className="card hv-rcard">
      <div className="row between">
        <button type="button" className="hv-rname" onClick={() => nav('/plan/r/' + r.id)}>{r.name}</button>
        <button type="button" className="iconbtn" aria-label={t('More')} onClick={() => more(r)}><Icon name="more" /></button>
      </div>
      <div className="hv-rpreview">{r.ex.length ? preview(r) : exCount(0)}</div>
      <button type="button" className="btn primary" disabled={!r.ex.length} onClick={() => startFlow([r.id])}>{t('Start Routine')}</button>
    </div>)}
    {!S.routines.length && <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Make one, or grab the starter plan to get going.')}</div>}
  </div>
}
