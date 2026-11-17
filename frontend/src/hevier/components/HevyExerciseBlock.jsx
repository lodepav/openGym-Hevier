// One exercise in the live workout (hevier/DECISIONS.md D127, after D2–D9): picture · name · brand,
// on the open exercise its six buttons (Swap, Note, History, Rest, Reorder, More), then the SET ·
// PREVIOUS · KG · REPS · ✓ table with the opened set large and the effort button in the tick’s place, and on the
// open exercise "+ Set" and "+ Warm-up" side by side. The columns follow the exercise's mode as upstream's block
// does: KG · REPS, KG · TIME for a timed hold, TIME · speed (· incline) for cardio, the last two
// with Hevy's count-up timer (D53), and an L and an R line under one set number for a per-side exercise.
//
// Presentation only. Every change to the session goes through the handlers the workout screen
// passes in (`blockProps` in views/Workout.jsx) or through upstream's pure helpers in lib/, the
// same calls upstream's ExerciseBlock makes, so ticking, rest, supersets, progression and sync
// behave exactly as they do there. The brand line under the name (D28) writes only the fork's own
// label fields (components/GymLabels.jsx).
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { fitNumbers } from '../lib/fit-numbers.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr, isAssisted } from '../../lib/exercises.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtPlate } from '../../lib/format.js'
import { restTimerText, elapsedClock } from '../lib/elapsed.js'
import { isCable, hasLabel, sessionLabelKey } from '../lib/gym-labels.js'
import { partOn } from '../lib/module-parts.js'
import {
  EFFORT, effortOf, modeOf, isBw, isPerSide, exNoteFor, pinnedNoteFor, makeWarmupAt, makeWorkAt,
  setSpanAt, lastEntryFor,
} from '../../lib/history.js'
import { isWarmupRow, isFailureSet, isSideSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { speedUnitOf } from '../../lib/speed.js'
import { dropGrid, loadKindFor, baseWeightFor, inventoryFor } from '../../lib/plates.js'
import { effortColor } from '../../lib/effort.js'
import { sessionHistory } from '../../lib/backfill.js'
import { progressionGuidance } from '../../lib/progression-copy.js'
import { supersetMeta } from '../../lib/superset-meta.js'
import { confirmSheet, effortPickerSheet, EffortPicker, exerciseDetailSheet, exerciseNoteSheet, exerciseHistorySheet, setNoteSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import SwipeRow from '../../components/SwipeRow.jsx'
import Icon from '../../components/Icon.jsx'
import { Button, Check } from '../../components/ui.jsx'
import { workoutControls } from '../../lib/workout-controls.js'
import { previousSetsFor, previousMode } from '../lib/previous-sets.js'
import { isOpenRow } from '../lib/open-set.js'
import { liveRecords, recordsAt, recordValue, KINDS } from '../lib/records.js'
import { BrandLine, brandSheet } from './GymLabels.jsx'
import { reorderExercisesSheet } from './ReorderExercisesSheet.jsx'
import HintNumberField from './HintNumberField.jsx'
import DurationField from './DurationField.jsx'
import { isHoldRow, toHold, toReps, toSideHold, fromSideHold, setNumberOf, isPairTail, setTicked, HOLD_SEC } from '../lib/hold-set.js'
import Elapsed from './Elapsed.jsx'
import HvIcon from './HvIcon.jsx'
import { RUN, secOf, fieldValue, stopped, startRun, runningSec, sinceStart, stoppedRows } from '../lib/set-timer.js'
import { holdClockSheet, openHoldClock } from './ClockSheet.jsx'
import { longRun } from '../lib/odd-value.js'
import { previousCell } from '../lib/set-text.js'
import { useCardState } from './useCardState.js'
import { exUnitOf, exUnitChoice, shown, convert } from '../lib/ex-unit.js'
import { shownWeight } from '../../lib/ex-unit.js'
import { setTrend, trendsOn } from '../lib/set-trend.js'
import { formulaOf } from '../../lib/onerm.js'
import TrendMark, { trendWords } from './TrendMark.jsx'
import { setColumns, viewOf } from '../lib/set-columns.js'
import { filledFromLast } from '../lib/plain-routine.js'
import { moveOrder, movedTo, relaySuggestions } from '../lib/phase-relay.js'
import { sideOrderOf } from '../lib/side-order.js'
import { plateLineOn, warmupEffortOn } from '../lib/settings.js'
import { withDrop, withBurst, withFailure, withSideField } from '../lib/set-rows.js'
import { useTouchedFields } from './useTouchedFields.js'
import { setLoads, plateLineAt } from '../lib/plate-line.js'
import { setTypeMenu, exerciseMenu, exerciseRestMenu } from './exercise-menus.js'
import { defaultRestFor, setOwnRest } from '../lib/rest-extra.js'
import { ownSetRest, ownExerciseRest } from '../../lib/supersetFlow.js'
import SubRows from './SubRows.jsx'
import { setNoteOf } from '../../lib/set-notes.js'

const setUI = patch => useUI.setState?.(patch)

// A swiped-open row closes when a set is ticked, a rest or hold starts or the session moves on:
// read here, so they do not re-render the whole card.
function SwipeRowLive({ closeKey, ...rest }) {
  const restEnds = useUI(s => s.timer?.endsAt)
  // only the end: the whole hold object is replaced every second while it counts
  const workEnds = useUI(s => s.work?.endsAt)
  const cur = useStore(s => s.S.active?.cur)
  return <SwipeRow {...rest} closeKey={closeKey + '|' + (restEnds || 0) + '|' + (workEnds || 0) + '|' + cur} />
}

// `live.current` holds the workout screen's latest props for this card, handlers included: the
// card is memo'd on `sig` (lib/card-state.js propsSig) and calls the handlers through it, so a
// skipped render never leaves it with old ones.
function HevyExerciseBlock({ entryIdx, live }) {
  const props = live.current
  const { editing, superset, open } = props
  const call = k => (...a) => live.current[k]?.(...a)
  const onToggle = call('onToggle'), onToggleSide = call('onToggleSide'), onField = call('onField'), onAddSet = call('onAddSet')
  const onSetRowRef = call('onSetRowRef')
  const onRemoveSetAt = props.onRemoveSetAt && call('onRemoveSetAt'), onCopySetAt = props.onCopySetAt && call('onCopySetAt')
  const onRest = props.onRest && call('onRest'), onNoProg = props.onNoProg && call('onNoProg'), onOpen = props.onOpen && call('onOpen')
  const S = useCardState(entryIdx, superset)
  const update = useStore(s => s.update)
  const swipeHint = useUI(s => (s.swipeHint?.idx === entryIdx ? s.swipeHint : null))
  const setFlash = useUI(s => (s.setFlash?.idx === entryIdx ? s.setFlash : null))

  const entry = S.active.entries[entryIdx]
  const { isTouched, touch, untouch, reorder, typedOver } = useTouchedFields(entry.sets)
  const rowEls = useRef({})
  const card = useRef(null)
  const fitSig = useRef('')
  const width = useRef(0)
  // Measures again only when a number, its placeholder, its weight or its row changed (or the card's width or text size):
  // fitNumbers writes then reads layout per field, too much for each render of a ticking workout.
  const fit = () => {
    const el = card.current
    if (!el) return
    // a field's own inline size is in it too: a remounted field has lost what fitNumbers set
    const sig = el.className + '|' + width.current + '|' + getComputedStyle(el).fontSize + '|' + [...el.querySelectorAll('input.hv-num')]
      .map(f => f.closest('.hv-row')?.className + ':' + f.className + ':' + f.value + ':' + f.placeholder + ':' + f.style.fontSize).join('|')
    if (sig === fitSig.current) return
    fitSig.current = sig
    fitNumbers(el)
  }
  const fitRef = useRef(fit)
  fitRef.current = fit
  // The width comes from an observer, not clientWidth, which would force a layout on each render.
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    width.current = el.clientWidth
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(([e]) => { width.current = e.target.clientWidth; fitRef.current() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useLayoutEffect(fit)
  const ex = exOr(entry.id)
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = isBw(cfg)
  // The history only changes when a workout is saved, not for each set typed: kept, not rebuilt on
  // every render (battery). Only its workouts are read; the store keeps S.workouts the same object
  // while a change does not touch it (useStore draftOf).
  const A = S.active
  const history = useMemo(() => ({ workouts: sessionHistory(S).workouts }),
    [S.workouts, A.backfill, A.editingWorkoutId, A.d, A.start]) // eslint-disable-line react-hooks/exhaustive-deps
  // D82: last time on this machine (its brand and cable setup), else with none.
  const prev = previousSetsFor(history, entry, previousMode(S), { label: sessionLabelKey(S, A, entryIdx) })
  // D127: the opened set, large (lib/open-set.js); this exercise is the open
  // one when `open` is passed, and only then shows its buttons and "+ Set".
  const isOpenAt = i => isOpenRow(entry.sets, open, i)
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
  // D120: with Effort on warm-ups off, a warm-up row keeps an empty cell; its stored effort stays.
  const effAt = s => warmupEffortOn(S) || !isWarmupRow(s)
  // Hevy's count-up timer on each cardio set and hold (D53), in place of upstream's countdown;
  // not for a workout logged into the past, which is typed in.
  const canPlay = !editing && !A?.backfill
  const playOn = (timed || cardio) && canPlay
  const playAt = s => playOn || (canPlay && isHoldRow(s))
  const goOn = playOn || (canPlay && entry.sets.some(isHoldRow))
  // D127: the effort gets a narrow track of its own (hevier.css .hv-eff-grid), so PREVIOUS keeps its room.
  const grid = { '--nc': cols.length }
  // The timer's ▶ / ■ gets a narrow track of its own (hevier.css), so PREVIOUS keeps its room.
  const goGrid = (goOn ? ' hv-go-grid' : '') + (effOn ? ' hv-eff-grid' : '')

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
        // A set last time logged as one row held one side's reps (D75): both sides take its weight.
        const wOf = k => (isSideSet(p) ? p.sides[k].w : p.w) || 0
        const done = from && !isHoldRow(p) ? syncSideAggregate({ ...back, sides: { L: { ...back.sides.L, w: wOf('L') }, R: { ...back.sides.R, w: wOf('R') } } }) : back
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
  const openSetType = (s, i) => setTypeMenu({ sets: entry.sets, i, mode, editing, rest: !editing && setRest(i), setPhaseAt, setFailureAt, setHold,
    addDropRow, addBurstRow, onCopySetAt, onRemoveSetAt, onField, note: noteOf(i) })
  // A set's note (upstream 1.4.4): on its first row, an L/R pair's L; written by upstream's sheet.
  const noteOf = i => {
    const at = setSpanAt(entry.sets, i)[0]
    return { text: setNoteOf(entry.sets[at]), open: () => setNoteSheet(entryIdx, at, rowName(entry.sets[at], at)) }
  }
  const noteLine = i => {
    const n = noteOf(i)
    return n.text ? <button type="button" className="hv-setnote" aria-label={t('Edit note') + ': ' + n.text} onClick={n.open}>
      <Icon name="note" /><span>{n.text}</span></button> : null
  }
  // A set's own rest (#609). The sheet may outlive the set it was opened for: a save after the
  // rows moved or the workout changed does nothing, as upstream's does.
  const setRest = i => {
    const ref = { id: A.id, entryId: entry.id, rows: entry.sets.length }
    return {
      own: ownSetRest(entry.sets[setSpanAt(entry.sets, i)[0]]),
      dflt: defaultRestFor(A, entryIdx, i, S.restSec, S.warmupRestSec),
      save: sec => update(st => {
        const e = st.active?.entries?.[entryIdx]
        if (e && st.active.id === ref.id && e.id === ref.entryId && e.sets.length === ref.rows) setOwnRest(e.sets, i, sec)
      }, true),
    }
  }

  // A session entry added after the switch (freestyle, or a routine added later) takes the step too.
  const unitChoice = exUnitChoice(S, entry.id)
  useEffect(() => {
    if (unitChoice?.step != null && !(entry.target?.inc > 0)) update(s => { const e = s.active?.entries[entryIdx]; if (e) e.target = { ...(e.target || {}), inc: convert(unitChoice.step, unitChoice.u, unit) } })
  }, [unitChoice?.step, entry.target?.inc])

  const ownRest = ownExerciseRest(entry.target)
  const restText = ownRest === 0 ? t('No timer') : restTimerText(ownRest, S.restSec, t('Off'))
  const plateLoading = !editing
  // D8: the ⋮ menu (exercise-menus.js).
  const openMore = () => exerciseMenu(live.current, { S, update, ex, entry, cfg, mode, bw, perSide, first, unit, exUnit, convertsUnit,
    unitChoice, guidance, plateLoading })

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

  // No unit: the KG/LB column header names it ("90 × 1").
  const prevOpts = { mode, bw, unit: '', show: showWeight, id: entry.id, target: last?.target, speedUnit }
  // A tap on PREVIOUS copies it into the row, field by field, in the row's own shape.
  const copyPrev = (i, p, side) => {
    if (!p) return
    // A hold last time makes a per-side set a hold on each side (D89), and a per-side set last
    // time, or a rep set logged as one row (D75), makes a hold pair a per-side set again.
    // A ticked set keeps its kind: last time's of another kind is not copied onto it.
    const ticked = setTicked(entry.sets, isPairTail(entry.sets, i) ? i - 1 : i)
    if (side && isHoldRow(p)) return ticked ? undefined : setHold(i, true, p)
    if (!side && entry.sets[i]?.side && (isSideSet(p) || (holdCols && !isHoldRow(p)))) return ticked ? undefined : setHold(i, false, p)
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
      // Upstream's onField takes a weight in the exercise's own unit since 1.4.4 (#657): last
      // time's stored weight goes in as the exercise shows it.
      onField(i, c.f, c.f === 'w' ? shownWeight(S, entry.id, p[c.f] ?? 0) : p[c.f] ?? 0)
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
        // A side is written here, in the stored unit; upstream's onField converts a weight from
        // the exercise's unit itself since 1.4.4 (#657), so it takes the typed weight. Speed and
        // incline it stores as given: their own store (mph to km/h, the incline's clamp) first.
        if (side) setSide(i, side, col.f, col.store ? col.store(v) : v)
        else onField(i, col.f, col.f !== 'w' && col.store ? col.store(v) : v)
        if (col.f === 'w' && filledFromLast(s, side)) update(st => {
          const row = st.active?.entries[entryIdx]?.sets[i]
          const left = side ? String(row?.hvLast || '').replace(side, '') : ''
          if (row) { if (left) row.hvLast = left; else delete row.hvLast }
        }, true)
      }} />
  }
  // D6: the effort column, in the profile's scale. Picking a rating ticks the set (upstream #64).
  // On a set not ticked yet it stands in the tick's place too (`asTick`): the dialog logs the set,
  // with a rating or with none.
  const effortCell = (s, i, side, asTick) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const v = src[effortCol.f] ?? null
    const color = effortColor(effortKind === 'rpe' ? (v == null ? null : 10 - v) : v)
    const log = () => {
      const fresh = useStore.getState().S.active?.entries[entryIdx]?.sets[i]
      const freshSrc = side ? fresh?.sides?.[side] : fresh
      if (freshSrc && !freshSrc.done) tick(i, side)
    }
    const onPick = nv => {
      if (side) setSide(i, side, effortCol.f, nv); else onField(i, effortCol.f, nv)
      if (nv != null || asTick) log()
    }
    // In the tick's place the dialog ends with a tick of its own: the set without a rating.
    const open = () => (asTick
      ? useUI.getState().openSheet(close => <>
        <EffortPicker kind={effortKind} value={v} onPick={onPick} close={close} />
        <Button icon="check" style={{ width: '100%', minHeight: 48, marginTop: 8, background: 'var(--surface-2)' }} onClick={() => { log(); close() }}>{t('Log without rating')}</Button>
      </>)
      : effortPickerSheet(effortKind, v, onPick))
    return <button type="button" className={'hv-eff' + (v == null ? ' empty' : '') + (asTick ? ' hv-eff-tick' : '')} onClick={open}
      aria-label={rowName(s, i) + (side ? ' (' + sideWord(side) + ')' : '') + ', ' + (asTick ? t('log it with {0}', t(effortCol.hd)) : t(effortCol.hd) + (v == null ? '' : ' ' + fmtNum(v)))}
      style={color && v != null ? { color, background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}>
      {v == null ? t(effortCol.hd) : fmtNum(v)}
    </button>
  }

  const swipeOn = !!(controls.swipeSets && onCopySetAt && onRemoveSetAt)
  const sideWord = side => (side === 'L' ? t('Left') : t('Right'))
  const markOf = (s, i) => (isWarmupRow(s) ? <span className="hv-w">W</span> : isFailureSet(s) ? <span className="hv-f">F</span>
    : isHoldRow(s) ? <span className="hv-hold">{workNumber(i)}<Icon name="timer" /></span> : workNumber(i))
  // A ticked work set against the same set last time, the PREVIOUS column's (D66, upstream's #907
  // and its switch since 1.4.4); a per-side set is read by Workout Detail, not here.
  const trendAt = (s, i) => (trendsOn(S) && s?.done && !isWarmupRow(s) && !isSideSet(s)
    ? setTrend(s, prev[i], { assisted: isAssisted({ ...ex, id: entry.id, target: entry.target }), formula: formulaOf(S) }) : null)
  const setButton = (s, i) => <button type="button" className="hv-set" onClick={() => openSetType(s, i)}
    aria-label={rowName(s, i) + (s.side ? ' (' + sideWord(s.side) + ')' : '')
      + (isFailureSet(s) ? ', ' + t('Taken to failure') : '') + (isHoldRow(s) ? ', ' + t('Timed hold') : '') + (prSets.has(i) ? ', ' + t('PR') : '')
      + (trendAt(s, i) != null ? ', ' + trendWords(trendAt(s, i)) : '') + ', ' + t('Set type')}>
    {markOf(s, i)}{prSets.has(i) && <Icon name="trophy" className="hv-pr-live" />}{!prSets.has(i) && <TrendMark v={trendAt(s, i)} hidden />}</button>
  // A tick that gives this set a record says so (D22): a toast, no sound of its own. A weight in
  // this exercise's own unit (D41).
  const prText = r => (!convertsUnit || !['weight', 'e1rm', 'setVol'].includes(r.kind) ? recordValue(r, unit, t)
    : r.kind === 'setVol' ? `${fmtNum(showWeight(r.w))} ${exUnit} × ${r.r}` : fmtNum(showWeight(r.v)) + ' ' + exUnit)
  // D53: ▶ starts the set's count-up timer (stopping any other), ■ writes its time in.
  // A time on the set made firm (typed, copied from PREVIOUS, or stopped) is kept: ▶ counts on from
  // it. A grey hint from last time starts at 0.
  const startTimer = i => {
    const s = entry.sets[i], timeCol = colsOf(s).find(c => c.dur)
    const from = timeCol && isTouched(i, timeCol.f) ? secOf(s, modeAt(s)) || 0 : 0
    update(st => startRun(st.active, entryIdx, i, Date.now(), 0, from), true)
  }
  const stopTimer = i => {
    const timeCol = colsOf(entry.sets[i]).find(c => c.dur)
    update(st => { const e = st.active?.entries[entryIdx]; if (e?.sets[i]) e.sets[i] = stopped(e.sets[i], modeAt(e.sets[i])) }, true)
    if (timeCol) touch(i, timeCol.f)
  }
  // A timer stopped outside the block (the big clock's Stop, its end in hold-clock-run.js) wrote
  // the time actually held: firm, as stopTimer makes it.
  const runsSeen = useRef(entry.sets)
  useEffect(() => {
    for (const i of stoppedRows(runsSeen.current, entry.sets)) {
      const timeCol = colsOf(entry.sets[i]).find(c => c.dur)
      if (timeCol) touch(i, timeCol.f)
    }
    runsSeen.current = entry.sets
  }, [entry.sets]) // eslint-disable-line react-hooks/exhaustive-deps
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
      // Only what ran since ▶: a run counted on from a time on the set is not a forgotten timer.
      const ref = longRun(sinceStart(src), secOf(src, 'cardio'), p ? secOf(p, 'cardio') : 0)
      if (ref) return ask(i, side, s, 'min', t('Timer still running?'),
        t('{0} is over twice this set’s time, {1}.', elapsedClock(ran), elapsedClock(ref)), elapsedClock(ran), () => stopTimer(i))
    }
    // A weight or rep count that looks mistyped asks in upstream's tick (#811, D90's 1.4.4 note).
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
    const prevText = previousCell(p, { ...prevOpts, side: side || (s.side && isSideSet(p) ? s.side : undefined) })
    const canCopy = side ? !!(p && (isSideSet(p) || isHoldRow(p))) : !!p
    // With effort on, a set not ticked yet has the effort button in the tick's place (the user, 2026-11-16).
    const effTick = effOn && effAt(s) && !goOn && !src.done
    // A tap anywhere on a set but its tick opens it (D127); the tick moves on to the next.
    return <div ref={el => { rowEls.current[i + (side || '')] = el; if (side !== second) onSetRowRef?.(i, el) }} style={grid}
      onClick={e => { if (onOpen && !e.target.closest?.('.hv-chk, .hv-eff')) onOpen(i) }}
      className={'hv-row' + goGrid + (src.done ? ' done' : '') + (side ? ' hv-side' : '') + (isOpenAt(i) ? ' hv-open' : '')}>
      {side === second || isPairTail(entry.sets, i) ? <span /> : setButton(s, i)}
      <button type="button" className="hv-prev" disabled={!canCopy} onClick={() => copyPrev(i, p, side)}
        aria-label={canCopy ? t('Last time') + (side ? ' (' + sideWord(side) + ')' : '') + ': ' + prevText : undefined}>
        {sideTag && <span className="hv-lr">{sideTag === 'L' ? t('L') : t('R')}</span>}{prevText}</button>
      {colsOf(s).map(c => <span key={c.f} className="hv-cell">{field(s, i, c, side)}</span>)}
      {effOn && (effAt(s) ? effortCell(s, i, side, effTick) : <span />)}
      {goOn && !playAt(s) && <span />}
      {playAt(s) && modeAt(s) === 'time' && <button type="button" className={'iconbtn hv-go' + (s[RUN] ? ' on' : '')} disabled={s.done}
        aria-label={t('Timed hold') + ', ' + t('Set {0}', workNumber(i))} onClick={() => holdClock(s, i)}><Icon name="timer" /></button>}
      {playAt(s) && modeAt(s) !== 'time' && (s[RUN]
        ? <button type="button" className="iconbtn hv-go on" aria-label={t('Stop') + ', ' + t('Set {0}', workNumber(i))} onClick={() => stopTimer(i)}><HvIcon name="stop" /></button>
        : <button type="button" className="iconbtn hv-go" aria-label={t('Start set') + ', ' + t('Set {0}', workNumber(i))} disabled={s.done}
          onClick={() => startTimer(i)}><Icon name="play" /></button>)}
      {!effTick && <Check checked={!!src.done} className="hv-chk" label={tickLabel(s, i, side)}
        onChange={() => tick(i, side)} />}
    </div>
  }
  const subRows = (src, i, side) => <SubRows src={src} show={showWeight}
    store={v => (convertsUnit ? convert(v, exUnit, unit) : v)} edit={fn => editSet(i, fn)} side={side} />
  const swipe = (s, i, body) => {
    if (!swipeOn) return body
    const [from, count] = setSpanAt(entry.sets, i)
    const mine = j => j != null && j >= from && j < from + count
    return <SwipeRowLive canDelete={editing || entry.sets.length > count}
      onDelete={() => onRemoveSetAt(i)} onCopy={() => onCopySetAt(i)}
      onBlocked={() => useUI.getState().toast(t('Keep at least one set, champ'))}
      onStart={() => { if (useUI.getState().swipeHint) setUI({ swipeHint: null }) }}
      closeKey={[entry.sets.length, s.done ? 1 : 0, count === 2 && entry.sets[from + 1]?.done ? 1 : 0,
        s.sides?.L?.done ? 1 : 0, s.sides?.R?.done ? 1 : 0].join('|')}
      flash={setFlash && mine(setFlash.i) ? setFlash.id : 0}
      peek={swipeHint && mine(swipeHint.i) ? swipeHint.id : 0}>
      {body}
    </SwipeRowLive>
  }
  // A set as the table draws it. A timed per-side pair (L row, R row) swipes as the one set it is,
  // so its R row is drawn with the L row and not on its own.
  const setBlock = (s, i) => {
    const [from, count] = setSpanAt(entry.sets, i)
    if (count === 2 && from !== i) return null
    if (perSide && isSideSet(s)) return <>{swipe(s, i, <div className={'hv-pair' + (s.done ? ' done' : '')}>
      {line(s, i, first)}{!isWarmupRow(s) && subRows(s.sides[first] || {}, i, first)}
      {line(s, i, second)}{!isWarmupRow(s) && subRows(s.sides[second] || {}, i, second)}
    </div>)}{noteLine(i)}</>
    if (count === 2) return <>{swipe(s, i, <div className="hv-pair">{line(s, i)}{line(entry.sets[i + 1], i + 1)}</div>)}{noteLine(i)}</>
    return <>{swipe(s, i, line(s, i))}{!isWarmupRow(s) && mode === 'reps' && subRows(s, i)}{noteLine(i)}</>
  }

  const supersetInfo = superset ? supersetMeta(S.active.entries, superset, { onTarget: true }) : null
  const standing = exNoteFor(S, entry.id)
  const pinned = entry.sets.some(s => !s.done) ? pinnedNoteFor(S, entry.id) : null

  const isOpen = !!open
  // D127: the brand on the name line: a machine's line (BrandLine), or "+ Brand" for any other
  // exercise on the open one (D28).
  const addBrand = isOpen && !hasLabel(S, A, entryIdx) && partOn(S, 'hvGyms', 'brands')
  return <div ref={card} className={'hv-ex' + (isOpen ? ' hv-exopen' : '')}>
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <div className="hv-nameline">
        <h3 className="hv-name-h"><button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button></h3>
        <BrandLine idx={entryIdx} />
        {addBrand && <button type="button" className="hv-addbrand" onClick={() => brandSheet(entryIdx)}>{t('+ Brand')}</button>}
      </div>
      {!isOpen && onOpen && <button type="button" className="iconbtn hv-openex" aria-label={t('Open') + ', ' + exerciseNameFor(ex)} onClick={() => onOpen(null)}><Icon name="chevronDown" /></button>}
    </div>
    {isOpen && <div className="hv-acts">
      {props.onSwap && <button type="button" disabled={props.busy} onClick={call('onSwap')}><Icon name="swap" /><span>{t('Swap')}</span></button>}
      <button type="button" className={entry.note ? 'on' : undefined} onClick={() => exerciseNoteSheet(entryIdx)}><Icon name="note" /><span>{t('Note')}</span></button>
      <button type="button" onClick={() => exerciseHistorySheet(entry.id)}><Icon name="history" /><span>{t('History')}</span></button>
      {onRest && <button type="button" aria-label={t('Rest') + ': ' + restText} onClick={() => exerciseRestMenu(useStore.getState().S, update, entryIdx)}><Icon name="timer" /><span>{restText}</span></button>}
      {props.onReorder && <button type="button" disabled={props.busy} onClick={() => reorderExercisesSheet(live.current.onReorder)}><Icon name="chevronsUpDown" /><span>{t('Reorder')}</span></button>}
      <button type="button" className="hv-more" aria-label={t('More') + ', ' + exerciseNameFor(ex)} onClick={openMore}><Icon name="more" /><span>{t('More')}</span></button>
    </div>}
    {supersetInfo && <div className="hv-ss"><span className="hv-sspill">{supersetInfo.name || t('Superset')}</span>
      {supersetInfo.rest > 0 && <span className="hv-sub">{t('{0} rest', restTimerText(supersetInfo.rest, 0, ''))}</span>}</div>}
    {entry.noProg === true && <div className="hv-sub hv-noprog"><Icon name="chartLineSlash" />{t('Not counted for progression')}
      {onNoProg && <button type="button" className="hv-link" onClick={() => onNoProg(false)}>{t('Undo')}</button>}</div>}
    {cfg.note && <div className="hv-note">{cfg.note}</div>}
    {standing && <div className="hv-note">{standing}</div>}
    {pinned && <div className="hv-note"><Icon name="pin" /> {pinned.note}</div>}
    {entry.note && <button type="button" className="hv-note hv-exnote" aria-label={t('Edit note') + ': ' + entry.note} onClick={() => exerciseNoteSheet(entryIdx)}>{entry.note}</button>}
    <div className={'hv-head' + goGrid} style={grid} aria-hidden="true">
      <span>{t('SET')}</span><span><span className="hv-prev-long">{t('PREVIOUS')}</span><span className="hv-prev-short">{t('PREV')}</span></span>
      {cols.map(c => <span key={c.f}>{c.hd}</span>)}
      {effOn && <span>{t(effortCol.hd).toUpperCase()}</span>}{goOn && <span />}<span><Icon name="check" /></span>
    </div>
    {entry.sets.map((s, i) => <div key={i}>
      {setBlock(s, i)}
      {swipeHint && swipeHint.i === i && swipeOn && <button type="button" className="hv-hint-chip" onClick={() => setUI({ swipeHint: null })}>
        <Icon name="swap" />{t('Psst: swipe a set. Left deletes, right copies.')}</button>}
      {plateLine(i)}
    </div>)}
    {(isOpen || !entry.sets.length) && <div className="hv-addrow">
      <button type="button" className="hv-addset" onClick={onAddSet}><Icon name="plus" />{t('Set')}</button>
      {props.onAddWarmup && <button type="button" className="hv-addwarm" onClick={call('onAddWarmup')}><Icon name="plus" />{t('Warm-up')}</button>}
    </div>}
  </div>
}

export default memo(HevyExerciseBlock)
