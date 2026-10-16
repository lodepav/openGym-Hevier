// One exercise in the Hevy workout screen (hevier/DECISIONS.md D2–D9, reference/SCREENS.md §2):
// thumbnail · blue name · ⋮, the notes, "Rest Timer: …", then the SET · PREVIOUS · KG · REPS · ✓
// table and a full-width "+ Add Set".
//
// Presentation only. Every change to the session goes through the handlers the workout screen
// passes in (`blockProps` in views/Workout.jsx) or through upstream's pure helpers in lib/, the
// same calls upstream's ExerciseBlock makes, so ticking, rest, supersets, progression and sync
// behave exactly as they do there.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr } from '../../lib/exercises.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtDate, fmtPlate } from '../../lib/format.js'
import { fmtRest } from '../../lib/duration.js'
import {
  EFFORT, effortOf, modeOf, isBw, isPerSide, exNoteFor, pinnedNoteFor, makeWarmupAt, makeWorkAt,
  canBeWarmup, setSpanAt, lastEntryFor,
} from '../../lib/history.js'
import {
  isWarmupRow, isFailureSet, toggleFailure, isDropSet, isRestPauseSet, dropsOf, clustersOf, addDrop,
  addCluster, removeDropAt, removeClusterAt, setDropAt, setClusterAt, nextDropWeight, nextBurstReps,
  WEIGHT_ORIGIN_MANUAL,
} from '../../lib/workout-model.js'
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
import { previousSetsFor } from '../lib/previous-sets.js'

const setUI = patch => useUI.setState?.(patch)

/** Whether the Hevy table can show this entry. Timed holds, cardio and per-side (L/R) exercises
 *  still use upstream's block until the Hevy table learns them (hevier/PLAN.md M1). */
export function hevyTableFits(S, entry) {
  const cfg = { ...(entry.target || {}), id: entry.id }
  return modeOf(cfg) === 'reps' && !isPerSide(cfg)
}

export default function HevyExerciseBlock({
  entryIdx, editing, busy, superset, onToggle, onField, onAddSet, onAddWarmup, onRemoveSetAt, onCopySetAt,
  onProgressionSettings, onRest, onNoProg, routineUpdate, onSwap, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  onRemoveExercise, onPairPrev, onPairNext, onUnpair, onSetRowRef,
}) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const restEnds = useUI(s => s.timer?.endsAt)
  const swipeHint = useUI(s => (s.swipeHint?.idx === entryIdx ? s.swipeHint : null))
  const setFlash = useUI(s => (s.setFlash?.idx === entryIdx ? s.setFlash : null))
  // D2: which values were typed or copied this session (rows by index, fields by name). A weight
  // edit is also on the row itself as weightOrigin, which survives a reload; reps have no mark.
  const [touched, setTouched] = useState(() => new Set())
  const touch = (i, f) => setTouched(prev => (prev.has(i + ':' + f) ? prev : new Set(prev).add(i + ':' + f)))

  const entry = S.active.entries[entryIdx]
  const ex = exOr(entry.id)
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = isBw(cfg)
  const H = sessionHistory(S)
  const prev = previousSetsFor(H, entry)
  const last = lastEntryFor(H, entry.id, entry.rid)
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  const wc = workoutControls(S)
  const guidance = progressionGuidance(entry.plan)
  const unit = S.unit

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
    const drops = dropsOf(row)
    const base = drops.length ? drops[drops.length - 1].w : (row.w || 0)
    const pct = intens?.type === 'dropset' ? intens.pct : undefined
    return addDrop(row, { w: nextDropWeight(base, pct, dropGrid(S, cfg)), r: row.r })
  })
  const addBurstRow = i => mutSet(i, row => {
    const restSec = intens?.type === 'restpause' ? intens.restSec : (S.restPauseSec || 15)
    const clusters = clustersOf(row)
    const added = nextBurstReps(clusters.length ? clusters[clusters.length - 1].r : (row.r || 0))
    return { ...addCluster(row, { r: added, restSec }), r: (row.r || 0) + added }
  })
  const setDropField = (i, di, f, v) => mutSet(i, row => setDropAt(row, di, { [f]: v }))
  const removeDrop = (i, di) => mutSet(i, row => removeDropAt(row, di))
  const setBurstReps = (i, ci, v) => mutSet(i, row => {
    const delta = (Number(v) || 0) - (clustersOf(row)[ci]?.r || 0)
    return { ...setClusterAt(row, ci, { r: v }), r: Math.max(0, (row.r || 0) + delta) }
  })
  const removeBurst = (i, ci) => mutSet(i, row => {
    const removed = clustersOf(row)[ci]?.r || 0
    return { ...removeClusterAt(row, ci), r: Math.max(0, (row.r || 0) - removed) }
  })

  // D5: the set number is Hevy's set-type picker, with openGym's extra kinds of set below it.
  const workNumber = i => entry.sets.slice(0, i + 1).filter(x => !isWarmupRow(x)).length
  const openSetType = (s, i) => {
    const warm = isWarmupRow(s)
    const fail = isFailureSet(s)
    const otherWork = entry.sets.some((x, j) => j !== i && !isWarmupRow(x))
    menuSheet({
      title: t('Select set type'),
      sections: [
        { items: [
          { icon: 'sunrise', label: t('Warm-up set'), on: warm, disabled: !warm && !(canBeWarmup(s) && otherWork),
            onClick: () => { if (!warm) setPhaseAt(i, true) } },
          { icon: 'dumbbell', label: t('Normal set'), on: !warm && !fail && !isDropSet(s),
            onClick: () => { if (warm) setPhaseAt(i, false); else if (fail) setFailureAt(i, false) } },
          { icon: 'gauge', label: t('Failure set'), on: fail, disabled: warm, onClick: () => setFailureAt(i, !fail) },
          { icon: 'arrowDown', label: t('Drop set'), sub: t('+ Drop'), disabled: warm || isRestPauseSet(s), onClick: () => addDropRow(i) },
        ] },
        { title: t('More'), items: [
          !warm && !isDropSet(s) && { icon: 'bolt', label: t('Rest-pause burst'), sub: t('+ Burst'), onClick: () => addBurstRow(i) },
          onCopySetAt && { icon: 'copy', label: t('Copy this set'), onClick: () => onCopySetAt(i) },
        ] },
        { items: [
          { icon: 'xmark', label: t('Remove set'), danger: true,
            disabled: !editing && entry.sets.length <= setSpanAt(entry.sets, i)[1], onClick: () => onRemoveSetAt(i) },
        ] },
      ],
    })
  }

  // D8: everything about the exercise that is not a set lives behind ⋮ — Hevy's five items first,
  // then what openGym adds (progression included), Remove last.
  const ownRest = entry.target?.restSec > 0 ? entry.target.restSec : 0
  const restText = ownRest ? fmtRest(ownRest) : t('Default ({0})', fmtRest(S.restSec))
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
        { icon: 'history', label: t('History'), sub: last ? t('Last time') + ' ' + fmtDate(last.d) : undefined, onClick: () => exerciseHistorySheet(entry.id) },
        { icon: 'info', label: t('How to do it'), onClick: () => exerciseDetailSheet(ex) },
      ] },
      { items: [
        onRemoveExercise && { icon: 'xmark', label: t('Remove exercise'), danger: true, disabled: busy, onClick: onRemoveExercise },
      ] },
    ],
  })

  // Plate loading (Settings → Plates), the line upstream draws under a row whose stack changes.
  const loadKind = plateLoading ? loadKindFor(S, cfg) : 'none'
  const loads = loadKind === 'none' ? [] : (() => {
    const inv = inventoryFor(S), base = baseWeightFor(S, entry.id)
    return entry.sets.map(s => rowLoad(loadKind, s.w, base, inv))
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
    if (bw) return (p.w > 0 ? `+${fmtNum(p.w)}${unit} × ` : '× ') + (p.r || 0)
    return `${fmtNum(p.w || 0)}${unit} × ${p.r || 0}`
  }
  const copyPrev = (i, p) => {
    if (!p) return
    onField(i, 'w', p.w || 0)
    onField(i, 'r', p.r || 0)
    touch(i, 'w'); touch(i, 'r')
  }
  const field = (s, i, f, dec) => {
    const firm = s.done || touched.has(i + ':' + f) || (f === 'w' && s.weightOrigin === WEIGHT_ORIGIN_MANUAL)
    return <NumberField decimal={dec} className={'hv-num' + (firm ? '' : ' hv-hint')} value={s[f] ?? ''}
      aria-label={f === 'w' ? t('Weight ({0})', unit) : t('Reps')}
      onChange={v => { touch(i, f); onField(i, f, v) }} />
  }
  // D6: the effort column, in the profile's scale. Picking a rating ticks the set (upstream #64).
  const effortCell = (s, i) => {
    const v = s[eff.f] ?? null
    const color = effortColor(kind === 'rpe' ? (v == null ? null : 10 - v) : v)
    const open = () => effortPickerSheet(kind, v, nv => {
      onField(i, eff.f, nv)
      const fresh = useStore.getState().S.active?.entries[entryIdx]?.sets[i]
      if (nv != null && fresh && !fresh.done) onToggle(i)
    })
    return <button type="button" className={'hv-eff' + (v == null ? ' empty' : '')} onClick={open} aria-label={t(eff.hd)}
      style={color && v != null ? { color, background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}>
      {v == null ? t(eff.hd) : fmtNum(v)}
    </button>
  }

  const swipeOn = !!(wc.swipeSets && onCopySetAt && onRemoveSetAt)
  const row = (s, i) => {
    const warm = isWarmupRow(s)
    const fail = isFailureSet(s)
    const mark = warm ? <span className="hv-w">W</span> : fail ? <span className="hv-f">F</span> : workNumber(i)
    const body = <div ref={el => onSetRowRef?.(i, el)} className={'hv-row' + (s.done ? ' done' : '') + (eff ? ' eff' : '')}>
      <button type="button" className="hv-set" onClick={() => openSetType(s, i)}
        aria-label={warm ? t('Warm-up') : t('Set {0}', workNumber(i)) + (fail ? ', ' + t('Taken to failure') : '')}>{mark}</button>
      <button type="button" className="hv-prev" disabled={!prev[i]} onClick={() => copyPrev(i, prev[i])}
        aria-label={prev[i] ? t('Last time') + ': ' + prevLabel(prev[i]) : undefined}>{prevLabel(prev[i])}</button>
      {field(s, i, 'w', true)}
      {field(s, i, 'r', false)}
      {eff && effortCell(s, i)}
      <Check checked={s.done} className="hv-chk" label={warm ? t('Warm-up') : t('Set {0} done', workNumber(i))} onChange={() => onToggle(i)} />
    </div>
    if (!swipeOn) return body
    return <SwipeRow canDelete={editing || entry.sets.length > 1}
      onDelete={() => onRemoveSetAt(i)} onCopy={() => onCopySetAt(i)}
      onBlocked={() => useUI.getState().toast(t('Keep at least one set, champ'))}
      onStart={() => { if (useUI.getState().swipeHint) setUI({ swipeHint: null }) }}
      closeKey={[entry.sets.length, s.done ? 1 : 0, restEnds || 0, S.active.cur].join('|')}
      flash={setFlash && setFlash.i === i ? setFlash.id : 0}
      peek={swipeHint && swipeHint.i === i ? swipeHint.id : 0}>
      {body}
    </SwipeRow>
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
    <div className={'hv-head' + (eff ? ' eff' : '')} aria-hidden="true">
      <span>{t('SET')}</span><span>{t('PREVIOUS')}</span>
      <span>{bw ? '+' + unit.toUpperCase() : unit.toUpperCase()}</span><span>{t('REPS')}</span>
      {eff && <span>{t(eff.hd).toUpperCase()}</span>}<span><Icon name="check" /></span>
    </div>
    {entry.sets.map((s, i) => <div key={i}>
      {row(s, i)}
      {swipeHint && swipeHint.i === i && swipeOn && <button type="button" className="hv-hint-chip" onClick={() => setUI({ swipeHint: null })}>
        <Icon name="swap" />{t('Psst: swipe a set. Left deletes, right copies.')}</button>}
      {plateLine(i)}
      {!isWarmupRow(s) && dropsOf(s).map((d, di) => <div key={'d' + di} className="hv-row hv-sub-row">
        <span className="hv-set"><span className="hv-d">D</span></span><span />
        <NumberField decimal className="hv-num" value={d.w ?? ''} onChange={v => setDropField(i, di, 'w', v)} aria-label={t('Drop {0}', di + 1)} />
        <NumberField decimal={false} className="hv-num" value={d.r ?? ''} onChange={v => setDropField(i, di, 'r', v)} aria-label={t('Reps')} />
        <button type="button" className="iconbtn hv-x" aria-label={t('Remove drop')} onClick={() => removeDrop(i, di)}><Icon name="xmark" /></button>
      </div>)}
      {!isWarmupRow(s) && clustersOf(s).map((c, ci) => <div key={'c' + ci} className="hv-row hv-sub-row">
        <span className="hv-set"><span className="hv-d">+</span></span><span className="hv-prev">{c.restSec}s</span><span />
        <NumberField decimal={false} className="hv-num" value={c.r ?? ''} onChange={v => setBurstReps(i, ci, v)} aria-label={t('Burst {0}', ci + 1)} />
        <button type="button" className="iconbtn hv-x" aria-label={t('Remove burst')} onClick={() => removeBurst(i, ci)}><Icon name="xmark" /></button>
      </div>)}
    </div>)}
    <button type="button" className="hv-addset" onClick={onAddSet}><Icon name="plus" />{t('Add Set')}</button>
  </div>
}
