// The live workout (hevier/DECISIONS.md D127, after D1 and D10): every exercise with its sets on
// one page, the next set opened up, a rest panel docked at the bottom, and a header of name,
// duration, heart rate and Finish, the gym and the workout note behind its chevron. It is the
// fork's only workout layout: views/Workout.jsx hands over at seam S3 after every one of its hooks
// has run, passing this screen its own handlers. Nothing here writes the session except through
// those handlers and upstream's sheets, so finishing, discarding, rest and progression are
// upstream's, unchanged.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { fmtDate } from '../lib/dates.js'
import { sessionNoProg } from '../../lib/session-noprog.js'
import {
  finishWorkout, exitWorkoutEdit, saveWorkoutEdits, menuSheet, sessionNoteSheet, renameWorkoutSheet,
  addRoutineToSessionSheet,
} from '../../sheets.jsx'
import { workoutSettingsSheet } from '../../components/WorkoutSettingsSheet.jsx'
import { HeaderClock, timerSheet } from '../components/ClockSheet.jsx'
import Elapsed from '../components/Elapsed.jsx'
import Icon from '../../components/Icon.jsx'
import HevyExerciseBlock from '../components/HevyExerciseBlock.jsx'
import HvIcon from '../components/HvIcon.jsx'
import StrapBpm from '../components/StrapBpm.jsx'
import RestDock from '../components/RestDock.jsx'
import { GymRow } from '../components/GymLabels.jsx'
import { useSupersetTarget } from './ExercisePickerHevy.jsx'
import { anyRunning, stopAll } from '../lib/set-timer.js'
import { insertAfter, placeAt } from '../lib/add-at-end.js'
import { exOr } from '../../lib/exercises.js'
import { partOn } from '../lib/module-parts.js'
import { unitMoveSteps } from '../lib/reorder-units.js'
import { openSet, pickAt } from '../lib/open-set.js'
import { scrollZone, progressOpen, resolveOpen } from '../lib/header-open.js'
import { propsSig } from '../lib/card-state.js'
import { weightDecimals } from '../../lib/format.js'
import { isPaused, canPause, pauseWorkout, resumeWorkout } from '../../lib/workout-pause.js'
import { nextAfterRest } from '../lib/next-after-rest.js'

// The rest whose end last brought the next exercise up: a page shown again over a rest still at
// its end does not scroll a second time.
let broughtUpFor = null

export default function HevyWorkout({ units, editing, blockProps, bindExRef, bindSetRef, actions }) {
  const nav = useNavigate()
  const opened = useLocation().key !== 'default'   // a page before this one to go back to
  const S = useStore(s => s.S)
  const resting = useUI(s => !!s.timer)
  const readyRestEnds = useUI(s => (s.timer?.ready ? s.timer.endsAt : undefined))
  const A = S.active
  const paused = isPaused(A)
  // D127: the set opened up, the next one to do until another is tapped (lib/open-set.js).
  const [pick, setPick] = useState(null)
  const open = openSet(A, pick)
  // D127: the gym and the note show at the page's top or bottom, at the start or near the end;
  // a tap on the name holds until that changes (lib/header-open.js).
  const [edge, setEdge] = useState(true)
  const zone = useRef(null)
  const detailsRef = useRef(null)
  useEffect(() => {
    const check = () => {
      // An open sheet locks the page with a fixed body and scrollY reads 0; its unlock scrolls back and rechecks.
      if (document.body.style.position === 'fixed') return
      const top = window.scrollY
      const gap = document.documentElement.scrollHeight - (top + window.innerHeight)
      const d = detailsRef.current
      const h = d ? d.getBoundingClientRect().height + (parseFloat(getComputedStyle(d).marginTop) || 0) : 0
      const z = zone.current = scrollZone(zone.current, top, gap, h)
      setEdge(z.top || z.end)   // React skips the render when it is unchanged
    }
    check()
    // once a frame: scroll fires faster than that, and check reads layout
    let frame = 0
    const soon = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; check() }) }
    window.addEventListener('scroll', soon, { passive: true })
    window.addEventListener('resize', soon)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', soon); window.removeEventListener('resize', soon) }
  }, [])
  const auto = edge || progressOpen(A, units)
  const [manual, setManual] = useState(null)
  const shown = resolveOpen(auto, manual)
  if (manual && !shown.manual) setManual(null)
  const details = shown.open
  const { addExercise, discardWorkout, markAllDone, pairAt, unpairAt, noProgSwitchable, toggleSessionNoProg } = actions
  // The picker's "Add superset": upstream's add puts each pick after the current one and moves
  // there, so the last one added is the session's current exercise.
  useSupersetTarget({
    items: () => useStore.getState().S.active?.entries || [],
    end: () => useStore.getState().S.active?.cur ?? -1,
    pair: pairAt,
    // D78: the exercise Insert puts the picks after, while that is not the end; where they go.
    insertAfter: () => { const e = insertAfter(useStore.getState().S.active); return e ? exOr(e.id) : null },
    placeAt: atEnd => useStore.getState().update(st => { if (st.active) placeAt(st.active, atEnd) }),
  })

  // Pause (D107, upstream's #976 and its togglePause): the workout clock stops, and so do the rest
  // and a hold with their alerts; upstream's hooks keep them held after a reload.
  const togglePause = () => {
    const ui = useUI.getState()
    if (isPaused(useStore.getState().S.active)) {
      useStore.getState().update(s => { if (s.active) resumeWorkout(s.active) })
      ui.resumeAuto()
    } else {
      useStore.getState().update(s => { if (s.active) pauseWorkout(s.active) })
      ui.pauseAuto()
    }
  }

  // Hevy's footer "Settings": the session's own options, upstream's header ⋯ without Layout (D1).
  const openSettings = () => menuSheet({
    sections: [
      { items: [{ icon: 'gear', accent: true, chevron: true, label: t('Workout settings'), onClick: workoutSettingsSheet }] },
      { items: [
        canPause(A) && { icon: paused ? 'play' : 'pause', label: paused ? t('Resume workout') : t('Pause workout'),
          sub: paused ? undefined : t('The clock and the rest wait for you'), onClick: togglePause },
        !editing && { icon: 'clipboard', label: t('Add routine'), sub: t('Bring another routine into this session'), onClick: addRoutineToSessionSheet },
        { icon: 'pencil', label: t('Rename workout'), onClick: renameWorkoutSheet },
        noProgSwitchable && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('Every exercise in this workout'), on: sessionNoProg(A), onClick: toggleSessionNoProg },
        A.backfill && A.entries.length > 0 && { icon: 'checkCircle', label: t('Mark all sets done'), onClick: markAllDone },
      ] },
    ],
  })

  // Reorder exercises: a drag is played as upstream's one-step moves, which also keep the rest
  // timer and the progress marks on their exercises; a refused step (a timed set running) ends it.
  const reorder = (from, to) => {
    for (const { at, dir } of unitMoveSteps(useStore.getState().S.active?.entries, from, to)) {
      const was = useStore.getState().S.active
      const p = blockProps(at)
      ;(dir < 0 ? p.onMoveUp : p.onMoveDown)()
      if (useStore.getState().S.active === was) break
    }
  }

  // Each card is memo'd (HevyExerciseBlock): it gets its latest props through a holder that keeps
  // its identity, and re-renders when what it draws from them changes (propsSig).
  const holders = useRef(new Map())
  // A card's set rows by index, to bind again to the entry's new object when the card skips a render:
  // upstream keys its row refs by the entry object, which every change replaces.
  const rows = useRef(new Map())
  const block = (idx, unit) => {
    const entry = A.entries[idx]
    const props = {
      ...blockProps(idx),
      // App sets the decimals in an effect; a memo'd card takes them on at the next render, as the rest of the app does
      wdec: weightDecimals(),
      superset: unit.length > 1 ? unit : null,
      onUnpair: unit.length > 1 ? () => unpairAt(idx) : null,
      onPairPrev: idx > 0 ? () => pairAt(idx - 1, idx) : null,
      onPairNext: idx < A.entries.length - 1 ? () => pairAt(idx, idx + 1) : null,
      onReorder: units.length > 1 ? reorder : null,
      open: open?.idx === idx ? open : null,
      onOpen: i => setPick(pickAt(useStore.getState().S.active, idx, i)),
      onSetRowRef: (i, el) => {
        let m = rows.current.get(idx)
        if (!m) rows.current.set(idx, (m = new Map()))
        if (el) m.set(i, el); else m.delete(i)
        bindSetRef(entry, i, el)
      },
    }
    let live = holders.current.get(idx)
    if (!live) holders.current.set(idx, (live = {}))
    live.current = props
    return <HevyExerciseBlock entryIdx={idx} live={live} sig={propsSig(props)} />
  }
  // D107: with "Next exercise when the rest ends" on, the rest after an exercise's last set brings
  // the next one up, its open set in the middle. Upstream's effect moves `cur` the same way.
  useEffect(() => {
    if (readyRestEnds === undefined || broughtUpFor === readyRestEnds) return
    const st = useStore.getState().S
    const live = st.active
    if (!live || live.backfill || live.editingWorkoutId) return
    const to = nextAfterRest(live.entries, useUI.getState().timer?.forIdx, st.autoNextExercise === true)
    if (to == null) return
    broughtUpFor = readyRestEnds
    const i = live.entries[to].sets.findIndex(x => !x.done)
    const el = rows.current.get(to)?.get(i) || document.querySelector(`[data-exidx="${to}"]`)
    // shortcut: a sheet open as the rest ends locks the page (fixed body) and the scroll is lost; fine while sheets over a rest are rare.
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // No focus moved: a caret in a field stays where the user put it.
    el?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [readyRestEnds])
  const bindEx = (idx, el) => {
    const entry = A.entries[idx]
    bindExRef(entry, el)
    if (el) for (const [i, r] of rows.current.get(idx) || []) bindSetRef(entry, i, r)
  }

  // An edited workout goes back where its edit was opened (the feed, its detail page), not to
  // upstream's History page, which is where upstream's save and close go by default.
  const leave = () => (opened ? nav(-1) : nav('/home'))

  const live = !(A.backfill || editing)
  return <div className="hv-workout">
    {/* a heading TalkBack can jump to; the name on the bar is a button */}
    <h1 className="vh">{editing ? t('Edit workout') : A.name || t('Log workout')}</h1>
    <div className="hv-whdr">
      <div className="hv-bar">
        {editing
          ? <button className="iconbtn" aria-label={t('Close editor')} onClick={() => exitWorkoutEdit(leave)}><Icon name="xmark" /></button>
          : <button className="iconbtn" aria-label={t('Minimize')} onClick={() => nav('/home')}><Icon name="chevronDown" /></button>}
        {/* The gym and the workout note open below the name, by themselves or by its chevron (D127). */}
        <button type="button" className="hv-title hv-wname" aria-expanded={details} onClick={() => setManual({ auto, open: !details })}>
          <span>{editing ? t('Edit workout') : A.name || t('Log workout')}</span>
          <Icon name={details ? 'chevronUp' : 'chevronDown'} className="hv-wname-chev" /></button>
        <span className="hv-wtime">{live ? <>{paused && t('Paused') + ' '}<Elapsed start={A.start} pausedAt={A.pausedAt} /></> : fmtDate(A.d, true)}</span>
        {live && partOn(S, 'health', 'strap') && <StrapBpm />}
        {live && partOn(S, 'hvWorkout', 'clock') && <button className="iconbtn hv-clockbtn" onClick={timerSheet}>
          <span className="vh">{resting ? t('Rest timer') : t('Timer')}</span><HvIcon name="alarm" /><HeaderClock session={A.id} /></button>}
        <button className="btn primary pill hv-finish" onClick={() => {
          // A set's count-up timer still running stops here, its time written in (D53).
          if (anyRunning(useStore.getState().S.active)) useStore.getState().update(st => { stopAll(st.active) }, true)
          if (editing) saveWorkoutEdits(leave)
          else finishWorkout()
        }}>{editing ? t('Save') : t('Finish')}</button>
      </div>
      {details && <div className="hv-wdetails" ref={detailsRef}>
        <GymRow />
        <button type="button" className={'hv-notes hv-wnote' + (A.note ? ' has' : '')} onClick={sessionNoteSheet}>
          {A.note || t('Workout note')}
        </button>
      </div>}
    </div>
    {/* Hevy's Edit Workout leads with the title; a tap opens the same rename as Settings. */}
    {editing && <button type="button" className={'hv-wtitle' + (A.name ? '' : ' empty')} onClick={renameWorkoutSheet}>{A.name || t('Workout title')}</button>}
    {editing && <p className="hv-sub">{t('Editing a saved workout. Date and duration stay unchanged.')}</p>}
    {A.backfill && <p className="hv-sub">{t('Logging a past workout, so no rest timers.')}</p>}

    {A.entries.length ? units.map(u => <section key={u.join('-')} className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
      {u.map(idx => <div key={idx} ref={el => bindEx(idx, el)} data-exidx={idx}>{block(idx, u)}</div>)}
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
    {!editing && <RestDock />}
  </div>
}
