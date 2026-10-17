// One exercise in the Hevy workout screen (hevier/DECISIONS.md D2–D9, reference/SCREENS.md §2):
// thumbnail · blue name · ⋮, the notes, "Rest Timer: …", then the SET · PREVIOUS · KG · REPS · ✓
// table and a full-width "+ Add Set". The columns follow the exercise's mode as upstream's block
// does: KG · REPS, KG · SEC with a start button for a timed hold, MIN · speed (· incline) for
// cardio, and an L and an R line under one set number for a per-side exercise.
//
// Presentation only. Every change to the session goes through the handlers the workout screen
// passes in (`blockProps` in views/Workout.jsx) or through upstream's pure helpers in lib/, the
// same calls upstream's ExerciseBlock makes, so ticking, rest, supersets, progression and sync
// behave exactly as they do there. The brand line under the name (D28) writes only the fork's own
// label fields (components/GymLabels.jsx).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr } from '../../lib/exercises.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtDate, fmtPlate } from '../../lib/format.js'
import { fmtRest } from '../../lib/duration.js'
import { restTimerText } from '../lib/elapsed.js'
import {
  EFFORT, effortOf, modeOf, isBw, isPerSide, exNoteFor, pinnedNoteFor, makeWarmupAt, makeWorkAt,
  canBeWarmup, setSpanAt, lastEntryFor, setLabel, cascadeWeight,
} from '../../lib/history.js'
import {
  isWarmupRow, isFailureSet, toggleFailure, isDropSet, isRestPauseSet, dropsOf, clustersOf, addDrop,
  addCluster, removeDropAt, removeClusterAt, setDropAt, setClusterAt, nextDropWeight, nextBurstReps,
  isSideSet, setSideField, addSideDrop, removeSideDropAt, setSideDropAt, addSideCluster,
  removeSideClusterAt, setSideClusterAt, WEIGHT_ORIGIN_MANUAL,
} from '../../lib/workout-model.js'
import { speedUnitOf, toSpeed, fromSpeed } from '../../lib/speed.js'
import { clampIncline, hasIncline, inclineFits } from '../../lib/incline.js'
import { setNumberAt } from '../../views/Workout.jsx'
import { dropGrid, loadKindFor, baseWeightFor, inventoryFor, rowLoad, sameLoad } from '../../lib/plates.js'
import { effortColor } from '../../lib/effort.js'
import { sessionHistory } from '../../lib/backfill.js'
import { progressionGuidance } from '../../lib/progression-copy.js'
import { supersetMeta } from '../../lib/superset-meta.js'
import {
  menuSheet, effortPickerSheet, exerciseDetailSheet, exerciseHistorySheet, exerciseNoteSheet, barWeightSheet,
} from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import SwipeRow from '../../components/SwipeRow.jsx'
import Icon from '../../components/Icon.jsx'
import { Check, NumberField } from '../../components/ui.jsx'
import { workoutControls } from '../../lib/workout-controls.js'
import { previousSetsFor, previousMode } from '../lib/previous-sets.js'
import { livePrSetIndex, recordWeight } from '../lib/pr-set.js'
import { BrandLine } from './GymLabels.jsx'
import HintNumberField from './HintNumberField.jsx'
import { fieldSig } from '../lib/store-watch.js'
import { shiftTouched } from '../lib/touched.js'
import { exUnitOf, exUnitChoice, shown, convert, setExUnit, defaultStep, unitChoices } from '../lib/ex-unit.js'

const setUI = patch => useUI.setState?.(patch)

// A column's number as it is shown: cardio speed is stored in km/h and shown in the profile's unit.
const viewOf = (col, v) => (col.view && v != null && v !== '' ? col.view(v) : v)

export default function HevyExerciseBlock({
  entryIdx, editing, busy, superset, onToggle, onToggleSide, onStartTimed, onField, onAddSet, onAddWarmup, onRemoveSetAt, onCopySetAt,
  onProgressionSettings, onRest, onNoProg, routineUpdate, onSwap, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  onRemoveExercise, onPairPrev, onPairNext, onUnpair, onSetRowRef,
}) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const restEnds = useUI(s => s.timer?.endsAt)
  const swipeHint = useUI(s => (s.swipeHint?.idx === entryIdx ? s.swipeHint : null))
  const setFlash = useUI(s => (s.setFlash?.idx === entryIdx ? s.setFlash : null))
  const working = useUI(s => s.work)
  // D2: which values were typed or copied this session (rows by index, fields by name). A weight
  // edit is also on the row itself as weightOrigin, which survives a reload; reps have no mark.
  const [touched, setTouched] = useState(() => new Set())
  const touch = (i, f) => setTouched(prev => (prev.has(i + ':' + f) ? prev : new Set(prev).add(i + ':' + f)))
  const untouch = k => setTouched(prev => { if (!prev.has(k)) return prev; const n = new Set(prev); n.delete(k); return n })
  // The sets as they were when typing began over a grey value, to put back if it is left empty.
  const typedOver = useRef(null)

  const entry = S.active.entries[entryIdx]
  // A set added or removed above a row renumbers it: its marks move with it (lib/touched.js).
  // The rows are kept as they were last drawn, a value typed included, so the comparison finds
  // the row that went rather than the one typed into.
  const rowsNow = entry.sets.map(s => JSON.stringify(s))
  const [rowsSeen, setRowsSeen] = useState(rowsNow)
  if (rowsNow.join('\n') !== rowsSeen.join('\n')) {
    setRowsSeen(rowsNow)
    if (rowsNow.length !== rowsSeen.length) setTouched(prev => shiftTouched(prev, rowsSeen, rowsNow))
  }
  const ex = exOr(entry.id)
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = isBw(cfg)
  // The history only changes when a workout is saved, not for each set typed: kept, not rebuilt on
  // every render (battery). Only its workouts are read. The store deep-copies S on
  // every change, so the log is compared by content (fieldSig), not by identity.
  const A = S.active
  const H = useMemo(() => ({ workouts: sessionHistory(S).workouts }),
    [fieldSig(S, 'workouts'), A.backfill, A.editingWorkoutId, A.d, A.start]) // eslint-disable-line react-hooks/exhaustive-deps
  const prev = previousSetsFor(H, entry, previousMode(S))
  // D22: the set that is a weight record so far, by upstream's finish rule.
  const record = useMemo(() => recordWeight(S, entry), [fieldSig(S, 'workouts'), entry.id, entry.target?.dbLoad]) // eslint-disable-line react-hooks/exhaustive-deps
  const prAt = livePrSetIndex(S, entry, record)
  const last = lastEntryFor(H, entry.id, entry.rid)
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  const wc = workoutControls(S)
  const guidance = progressionGuidance(entry.plan)
  const unit = S.unit
  // D41: the unit this exercise is shown and typed in; stored weights stay in the profile's.
  const xu = exUnitOf(S, entry.id)
  const conv = xu !== unit
  const sw = v => (conv ? shown(v, unit, xu) : v)
  const mode = modeOf(cfg)
  const timed = mode === 'time', cardio = mode === 'cardio'
  const perSide = mode === 'reps' && isPerSide(cfg)
  const speedUnit = speedUnitOf(S)

  // The value columns, in upstream's fields (views/Workout.jsx col1–col3), in Hevy's order.
  const W = { f: 'w', dec: true, hd: (bw ? '+' : '') + xu.toUpperCase(), label: t('Weight ({0})', xu),
    ...(conv ? { view: v => shown(v, unit, xu), store: v => convert(v, xu, unit) } : {}) }
  const R = { f: 'r', dec: false, hd: t('REPS'), label: t('Reps') }
  const cols = cardio ? [
    { f: 'min', dec: false, hd: t('MIN'), label: t('Duration (min)') },
    { f: 'speed', dec: true, hd: speedUnit === 'mph' ? t('MPH') : t('KM/H'), label: speedUnit === 'mph' ? t('Speed (mph)') : t('Speed (km/h)'),
      view: v => toSpeed(v, speedUnit), store: v => fromSpeed(v, speedUnit) },
    (inclineFits(ex) || entry.sets.some(hasIncline)) && { f: 'incline', dec: true, opt: true, hd: t('INCL %'), label: t('Incline (%)'), store: clampIncline },
  ].filter(Boolean) : timed ? [W, { f: 'sec', dec: false, hd: t('SEC'), label: t('Seconds') }] : [W, R]
  const effOn = mode === 'reps' && !!eff
  const playOn = timed && !editing
  const grid = { '--nc': cols.length + (effOn ? 1 : 0) + (playOn ? 1 : 0) }

  // The same row edits upstream's block makes (views/Workout.jsx ExerciseBlock), over the same
  // lib helpers: a set's phase, its failure mark, its drops and bursts.
  const mutSet = (i, fn) => update(s => { const e = s.active.entries[entryIdx]; e.sets[i] = fn(e.sets[i]) }, true)
  const setPhaseAt = (i, warm) => update(s => {
    const e = s.active.entries[entryIdx]
    e.sets = warm ? makeWarmupAt(e.sets, i) : makeWorkAt(e.sets, i)
  }, true)
  const setFailureAt = (i, on) => update(s => {
    const e = s.active.entries[entryIdx]
    const [start, count] = setSpanAt(e.sets, i)
    for (let j = start; j < start + count; j++) if (isFailureSet(e.sets[j]) !== on) e.sets[j] = toggleFailure(e.sets[j])
  }, true)
  const intens = entry.target?.intensifier
  const addDropRow = i => mutSet(i, row => {
    if (isSideSet(row)) return addSideDrop(row, intens?.type === 'dropset' ? intens.pct : undefined, dropGrid(S, cfg))
    const drops = dropsOf(row)
    const base = drops.length ? drops[drops.length - 1].w : (row.w || 0)
    const pct = intens?.type === 'dropset' ? intens.pct : undefined
    return addDrop(row, { w: nextDropWeight(base, pct, dropGrid(S, cfg)), r: row.r })
  })
  const addBurstRow = i => mutSet(i, row => {
    const restSec = intens?.type === 'restpause' ? intens.restSec : (S.restPauseSec || 15)
    if (isSideSet(row)) return addSideCluster(row, restSec)
    const clusters = clustersOf(row)
    const added = nextBurstReps(clusters.length ? clusters[clusters.length - 1].r : (row.r || 0))
    return { ...addCluster(row, { r: added, restSec }), r: (row.r || 0) + added }
  })
  const setDropField = (i, di, f, v, side) => mutSet(i, row =>
    (side ? setSideDropAt(row, side, di, { [f]: v }) : setDropAt(row, di, { [f]: v })))
  const removeDrop = (i, di) => mutSet(i, row => (isSideSet(row) ? removeSideDropAt(row, di) : removeDropAt(row, di)))
  const setBurstReps = (i, ci, v, side) => mutSet(i, row => {
    if (side) return setSideClusterAt(row, side, ci, v)
    const delta = (Number(v) || 0) - (clustersOf(row)[ci]?.r || 0)
    return { ...setClusterAt(row, ci, { r: v }), r: Math.max(0, (row.r || 0) + delta) }
  })
  const removeBurst = (i, ci) => mutSet(i, row => {
    if (isSideSet(row)) return removeSideClusterAt(row, ci)
    const removed = clustersOf(row)[ci]?.r || 0
    return { ...removeClusterAt(row, ci), r: Math.max(0, (row.r || 0) - removed) }
  })

  // One side of a per-side row (upstream's setSide): the row's totals follow through the model
  // helper, and a weight edit is marked as typed and carried down to the sets after it.
  const setSide = (i, side, f, v) => {
    if (f !== 'w') return mutSet(i, row => setSideField(row, side, f, v))
    update(st => {
      const e = st.active.entries[entryIdx]
      const row = setSideField(e.sets[i], side, f, v)
      row.sides[side].weightOrigin = WEIGHT_ORIGIN_MANUAL
      e.sets[i] = row
      e.sets = cascadeWeight(e.sets, i, v, side, e.target?.backoffStep)
    }, true)
  }

  // D5: the set number is Hevy's set-type picker, with openGym's extra kinds of set below it.
  const workNumber = i => setNumberAt(entry.sets, i)
  const openSetType = (s, i) => {
    const warm = isWarmupRow(s)
    const fail = isFailureSet(s)
    const otherWork = entry.sets.some((x, j) => j !== i && !isWarmupRow(x))
    menuSheet({
      title: t('Select set type'),
      sections: [
        { items: [
          mode === 'reps' && { icon: 'sunrise', label: t('Warm-up set'), on: warm, disabled: !warm && !(mode === 'reps' && canBeWarmup(s) && otherWork),
            onClick: () => { if (!warm) setPhaseAt(i, true) } },
          { icon: 'dumbbell', label: t('Normal set'), on: !warm && !fail && !isDropSet(s),
            onClick: () => { if (warm && !perSide) setPhaseAt(i, false); else if (fail) setFailureAt(i, false) } },
          !cardio && { icon: 'gauge', label: t('Failure set'), on: fail, disabled: warm, onClick: () => setFailureAt(i, !fail) },
          mode === 'reps' && { icon: 'arrowDown', label: t('Drop set'), sub: t('+ Drop'), disabled: warm || isRestPauseSet(s), onClick: () => addDropRow(i) },
        ] },
        { title: t('More'), items: [
          mode === 'reps' && !warm && !isDropSet(s) && { icon: 'bolt', label: t('Rest-pause burst'), sub: t('+ Burst'), onClick: () => addBurstRow(i) },
          onCopySetAt && { icon: 'copy', label: t('Copy this set'), onClick: () => onCopySetAt(i) },
        ] },
        { items: [
          { icon: 'xmark', label: t('Remove set'), danger: true,
            disabled: !editing && entry.sets.length <= setSpanAt(entry.sets, i)[1], onClick: () => onRemoveSetAt(i) },
        ] },
      ],
    })
  }

  // D41: the exercise's unit and its step, picked from ⋮; switching changes no stored weight.
  const unitSheet = () => {
    const { profile, alt, steps } = unitChoices(unit)
    const pick = (u, step) => update(s => { setExUnit(s, entry.id, u, step) })
    const cur = exUnitChoice(S, entry.id)
    menuSheet({
      title: t('Weight unit'),
      sections: [
        { items: [{ label: t('{0}, as the profile', profile), on: !cur, onClick: () => pick(null) }] },
        { title: t('In {0}, stepping by', alt), items: steps.map(st => ({
          label: fmtNum(st) + ' ' + alt + (st === defaultStep(entry.id, alt) ? ' · ' + t('Recommended') : ''),
          on: cur?.step === st, onClick: () => pick(alt, st),
        })) },
      ],
    })
  }
  // A session entry added after the switch (freestyle, or a routine added later) takes the step too.
  const xc = exUnitChoice(S, entry.id)
  useEffect(() => {
    if (xc && !(entry.target?.inc > 0)) update(s => { const e = s.active?.entries[entryIdx]; if (e) e.target = { ...(e.target || {}), inc: xc.inc } })
  }, [xc?.inc, entry.target?.inc])

  // D8: everything about the exercise that is not a set lives behind ⋮ — Hevy's five items first,
  // then what openGym adds (progression included), Remove last.
  const ownRest = entry.target?.restSec > 0 ? entry.target.restSec : 0
  const restText = restTimerText(ownRest, S.restSec, t('Off'))
  const plateLoading = !editing
  const openMore = () => menuSheet({
    title: exerciseNameFor(ex),
    titleClass: exerciseNameClass(ex),
    sections: [
      { items: [
        onMoveUp && { icon: 'chevronUp', label: t('Move up'), onClick: onMoveUp, disabled: busy || !canMoveUp },
        onMoveDown && { icon: 'chevronDown', label: t('Move down'), onClick: onMoveDown, disabled: busy || !canMoveDown },
        onSwap && { icon: 'swap', label: t('Replace exercise'), onClick: onSwap, disabled: busy },
        !superset && onPairPrev && { icon: 'link', label: t('Make superset with previous'), onClick: onPairPrev },
        !superset && onPairNext && { icon: 'link', label: t('Make superset with next'), onClick: onPairNext },
        superset && onUnpair && { icon: 'link', label: t('Unpair'), onClick: onUnpair },
        { icon: 'sunrise', label: t('Add warm-up set'), onClick: onAddWarmup },
      ] },
      { items: [
        onProgressionSettings && { icon: 'slider', label: t('Exercise settings'),
          sub: guidance ? t(guidance.policyLabel) + ' · ' + t(...guidance.why) : t('Sets, reps, rest, progression'),
          onClick: onProgressionSettings },
        onNoProg && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('This exercise, this session only'), on: entry.noProg === true, onClick: () => onNoProg(entry.noProg !== true) },
        plateLoading && modeOf(cfg) === 'reps' && { icon: 'plate', label: t('Plate loading'), onClick: () => barWeightSheet(entry.id, cfg) },
        routineUpdate && { icon: 'clipboard', label: t('Update routine'), sub: routineUpdate.sub, onClick: routineUpdate.run },
        mode === 'reps' && !bw && { icon: 'ruler', label: t('Weight unit'),
          sub: conv ? t('{0} · {1} {0} steps', xu, fmtNum(exUnitChoice(S, entry.id)?.step)) : t('{0}, as the profile', unit),
          onClick: unitSheet },
        { icon: 'history', label: t('History'), sub: last ? t('Last time') + ' ' + fmtDate(last.d) : undefined, onClick: () => exerciseHistorySheet(entry.id) },
        { icon: 'info', label: t('How to do it'), onClick: () => exerciseDetailSheet(ex) },
      ] },
      { items: [
        onRemoveExercise && { icon: 'xmark', label: t('Remove exercise'), danger: true, disabled: busy, onClick: onRemoveExercise },
      ] },
    ],
  })

  // Plate loading (Settings → Plates), the line upstream draws under a row whose stack changes.
  const loadKind = plateLoading && mode === 'reps' ? loadKindFor(S, cfg) : 'none'
  const loads = loadKind === 'none' ? [] : (() => {
    const inv = inventoryFor(S), base = baseWeightFor(S, entry.id)
    return entry.sets.map(s => {
      if (!(perSide && isSideSet(s))) return rowLoad(loadKind, s.w, base, inv)
      const L = s.sides.L?.w || 0, R = s.sides.R?.w || 0
      return L && R && L !== R ? null : rowLoad(loadKind, L || R, base, inv)
    })
  })()
  const plateLine = i => {
    const L = loads[i]
    if (!L) return null
    let p = i - 1
    while (p >= 0 && !loads[p]) p--
    if (p >= 0 && sameLoad(loads[p], L)) return null
    const stack = L.plates.map(w => fmtPlate(w)).join(' + ')
    return <div className="hv-plates"><Icon name="plate" />
      <span>{L.barOnly ? t('Bar only') : L.kind === 'pairs' ? t('{0} per side', stack || '–') : t('Load {0}', stack || '–')}</span>
    </div>
  }

  const prevLabel = p => {
    if (!p) return '–'
    if (mode !== 'reps' || isSideSet(p)) return setLabel(entry.id, p, last?.target, speedUnit)
    if (bw) return (p.w > 0 ? `+${fmtNum(sw(p.w))}${xu} × ` : '× ') + (p.r || 0)
    return `${fmtNum(sw(p.w || 0))}${xu} × ${p.r || 0}`
  }
  const sidePrev = (p, side) => {
    const sd = p && isSideSet(p) ? p.sides[side] : null
    if (!sd) return '–'
    return bw ? (sd.w > 0 ? `+${fmtNum(sw(sd.w))}${xu} × ` : '× ') + (sd.r || 0) : `${fmtNum(sw(sd.w || 0))}${xu} × ${sd.r || 0}`
  }
  // A tap on PREVIOUS copies it into the row, field by field, in the row's own shape.
  const copyPrev = (i, p, side) => {
    if (!p) return
    if (side) {
      const sd = isSideSet(p) ? p.sides[side] : null
      if (!sd) return
      setSide(i, side, 'w', sd.w || 0); setSide(i, side, 'r', sd.r || 0)
      touch(i, side + 'w'); touch(i, side + 'r')
      return
    }
    cols.forEach(c => {
      if (p[c.f] == null && c.opt) return
      onField(i, c.f, p[c.f] ?? 0)
      touch(i, c.f)
    })
  }
  const field = (s, i, col, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const key = (side || '') + col.f
    const firm = src.done || touched.has(i + ':' + key) || (col.f === 'w' && src.weightOrigin === WEIGHT_ORIGIN_MANUAL)
    const k = i + ':' + key
    return <HintNumberField decimal={col.dec} nullable={col.opt} className={'hv-num' + (firm ? '' : ' hv-hint')} value={viewOf(col, src[col.f]) ?? ''}
      hint={!firm}
      onTypeOver={() => { typedOver.current = { k, sets: structuredClone(entry.sets) } }}
      onRestore={() => {
        // Left empty: the grey value stays, and so does whatever typing it copied down the sets.
        const was = typedOver.current
        typedOver.current = null
        if (was?.k !== k) return
        update(st => { const e = st.active?.entries[entryIdx]; if (e) e.sets = was.sets }, true)
        untouch(k)
      }}
      aria-label={side ? col.label + ' (' + (side === 'L' ? t('Left') : t('Right')) + ')' : col.label}
      onChange={v => {
        touch(i, key)
        const val = col.store ? col.store(v) : v
        if (side) setSide(i, side, col.f, val); else onField(i, col.f, val)
      }} />
  }
  // D6: the effort column, in the profile's scale. Picking a rating ticks the set (upstream #64).
  const effortCell = (s, i, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const v = src[eff.f] ?? null
    const color = effortColor(kind === 'rpe' ? (v == null ? null : 10 - v) : v)
    const open = () => effortPickerSheet(kind, v, nv => {
      if (side) setSide(i, side, eff.f, nv); else onField(i, eff.f, nv)
      const fresh = useStore.getState().S.active?.entries[entryIdx]?.sets[i]
      const freshSrc = side ? fresh?.sides?.[side] : fresh
      if (nv != null && freshSrc && !freshSrc.done) (side ? onToggleSide(i, side) : onToggle(i))
    })
    return <button type="button" className={'hv-eff' + (v == null ? ' empty' : '')} onClick={open} aria-label={t(eff.hd)}
      style={color && v != null ? { color, background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}>
      {v == null ? t(eff.hd) : fmtNum(v)}
    </button>
  }

  const swipeOn = !!(wc.swipeSets && onCopySetAt && onRemoveSetAt)
  const sideWord = side => (side === 'L' ? t('Left') : t('Right'))
  const markOf = (s, i) => (isWarmupRow(s) ? <span className="hv-w">W</span> : isFailureSet(s) ? <span className="hv-f">F</span> : workNumber(i))
  const setButton = (s, i) => <button type="button" className="hv-set" onClick={() => openSetType(s, i)}
    aria-label={(isWarmupRow(s) ? t('Warm-up') : t('Set {0}', workNumber(i))) + (s.side ? ' (' + sideWord(s.side) + ')' : '')
      + (isFailureSet(s) ? ', ' + t('Taken to failure') : '') + (i === prAt ? ', ' + t('PR') : '')}>
    {markOf(s, i)}{i === prAt && <Icon name="trophy" className="hv-pr-live" />}</button>
  // A tick that makes this set the record says so (D22): a toast, no sound of its own.
  const tick = (i, side) => {
    if (side) onToggleSide(i, side); else onToggle(i)
    const st = useStore.getState().S
    const e = st.active?.entries[entryIdx]
    if (i !== prAt && e?.sets[i]?.done && livePrSetIndex(st, e) === i)
      useUI.getState().toast(t('New PR · {0}', fmtNum(sw(e.sets[i].w)) + ' ' + xu))
  }
  const tickLabel = (s, i, side) => (isWarmupRow(s) ? t('Warm-up') : side ? t('Set {0} ({1}) done', workNumber(i), sideWord(side)) : t('Set {0} done', workNumber(i)))
  // One line of the table: a straight set, one half of a timed per-side pair (`s.side`), or one
  // side of a per-side reps set (`side`).
  const line = (s, i, side) => {
    const src = side ? (s.sides?.[side] || {}) : s
    const p = prev[i]
    const sideTag = side || s.side
    const prevText = side ? sidePrev(p, side) : prevLabel(p)
    const canCopy = side ? !!(p && isSideSet(p)) : !!p
    return <div ref={side === 'R' ? undefined : el => onSetRowRef?.(i, el)} style={grid}
      className={'hv-row' + (src.done ? ' done' : '') + (side ? ' hv-side' : '')}>
      {side === 'R' ? <span /> : setButton(s, i)}
      <button type="button" className="hv-prev" disabled={!canCopy} onClick={() => copyPrev(i, p, side)}
        aria-label={canCopy ? t('Last time') + ': ' + prevText : undefined}>
        {sideTag && <span className="hv-lr">{sideTag === 'L' ? t('L') : t('R')}</span>}{prevText}</button>
      {cols.map(c => <span key={c.f} className="hv-cell">{field(s, i, c, side)}</span>)}
      {effOn && effortCell(s, i, side)}
      {playOn && <button type="button" className="iconbtn hv-go" aria-label={t('Start set')} disabled={s.done || !!working}
        onClick={() => onStartTimed(i)}><Icon name="play" /></button>}
      <Check checked={!!src.done} className="hv-chk" label={tickLabel(s, i, side)}
        onChange={() => tick(i, side)} />
    </div>
  }
  // A drop or a burst, indented under its set (or under one side of it), as Hevy's `D` rows.
  const subRows = (src, i, side) => <>
    {dropsOf(src).map((d, di) => <div key={'d' + di} className="hv-row hv-sub-row" style={{ '--nc': 2 }}>
      <span className="hv-set"><span className="hv-d">D</span></span><span />
      <NumberField decimal className="hv-num" value={sw(d.w) ?? ''} onChange={v => setDropField(i, di, 'w', conv ? convert(v, xu, unit) : v, side)} aria-label={t('Drop {0}', di + 1)} />
      <NumberField decimal={false} className="hv-num" value={d.r ?? ''} onChange={v => setDropField(i, di, 'r', v, side)} aria-label={t('Reps')} />
      <button type="button" className="iconbtn hv-x" aria-label={t('Remove drop')} onClick={() => removeDrop(i, di)}><Icon name="xmark" /></button>
    </div>)}
    {clustersOf(src).map((c, ci) => <div key={'c' + ci} className="hv-row hv-sub-row" style={{ '--nc': 2 }}>
      <span className="hv-set"><span className="hv-d">+</span></span><span className="hv-prev">{c.restSec}s</span><span />
      <NumberField decimal={false} className="hv-num" value={c.r ?? ''} onChange={v => setBurstReps(i, ci, v, side)} aria-label={t('Burst {0}', ci + 1)} />
      <button type="button" className="iconbtn hv-x" aria-label={t('Remove burst')} onClick={() => removeBurst(i, ci)}><Icon name="xmark" /></button>
    </div>)}
  </>
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
      {line(s, i, 'L')}{!isWarmupRow(s) && subRows(s.sides.L || {}, i, 'L')}
      {line(s, i, 'R')}{!isWarmupRow(s) && subRows(s.sides.R || {}, i, 'R')}
    </div>)
    if (count === 2) return swipe(s, i, <div className="hv-pair">{line(s, i)}{line(entry.sets[i + 1], i + 1)}</div>)
    return <>{swipe(s, i, line(s, i))}{!isWarmupRow(s) && mode === 'reps' && subRows(s, i)}</>
  }

  const ss = superset ? supersetMeta(S.active.entries, superset, { onTarget: true }) : null
  const standing = exNoteFor(S, entry.id)
  const pinned = entry.sets.some(s => !s.done) ? pinnedNoteFor(S, entry.id) : null

  return <div className="hv-ex">
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button>
      <button type="button" className="iconbtn hv-more" aria-label={t('More')} onClick={openMore}><Icon name="more" /></button>
    </div>
    <BrandLine idx={entryIdx} />
    {ss && <div className="hv-ss"><span className="hv-sspill">{ss.name || t('Superset')}</span>{ss.rest > 0 && <span className="hv-sub">{t('{0} rest', fmtRest(ss.rest))}</span>}</div>}
    {entry.noProg === true && <div className="hv-sub hv-noprog"><Icon name="chartLineSlash" />{t('Not counted for progression')}
      {onNoProg && <button type="button" className="hv-link" onClick={() => onNoProg(false)}>{t('Undo')}</button>}</div>}
    {cfg.note && <div className="hv-note">{cfg.note}</div>}
    {standing && <div className="hv-note">{standing}</div>}
    {pinned && <div className="hv-note"><Icon name="pin" /> {pinned.note}</div>}
    <button type="button" className={'hv-notes' + (entry.note ? ' has' : '')} onClick={() => exerciseNoteSheet(entryIdx)}>
      {entry.note || t('Add notes here…')}
    </button>
    {onRest && <button type="button" className="hv-rest" onClick={onRest}><Icon name="timer" />{t('Rest Timer: {0}', restText)}</button>}
    <div className="hv-head" style={grid} aria-hidden="true">
      <span>{t('SET')}</span><span>{t('PREVIOUS')}</span>
      {cols.map(c => <span key={c.f}>{c.hd}</span>)}
      {effOn && <span>{t(eff.hd).toUpperCase()}</span>}{playOn && <span />}<span><Icon name="check" /></span>
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
