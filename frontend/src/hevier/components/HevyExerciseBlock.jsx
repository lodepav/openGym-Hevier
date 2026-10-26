// One exercise in the Hevy workout screen (hevier/DECISIONS.md D2–D9, reference/SCREENS.md §2):
// thumbnail · blue name · ⋮, the notes, "Rest Timer: …", then the SET · PREVIOUS · KG · REPS · ✓
// table and a full-width "+ Add Set". The columns follow the exercise's mode as upstream's block
// does: KG · REPS, KG · TIME for a timed hold, TIME · speed (· incline) for cardio, the last two
// with Hevy's count-up timer (D53), and an L and an R line under one set number for a per-side exercise.
//
// Presentation only. Every change to the session goes through the handlers the workout screen
// passes in (`blockProps` in views/Workout.jsx) or through upstream's pure helpers in lib/, the
// same calls upstream's ExerciseBlock makes, so ticking, rest, supersets, progression and sync
// behave exactly as they do there. The brand line under the name (D28) writes only the fork's own
// label fields (components/GymLabels.jsx).
import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr, isAssisted } from '../../lib/exercises.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtPlate } from '../../lib/format.js'
import { restTimerText, elapsedClock } from '../lib/elapsed.js'
import { isCable, hasLabel, sessionLabelKey } from '../lib/gym-labels.js'
import {
  EFFORT, effortOf, modeOf, isBw, isPerSide, exNoteFor, pinnedNoteFor, makeWarmupAt, makeWorkAt,
  setSpanAt, lastEntryFor,
} from '../../lib/history.js'
import { isWarmupRow, isFailureSet, isSideSet, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { speedUnitOf } from '../../lib/speed.js'
import { dropGrid, loadKindFor, baseWeightFor, inventoryFor } from '../../lib/plates.js'
import { effortColor } from '../../lib/effort.js'
import { sessionHistory } from '../../lib/backfill.js'
import { progressionGuidance } from '../../lib/progression-copy.js'
import { supersetMeta } from '../../lib/superset-meta.js'
import { confirmSheet, effortPickerSheet, exerciseDetailSheet, exerciseNoteSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import SwipeRow from '../../components/SwipeRow.jsx'
import Icon from '../../components/Icon.jsx'
import { Check } from '../../components/ui.jsx'
import { workoutControls } from '../../lib/workout-controls.js'
import { previousSetsFor, previousMode } from '../lib/previous-sets.js'
import { nextSet } from '../lib/next-set.js'
import { liveRecords, recordsAt, recordValue, KINDS } from '../lib/records.js'
import { BrandLine } from './GymLabels.jsx'
import HintNumberField from './HintNumberField.jsx'
import DurationField from './DurationField.jsx'
import { isHoldRow, toHold, toReps, toSideHold, fromSideHold, setNumberOf, isPairTail, setTicked, HOLD_SEC } from '../lib/hold-set.js'
import Elapsed from './Elapsed.jsx'
import HvIcon from './HvIcon.jsx'
import { RUN, secOf, fieldValue, stopped, startRun, runningSec } from '../lib/set-timer.js'
import { holdClockSheet, openHoldClock } from './ClockSheet.jsx'
import { bestsFor, oddValues, longRun, lastRowOf } from '../lib/odd-value.js'
import { previousText } from '../lib/set-text.js'
import { fieldSig } from '../lib/store-watch.js'
import { exUnitOf, exUnitChoice, shown, convert } from '../lib/ex-unit.js'
import { setColumns, viewOf } from '../lib/set-columns.js'
import { filledFromLast } from '../lib/plain-routine.js'
import { moveOrder, movedTo, relaySuggestions } from '../lib/phase-relay.js'
import { sideOrderOf } from '../lib/side-order.js'
import { plateLineOn } from '../lib/settings.js'
import { withDrop, withBurst, withFailure, withSideField } from '../lib/set-rows.js'
import { useTouchedFields } from './useTouchedFields.js'
import { setLoads, plateLineAt } from '../lib/plate-line.js'
import { setTypeMenu, exerciseMenu } from './exercise-menus.js'
import SubRows from './SubRows.jsx'

const setUI = patch => useUI.setState?.(patch)

export default function HevyExerciseBlock(props) {
  const {
    entryIdx, editing, superset, onToggle, onToggleSide, onField, onAddSet, onRemoveSetAt, onCopySetAt,
    onRest, onNoProg, onSetRowRef,
  } = props
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const restEnds = useUI(s => s.timer?.endsAt)
  const swipeHint = useUI(s => (s.swipeHint?.idx === entryIdx ? s.swipeHint : null))
  const setFlash = useUI(s => (s.setFlash?.idx === entryIdx ? s.setFlash : null))
  const working = useUI(s => s.work)

  const entry = S.active.entries[entryIdx]
  const { isTouched, touch, untouch, reorder, typedOver } = useTouchedFields(entry.sets)
  const rowEls = useRef({})
  const ex = exOr(entry.id)
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = isBw(cfg)
  // The history only changes when a workout is saved, not for each set typed: kept, not rebuilt on
  // every render (battery). Only its workouts are read. The store deep-copies S on
  // every change, so the log is compared by content (fieldSig), not by identity.
  const A = S.active
  const history = useMemo(() => ({ workouts: sessionHistory(S).workouts }),
    [fieldSig(S, 'workouts'), A.backfill, A.editingWorkoutId, A.d, A.start]) // eslint-disable-line react-hooks/exhaustive-deps
  // D82: last time on this machine (its brand and cable setup), else with none.
  const prev = previousSetsFor(history, entry, previousMode(S), { label: sessionLabelKey(S, A, entryIdx) })
  // The set to do next: a lighter row with a blue edge, its values white and bold (lib/next-set.js).
  const next = S.active && !S.active.editingWorkoutId ? nextSet(S.active) : null
  const isNext = i => next?.idx === entryIdx && next.i === i
  // D22, D51: the sets that hold a record so far, every kind, by the label the session shows.
  const prSets = new Set(recordsAt(liveRecords(S), entryIdx).map(r => r.set))
  const last = lastEntryFor(history, entry.id, entry.rid)
  const effortKind = effortOf(S)
  const effortCol = EFFORT[effortKind]
  const controls = workoutControls(S)
  const guidance = progressionGuidance(entry.plan)
  const unit = S.unit
  // D41: the unit this exercise is shown and typed in; stored weights stay in the profile's.
  const exUnit = exUnitOf(S, entry.id)
  const convertsUnit = exUnit !== unit
  const showWeight = v => (convertsUnit ? shown(v, unit, exUnit) : v)
  const mode = modeOf(cfg)
  const timed = mode === 'time', cardio = mode === 'cardio'
  const perSide = mode === 'reps' && isPerSide(cfg)
  // D72: the side done first is drawn first; the set's number and row ref go on it.
  const [first, second] = sideOrderOf(S, entry.id)
  const speedUnit = speedUnitOf(S)

  // D43: a cable on two stacks is typed per stack; the header says so.
  const perStack = isCable(entry.id) && entry.target?.dbLoad === 'each'
  const cols = setColumns({ mode, bw, perStack, unit, exUnit, speedUnit, ex, sets: entry.sets })
  // D89: a hold in a reps exercise has TIME in the REPS column, and the ▶ timer.
  const holdCols = mode === 'reps' ? setColumns({ mode: 'time', bw, perStack, unit, exUnit, speedUnit, ex }) : null
  const colsOf = s => (holdCols && isHoldRow(s) ? holdCols : cols)
  const modeAt = s => (isHoldRow(s) ? 'time' : mode)
  const effOn = mode === 'reps' && !!effortCol
  // Hevy's count-up timer on each cardio set and hold (D53), in place of upstream's countdown;
  // not for a workout logged into the past, which is typed in.
  const canPlay = !editing && !A?.backfill
  const playOn = (timed || cardio) && canPlay
  const playAt = s => playOn || (canPlay && isHoldRow(s))
  const goOn = playOn || (canPlay && entry.sets.some(isHoldRow))
  const grid = { '--nc': cols.length + (effOn ? 1 : 0) }
  // The timer's ▶ / ■ gets a narrow track of its own (hevier.css), so PREVIOUS keeps its room.
  const goGrid = goOn ? ' hv-go-grid' : ''

  // The same row edits upstream's block makes (views/Workout.jsx ExerciseBlock), from lib/set-rows.js.
  const editSets = fn => update(s => { const e = s.active.entries[entryIdx]; e.sets = fn(e.sets, e) }, true)
  const editSet = (i, fn) => update(s => { const e = s.active.entries[entryIdx]; e.sets[i] = fn(e.sets[i]) }, true)
  // Upstream moves the row to where the work sets begin with its numbers; the suggestions stay on
  // their slots (work set N, warm-up N) and the marks go with the row (lib/phase-relay.js).
  const setPhaseAt = (i, warm) => {
    const before = entry.sets
    const after = warm ? makeWarmupAt(before, i) : makeWorkAt(before, i)
    if (after === before) return
    const to = movedTo(before, i)
    const keys = s => (isSideSet(s) ? ['L', 'R'].flatMap(k => [k + 'w', k + 'r']) : ['w', 'r', 'sec'])
    const typedWeight = (s, side) => (side ? s.sides[side] : s).weightOrigin === WEIGHT_ORIGIN_MANUAL && !filledFromLast(s, side)
    const free = j => {
      const s = before[j]
      if (s.done || keys(s).some(k => isTouched(j, k))) return false
      return isSideSet(s) ? !typedWeight(s, 'L') && !typedWeight(s, 'R') : !typedWeight(s)
    }
    const last = previousSetsFor(history, { ...entry, sets: after }, previousMode(S), { label: sessionLabelKey(S, A, entryIdx) })
    editSets(() => relaySuggestions(before, after, i, to, free, last, mode))
    reorder(moveOrder(before.length, i, to))
  }
  const setFailureAt = (i, on) => editSets(sets => withFailure(sets, i, on))
  // D89: a set made a hold opens on last time's hold there, else 45 s; back, on last time's reps
  // there, else the plan's. Either way grey until touched (D2). A per-side set becomes an L/R pair
  // of holds (hold-set.js), and the pair one per-side set again; copied from last time (`from`),
  // it takes last time's weights too and is firm.
  const setHold = (i, on, from) => {
    const [at, count] = setSpanAt(entry.sets, i)
    const row = entry.sets[at]
    const p = from ?? prev[at]
    const firm = keys => { if (from) setTimeout(() => keys.forEach(([j, k]) => touch(j, k)), 0) }
    if (on && isSideSet(row)) {
      const L = isHoldRow(p) ? p : null, R = L?.hvPairR || L
      editSets(sets => {
        const [l, r] = toSideHold(sets[at], L?.sec ?? HOLD_SEC, R?.sec ?? HOLD_SEC)
        const pair = from && L ? [{ ...l, w: L.w || 0 }, { ...r, w: R.w || 0 }] : [l, r]
        return [...sets.slice(0, at), ...pair, ...sets.slice(at + 1)]
      })
      firm([[at, 'w'], [at, 'sec'], [at + 1, 'w'], [at + 1, 'sec']])
      return
    }
    if (!on && count === 2) {
      // Per-side reps are each side's; a plan's rep target is both sides' (D75).
      const reps = k => (isSideSet(p) ? p.sides[k]?.r : p && !isHoldRow(p) && p.r > 0 ? p.r : (entry.target?.reps || 0) / 2)
      editSets(sets => {
        const back = fromSideHold(sets[at], sets[at + 1], reps('L'), reps('R'))
        const done = from && isSideSet(p) ? { ...back, sides: { L: { ...back.sides.L, w: p.sides.L.w || 0 }, R: { ...back.sides.R, w: p.sides.R.w || 0 } } } : back
        return [...sets.slice(0, at), done, ...sets.slice(at + 2)]
      })
      firm(['Lw', 'Lr', 'Rw', 'Rr'].map(k => [at, k]))
      return
    }
    editSet(i, row => (on ? toHold(row, from?.sec ?? (isHoldRow(p) ? p.sec : HOLD_SEC))
      : toReps(row, from?.r ?? (p && !isHoldRow(p) && p.r > 0 ? p.r : entry.target?.reps))))
    untouch(i, 'r'); untouch(i, 'sec')
  }
  const intensifier = entry.target?.intensifier
  const addDropRow = i => editSet(i, row =>
    withDrop(row, { pct: intensifier?.type === 'dropset' ? intensifier.pct : undefined, grid: dropGrid(S, cfg) }))
  const addBurstRow = i => editSet(i, row =>
    withBurst(row, intensifier?.type === 'restpause' ? intensifier.restSec : (S.restPauseSec || 15)))
  const setSide = (i, side, f, v) => editSets((sets, e) => withSideField(sets, i, side, f, v, e.target?.backoffStep))

  // An L/R pair is one set, also among a per-side exercise's single rows (hold-set.js).
  const workNumber = i => setNumberOf(entry.sets, i)
  // A row as a screen reader names it: "Set 2", or "Warm-up 1" so two warm-ups are told apart.
  const rowName = (s, i) => (isWarmupRow(s) ? t('Warm-up {0}', setNumberOf(entry.sets, i)) : t('Set {0}', workNumber(i)))
  // D5: the set number opens the set-type picker (exercise-menus.js).
  const openSetType = (s, i) => setTypeMenu({ sets: entry.sets, i, mode, editing, setPhaseAt, setFailureAt, setHold,
    addDropRow, addBurstRow, onCopySetAt, onRemoveSetAt })

  // A session entry added after the switch (freestyle, or a routine added later) takes the step too.
  const unitChoice = exUnitChoice(S, entry.id)
  useEffect(() => {
    if (unitChoice && !(entry.target?.inc > 0)) update(s => { const e = s.active?.entries[entryIdx]; if (e) e.target = { ...(e.target || {}), inc: unitChoice.inc } })
  }, [unitChoice?.inc, entry.target?.inc])

  const ownRest = entry.target?.restSec > 0 ? entry.target.restSec : 0
  const restText = restTimerText(ownRest, S.restSec, t('Off'))
  const plateLoading = !editing
  // D8: the ⋮ menu (exercise-menus.js).
  const openMore = () => exerciseMenu(props, { S, update, ex, entry, cfg, mode, bw, perSide, first, unit, exUnit, convertsUnit,
    unitChoice, guidance, last, plateLoading, hasLabel: hasLabel(S, S.active, entryIdx) })

  // Plate loading (Settings → Plates), the line upstream draws under a row whose stack changes;
  // only with During a workout → Plates to load on (D84).
  const loadKind = plateLoading && plateLineOn(S) && mode === 'reps' ? loadKindFor(S, cfg) : 'none'
  const loads = loadKind === 'none' ? [] : setLoads(loadKind, entry.sets, { perSide, base: baseWeightFor(S, entry.id), inv: inventoryFor(S) })
  const plateLine = i => {
    const L = plateLineAt(loads, i)
    if (!L) return null
    const stack = L.plates.map(w => fmtPlate(w)).join(' + ')
    return <div className="hv-plates"><Icon name="plate" />
      <span>{L.barOnly ? t('Bar only') : L.kind === 'pairs' ? t('{0} per side', stack || '–') : t('Load {0}', stack || '–')}</span>
    </div>
  }

  const prevOpts = { mode, bw, unit: exUnit, show: showWeight, id: entry.id, target: last?.target, speedUnit }
  // A tap on PREVIOUS copies it into the row, field by field, in the row's own shape.
  const copyPrev = (i, p, side) => {
    if (!p) return
    // A hold last time makes a per-side set a hold on each side (D89), and a per-side set last
    // time makes a hold pair a per-side set again.
    // A ticked set keeps its kind: last time's of another kind is not copied onto it.
    const ticked = setTicked(entry.sets, isPairTail(entry.sets, i) ? i - 1 : i)
    if (side && isHoldRow(p)) return ticked ? undefined : setHold(i, true, p)
    if (!side && entry.sets[i]?.side && isSideSet(p)) return ticked ? undefined : setHold(i, false, p)
    if (side) {
      const sd = isSideSet(p) ? p.sides[side] : null
      if (!sd) return
      setSide(i, side, 'w', sd.w || 0); setSide(i, side, 'r', sd.r || 0)
      touch(i, side + 'w'); touch(i, side + 'r')
      return
    }
    // A hold last time copied onto a rep set makes it a hold, and back (D89).
    const row = entry.sets[i]
    if (holdCols && !isSideSet(row) && isHoldRow(p) !== isHoldRow(row)) {
      if (ticked) return
      setHold(i, isHoldRow(p), p)
    }
    colsOf(p).forEach(c => {
      if (p[c.f] == null && c.opt) return
      onField(i, c.f, p[c.f] ?? 0)
      touch(i, c.f)
    })
  }
  // A screen reader hears which set a field belongs to: "Set 2, KG (Left)".
  const fieldName = (s, i, col, side) => rowName(s, i) + ', ' + col.label
    + (side ? ' (' + (side === 'L' ? t('Left') : t('Right')) + ')' : '')
  const field = (s, i, col, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const key = (side || '') + col.f
    // A weight filled from last time (D69, `hvLast`) is marked manual only so edits above it do not
    // cascade onto it: it stays grey until it is touched.
    const firm = src.done || isTouched(i, key) || (col.f === 'w' && src.weightOrigin === WEIGHT_ORIGIN_MANUAL && !filledFromLast(s, side))
    if (col.dur && src[RUN]) return <span className="hv-num hv-running" role="timer" aria-label={fieldName(s, i, col, side)}><Elapsed start={src[RUN]} /></span>
    // A grey value typed over and left empty stays, and so does whatever the typing copied down the sets.
    const hintProps = {
      hint: !firm,
      onTypeOver: () => { typedOver.current = { i, key, sets: structuredClone(entry.sets) } },
      onRestore: () => {
        const was = typedOver.current
        typedOver.current = null
        if (was?.i !== i || was.key !== key) return
        update(st => { const e = st.active?.entries[entryIdx]; if (e) e.sets = was.sets }, true)
        untouch(i, key)
      },
    }
    if (col.dur) return <DurationField className={'hv-num' + (firm ? '' : ' hv-hint')} sec={secOf(src, modeAt(s))} {...hintProps}
      aria-label={fieldName(s, i, col, side)}
      onChange={sec => { touch(i, key); onField(i, col.f, fieldValue(modeAt(s), sec)) }} />
    return <HintNumberField decimal={col.dec} nullable={col.opt} className={'hv-num' + (firm ? '' : ' hv-hint')} value={viewOf(col, src[col.f]) ?? ''}
      {...hintProps}
      aria-label={fieldName(s, i, col, side)}
      onChange={v => {
        touch(i, key)
        const val = col.store ? col.store(v) : v
        if (side) setSide(i, side, col.f, val); else onField(i, col.f, val)
        if (col.f === 'w' && filledFromLast(s, side)) update(st => {
          const row = st.active?.entries[entryIdx]?.sets[i]
          const left = side ? String(row?.hvLast || '').replace(side, '') : ''
          if (row) { if (left) row.hvLast = left; else delete row.hvLast }
        }, true)
      }} />
  }
  // D6: the effort column, in the profile's scale. Picking a rating ticks the set (upstream #64).
  const effortCell = (s, i, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const v = src[effortCol.f] ?? null
    const color = effortColor(effortKind === 'rpe' ? (v == null ? null : 10 - v) : v)
    const open = () => effortPickerSheet(effortKind, v, nv => {
      if (side) setSide(i, side, effortCol.f, nv); else onField(i, effortCol.f, nv)
      const fresh = useStore.getState().S.active?.entries[entryIdx]?.sets[i]
      const freshSrc = side ? fresh?.sides?.[side] : fresh
      if (nv != null && freshSrc && !freshSrc.done) tick(i, side)
    })
    return <button type="button" className={'hv-eff' + (v == null ? ' empty' : '')} onClick={open}
      aria-label={rowName(s, i) + (side ? ' (' + sideWord(side) + ')' : '') + ', ' + t(effortCol.hd) + (v == null ? '' : ' ' + fmtNum(v))}
      style={color && v != null ? { color, background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}>
      {v == null ? t(effortCol.hd) : fmtNum(v)}
    </button>
  }

  const swipeOn = !!(controls.swipeSets && onCopySetAt && onRemoveSetAt)
  const sideWord = side => (side === 'L' ? t('Left') : t('Right'))
  const markOf = (s, i) => (isWarmupRow(s) ? <span className="hv-w">W</span> : isFailureSet(s) ? <span className="hv-f">F</span>
    : isHoldRow(s) ? <span className="hv-hold">{workNumber(i)}<Icon name="timer" /></span> : workNumber(i))
  const setButton = (s, i) => <button type="button" className="hv-set" onClick={() => openSetType(s, i)}
    aria-label={rowName(s, i) + (s.side ? ' (' + sideWord(s.side) + ')' : '')
      + (isFailureSet(s) ? ', ' + t('Taken to failure') : '') + (isHoldRow(s) ? ', ' + t('Timed hold') : '') + (prSets.has(i) ? ', ' + t('PR') : '') + ', ' + t('Set type')}>
    {markOf(s, i)}{prSets.has(i) && <Icon name="trophy" className="hv-pr-live" />}</button>
  // A tick that gives this set a record says so (D22): a toast, no sound of its own. A weight in
  // this exercise's own unit (D41).
  const prText = r => (!convertsUnit || !['weight', 'e1rm', 'setVol'].includes(r.kind) ? recordValue(r, unit, t)
    : r.kind === 'setVol' ? `${fmtNum(showWeight(r.w))} ${exUnit} × ${r.r}` : fmtNum(showWeight(r.v)) + ' ' + exUnit)
  // D53: ▶ starts the set's count-up timer (stopping any other), ■ writes its time in.
  const startTimer = i => update(st => startRun(st.active, entryIdx, i), true)
  const stopTimer = i => {
    const timeCol = colsOf(entry.sets[i]).find(c => c.dur)
    update(st => { const e = st.active?.entries[entryIdx]; if (e?.sets[i]) e.sets[i] = stopped(e.sets[i], modeAt(e.sets[i])) }, true)
    if (timeCol) touch(i, timeCol.f)
  }
  // D89: a hold's ⏱ opens the big clock, counting its seconds down (the set's, else 45 s); on a
  // hold already running it opens that clock again.
  const holdClock = (s, i) => {
    const title = exerciseNameFor(ex) + ' · ' + t('Set {0}', workNumber(i)) + (s.side ? ' · ' + sideWord(s.side) : '')
    if (s[RUN]) return openHoldClock(entryIdx, i, title)
    holdClockSheet(entryIdx, i, secOf(s, 'time') || HOLD_SEC, title)
  }
  // D90: a weight or rep count far past the exercise's best, or far under last time's same set,
  // and a cardio timer left running, ask before the set is logged; Fix it leaves the set unticked
  // and puts the caret in the field.
  const ask = (i, side, s, f, title, message, logText, fix) => confirmSheet({
    title, message, confirmText: t('Fix it'), cancelText: t('Log {0}', logText),
    onConfirm: () => {
      fix?.()
      setTimeout(() => {
        const at = colsOf(s).findIndex(c => c.f === f)
        rowEls.current[i + (side || '')]?.querySelectorAll('.hv-cell')[at]?.querySelector('input')?.focus()
      }, 50)
    },
    onCancel: () => logTick(i, side),
  })
  const tick = (i, side) => {
    const s = entry.sets[i], src = side ? s?.sides?.[side] : s
    const p = prev[i]
    if (src && !src.done && modeAt(s) === 'cardio' && src[RUN]) {
      const ran = runningSec(src)
      const ref = longRun(ran, secOf(src, 'cardio'), p ? secOf(p, 'cardio') : 0)
      if (ref) return ask(i, side, s, 'min', t('Timer still running?'),
        t('{0} is over twice this set’s time, {1}.', elapsedClock(ran), elapsedClock(ref)), elapsedClock(ran), () => stopTimer(i))
    }
    if (src && !src.done && modeAt(s) === 'reps') {
      const odd = oddValues(src, bestsFor(useStore.getState().S, entry.id),
        { unit, last: lastRowOf(s, p, side), assisted: isAssisted({ ...ex, id: entry.id, target: entry.target }) })
      if (odd.length) {
        const shown = o => (o.f === 'w' ? fmtNum(showWeight(o.typed)) + ' ' + exUnit : t('{0} reps', o.typed))
        const of = o => (o.f === 'w' ? fmtNum(showWeight(o.best)) + ' ' + exUnit : t('{0} reps', o.best))
        return ask(i, side, s, odd[0].f, t('Is that right?'), odd.map(o => (o.low
          ? t('{0} is under a third of last time’s, {1}.', shown(o), of(o))
          : o.f === 'w' ? t('{0} is over twice your heaviest, {1}.', shown(o), of(o)) : t('{0} is over twice your most, {1}.', shown(o), of(o)))).join(' '),
        odd.map(shown).join(' × '))
      }
    }
    logTick(i, side)
  }
  const logTick = (i, side) => {
    if (!side && entry.sets[i]?.[RUN]) stopTimer(i)
    const had = recordsAt(liveRecords(useStore.getState().S), entryIdx, i).map(r => r.kind)
    if (side) onToggleSide(i, side); else onToggle(i)
    const st = useStore.getState().S
    if (!st.active?.entries[entryIdx]?.sets[i]?.done) return
    const got = recordsAt(liveRecords(st), entryIdx, i).filter(r => !had.includes(r.kind))
    if (got.length) useUI.getState().toast(t('New PR · {0}', t(KINDS[got[0].kind]) + ' ' + prText(got[0])) + (got.length > 1 ? ' +' + (got.length - 1) : ''))
  }
  const tickLabel = (s, i, side) => (isWarmupRow(s) ? t('Warm-up {0} done', setNumberOf(entry.sets, i)) : side ? t('Set {0} ({1}) done', workNumber(i), sideWord(side)) : t('Set {0} done', workNumber(i)))
  // One line of the table: a straight set, one half of a timed per-side pair (`s.side`), or one
  // side of a per-side reps set (`side`).
  const line = (s, i, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const p = prev[i]
    const sideTag = side || s.side
    // A half of a hold pair reads its own side of a per-side set last time.
    const prevText = previousText(p, { ...prevOpts, side: side || (s.side && isSideSet(p) ? s.side : undefined) })
    const canCopy = side ? !!(p && (isSideSet(p) || isHoldRow(p))) : !!p
    return <div ref={el => { rowEls.current[i + (side || '')] = el; if (side !== second) onSetRowRef?.(i, el) }} style={grid}
      className={'hv-row' + goGrid + (src.done ? ' done' : '') + (side ? ' hv-side' : '') + (!src.done && isNext(i) ? ' hv-next' : '')}>
      {side === second || isPairTail(entry.sets, i) ? <span /> : setButton(s, i)}
      <button type="button" className="hv-prev" disabled={!canCopy} onClick={() => copyPrev(i, p, side)}
        aria-label={canCopy ? t('Last time') + (side ? ' (' + sideWord(side) + ')' : '') + ': ' + prevText : undefined}>
        {sideTag && <span className="hv-lr">{sideTag === 'L' ? t('L') : t('R')}</span>}{prevText}</button>
      {colsOf(s).map(c => <span key={c.f} className="hv-cell">{field(s, i, c, side)}</span>)}
      {effOn && effortCell(s, i, side)}
      {goOn && !playAt(s) && <span />}
      {playAt(s) && modeAt(s) === 'time' && <button type="button" className={'iconbtn hv-go' + (s[RUN] ? ' on' : '')} disabled={s.done}
        aria-label={t('Timed hold') + ', ' + t('Set {0}', workNumber(i))} onClick={() => holdClock(s, i)}><Icon name="timer" /></button>}
      {playAt(s) && modeAt(s) !== 'time' && (s[RUN]
        ? <button type="button" className="iconbtn hv-go on" aria-label={t('Stop') + ', ' + t('Set {0}', workNumber(i))} onClick={() => stopTimer(i)}><HvIcon name="stop" /></button>
        : <button type="button" className="iconbtn hv-go" aria-label={t('Start set') + ', ' + t('Set {0}', workNumber(i))} disabled={s.done}
          onClick={() => startTimer(i)}><Icon name="play" /></button>)}
      <Check checked={!!src.done} className="hv-chk" label={tickLabel(s, i, side)}
        onChange={() => tick(i, side)} />
    </div>
  }
  const subRows = (src, i, side) => <SubRows src={src} show={showWeight}
    store={v => (convertsUnit ? convert(v, exUnit, unit) : v)} edit={fn => editSet(i, fn)} side={side} />
  const swipe = (s, i, body) => {
    if (!swipeOn) return body
    const [from, count] = setSpanAt(entry.sets, i)
    const mine = j => j != null && j >= from && j < from + count
    return <SwipeRow canDelete={editing || entry.sets.length > count}
      onDelete={() => onRemoveSetAt(i)} onCopy={() => onCopySetAt(i)}
      onBlocked={() => useUI.getState().toast(t('Keep at least one set, champ'))}
      onStart={() => { if (useUI.getState().swipeHint) setUI({ swipeHint: null }) }}
      closeKey={[entry.sets.length, s.done ? 1 : 0, count === 2 && entry.sets[from + 1]?.done ? 1 : 0,
        s.sides?.L?.done ? 1 : 0, s.sides?.R?.done ? 1 : 0, restEnds || 0, working?.endsAt || 0, S.active.cur].join('|')}
      flash={setFlash && mine(setFlash.i) ? setFlash.id : 0}
      peek={swipeHint && mine(swipeHint.i) ? swipeHint.id : 0}>
      {body}
    </SwipeRow>
  }
  // A set as the table draws it. A timed per-side pair (L row, R row) swipes as the one set it is,
  // so its R row is drawn with the L row and not on its own.
  const setBlock = (s, i) => {
    const [from, count] = setSpanAt(entry.sets, i)
    if (count === 2 && from !== i) return null
    if (perSide && isSideSet(s)) return swipe(s, i, <div className={'hv-pair' + (s.done ? ' done' : '')}>
      {line(s, i, first)}{!isWarmupRow(s) && subRows(s.sides[first] || {}, i, first)}
      {line(s, i, second)}{!isWarmupRow(s) && subRows(s.sides[second] || {}, i, second)}
    </div>)
    if (count === 2) return swipe(s, i, <div className="hv-pair">{line(s, i)}{line(entry.sets[i + 1], i + 1)}</div>)
    return <>{swipe(s, i, line(s, i))}{!isWarmupRow(s) && mode === 'reps' && subRows(s, i)}</>
  }

  const supersetInfo = superset ? supersetMeta(S.active.entries, superset, { onTarget: true }) : null
  const standing = exNoteFor(S, entry.id)
  const pinned = entry.sets.some(s => !s.done) ? pinnedNoteFor(S, entry.id) : null

  return <div className="hv-ex">
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button>
      <button type="button" className="iconbtn hv-more" aria-label={t('More') + ', ' + exerciseNameFor(ex)} onClick={openMore}><Icon name="more" /></button>
    </div>
    <BrandLine idx={entryIdx} />
    {supersetInfo && <div className="hv-ss"><span className="hv-sspill">{supersetInfo.name || t('Superset')}</span>
      {supersetInfo.rest > 0 && <span className="hv-sub">{t('{0} rest', restTimerText(supersetInfo.rest, 0, ''))}</span>}</div>}
    {entry.noProg === true && <div className="hv-sub hv-noprog"><Icon name="chartLineSlash" />{t('Not counted for progression')}
      {onNoProg && <button type="button" className="hv-link" onClick={() => onNoProg(false)}>{t('Undo')}</button>}</div>}
    {cfg.note && <div className="hv-note">{cfg.note}</div>}
    {standing && <div className="hv-note">{standing}</div>}
    {pinned && <div className="hv-note"><Icon name="pin" /> {pinned.note}</div>}
    <button type="button" className={'hv-notes' + (entry.note ? ' has' : '')} onClick={() => exerciseNoteSheet(entryIdx)}>
      {entry.note || t('Add notes here…')}
    </button>
    {onRest && <button type="button" className="hv-rest" onClick={onRest}><Icon name="timer" />{t('Rest Timer: {0}', restText)}</button>}
    <div className={'hv-head' + goGrid} style={grid} aria-hidden="true">
      <span>{t('SET')}</span><span>{t('PREVIOUS')}</span>
      {cols.map(c => <span key={c.f}>{c.hd}</span>)}
      {effOn && <span>{t(effortCol.hd).toUpperCase()}</span>}{goOn && <span />}<span><Icon name="check" /></span>
    </div>
    {entry.sets.map((s, i) => <div key={i}>
      {setBlock(s, i)}
      {swipeHint && swipeHint.i === i && swipeOn && <button type="button" className="hv-hint-chip" onClick={() => setUI({ swipeHint: null })}>
        <Icon name="swap" />{t('Psst: swipe a set. Left deletes, right copies.')}</button>}
      {plateLine(i)}
    </div>)}
    <button type="button" className="hv-addset" onClick={onAddSet}><Icon name="plus" />{t('Add Set')}</button>
  </div>
}
