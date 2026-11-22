// The workout screen's menus for one exercise (hevier/DECISIONS.md D5, D8, D41, D127): the set-type
// picker behind a set's number, the exercise's More and its weight unit. They only list; every change goes
// through the handlers HevyExerciseBlock passes in.
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { canBeWarmup, setSpanAt, EFFORT, isPerSide } from '../../lib/history.js'
import { REST_MAX, restWheelValue } from '../../lib/duration.js'
import { ownExerciseRest } from '../../lib/supersetFlow.js'
import { restTimerText } from '../lib/elapsed.js'
import { durationSheet } from '../../components/DurationWheel.jsx'
import { isWarmupRow, isFailureSet, isDropSet, isRestPauseSet } from '../../lib/workout-model.js'
import { menuSheet, effortPickerSheet, barWeightSheet } from '../../sheets.jsx'
import { isHoldRow, canBeHold, setTicked } from '../lib/hold-set.js'
import { exUnitChoice, setExUnit, defaultStep, unitChoices } from '../lib/ex-unit.js'
import { setSideOrder } from '../lib/side-order.js'
import { partOn } from '../lib/module-parts.js'
import { moduleOn } from '../lib/fork-modules.js'

// D5: the set number is Hevy's set-type picker, with openGym's extra kinds of set below it.
// `rest` is the set's own rest and the one it takes without, with `save(sec)`; none while editing.
// `trend` is the words of the ↑ = ↓ beside the set number, which the sheet spells out under its title.
export function setTypeMenu({ sets, i, mode, editing, rest, setPhaseAt, setFailureAt, setHold, addDropRow, addBurstRow, onCopySetAt, onRemoveSetAt, onField, note, trend }) {
  const s = sets[i]
  const cardio = mode === 'cardio'
  const warm = isWarmupRow(s)
  const fail = isFailureSet(s)
  const hold = isHoldRow(s)
  const ticked = setTicked(sets, i)
  const otherWork = sets.some((x, j) => j !== i && !isWarmupRow(x))
  // Why the kinds a warm-up can't be are greyed out.
  const notWarm = t('Not for a warm-up')
  menuSheet({
    title: t('Select set type'),
    subtitle: trend || undefined,
    sections: [
      { items: [
        mode === 'reps' && { icon: 'sunrise', label: t('Warm-up set'), on: warm, disabled: !warm && (hold || !(mode === 'reps' && canBeWarmup(s) && otherWork)),
          onClick: () => { if (!warm) setPhaseAt(i, true) } },
        { icon: 'dumbbell', label: t('Normal set'), on: !warm && !fail && !isDropSet(s) && !hold, disabled: hold && ticked,
          onClick: () => { if (warm) setPhaseAt(i, false); else if (fail) setFailureAt(i, false); else if (hold) setHold(i, false) } },
        !cardio && { icon: 'gauge', label: t('Failure set'), sub: warm ? notWarm : undefined, on: fail, disabled: warm, onClick: () => setFailureAt(i, !fail) },
        mode === 'reps' && { icon: 'arrowDown', label: t('Drop set'), sub: warm ? notWarm : t('+ Drop'), disabled: warm || hold || isRestPauseSet(s), onClick: () => addDropRow(i) },
        mode === 'reps' && { icon: 'timer', label: t('Timed hold'), sub: warm ? notWarm : t('Seconds in place of reps'), on: hold,
          disabled: ticked || (!hold && !canBeHold(s, mode)), onClick: () => setHold(i, !hold) },
      ] },
      { title: t('More'), items: [
        // A note on this set (upstream 1.4.4's set note, D5's 1.4.4 note): shown under the row and in History.
        note && { icon: 'note', label: note.text ? t('Edit note') : t('Note'), sub: note.text || t('A word about this set'), onClick: note.open },
        mode === 'reps' && !warm && !hold && !isDropSet(s) && { icon: 'bolt', label: t('Rest-pause burst'), sub: t('+ Burst'), onClick: () => addBurstRow(i) },
        // Cardio's effort, as upstream's set menu has it: RPE only, stored as the set's `rpe`.
        cardio && !warm && { icon: 'gauge', label: t('How hard it felt'), sub: s.rpe != null ? t(EFFORT.rpe.hd) + ' ' + fmtNum(s.rpe) : t('Not rated yet'),
          onClick: () => effortPickerSheet('rpe', s.rpe ?? null, nv => onField(i, 'rpe', nv), { cardio: true }) },
        // Just this set's rest, this session (#609).
        rest && { icon: 'timer', label: t('Rest after this set'), sub: restText(rest.own, rest.dflt), onClick: () => setRestMenu(rest) },
        onCopySetAt && { icon: 'copy', label: t('Copy this set'), onClick: () => onCopySetAt(i) },
      ] },
      { items: [
        { icon: 'xmark', label: t('Remove set'), danger: true,
          disabled: !editing && sets.length <= setSpanAt(sets, i)[1], onClick: () => onRemoveSetAt(i) },
      ] },
    ],
  })
}

// The fallback is named by where it comes from: the exercise's rest (or what it takes from Settings).
const restText = (own, dflt) => (own == null ? t('This exercise ({0})', restTimerText(dflt, 0, t('Off')))
  : own === 0 ? t('No timer') : restTimerText(own, 0, ''))

// Upstream's three choices for a set's own rest: the exercise's, none, or a time from the wheel.
function setRestMenu({ own, dflt, save }) {
  menuSheet({
    title: t('Rest after this set'),
    items: [
      { icon: 'timer', label: restText(null, dflt), on: own == null, onClick: () => save(null) },
      { icon: 'pause', label: t('No timer'), on: own === 0, onClick: () => save(0) },
      { icon: 'clock', label: own > 0 ? t('Pick a time') + ' · ' + restTimerText(own, 0, '') : t('Pick a time'), on: own > 0, onClick: () => durationSheet({
        title: t('Rest after this set'), value: own > 0 ? own : dflt, max: REST_MAX, off: t('No timer'), onDone: sec => save(sec > 0 ? sec : 0) }) },
    ],
  })
}

// The card's rest button: upstream's "Rest for this exercise" (views/Workout.jsx openExerciseRest),
// with the Settings rest named and a picked time shown. It writes restSec / restOff as upstream does.
// `S` is read fresh when the button is tapped.
export function exerciseRestMenu(S, update, idx) {
  const entry = S.active?.entries?.[idx]
  if (!entry) return
  const activeId = S.active.id
  const entryId = entry.id
  const own = ownExerciseRest(entry.target)
  const setRest = sec => update(s => {
    const e = s.active?.id === activeId ? s.active.entries?.[idx] : null
    if (!e || e.id !== entryId) return
    const { restSec: _sec, restOff: _off, ...target } = e.target || {}
    e.target = sec == null ? target : sec > 0 ? { ...target, restSec: sec } : { ...target, restOff: true }
  })
  menuSheet({
    title: t('Rest for this exercise'),
    items: [
      { icon: 'timer', label: t('Settings ({0})', restTimerText(S.restSec, 0, t('Off'))), on: own == null, onClick: () => setRest(null) },
      { icon: 'pause', label: t('No timer'), on: own === 0, onClick: () => setRest(0) },
      { icon: 'clock', label: own > 0 ? t('Pick a time') + ' · ' + restTimerText(own, 0, '') : t('Pick a time'), on: own > 0, onClick: () => durationSheet({
        title: t('Rest for this exercise'), value: restWheelValue(own, S.restSec), max: REST_MAX, off: t('No timer'),
        onDone: v => setRest(v > 0 ? v : 0),
      }) },
    ],
  })
}

// D41: the exercise's unit and its step, picked from ⋮; switching changes no stored weight.
export function unitMenu(S, update, exId) {
  const { profile, alt, steps } = unitChoices(S.unit)
  const pick = (u, step) => update(s => { setExUnit(s, exId, u, step) })
  const cur = exUnitChoice(S, exId)
  menuSheet({
    title: t('Weight unit'),
    sections: [
      { items: [{ label: t('{0}, as the profile', profile), on: !cur, onClick: () => pick(null) }] },
      { title: t('In {0}, stepping by', alt), items: steps.map(st => ({
        label: fmtNum(st) + ' ' + alt + (st === defaultStep(exId, alt) ? ' · ' + t('Recommended') : ''),
        on: cur?.step === st, onClick: () => pick(alt, st),
      })) },
    ],
  })
}

// D127: More on the open exercise (Swap, Note, History, Rest and Reorder are buttons beside it):
// Per side, Superset, Weight unit, Exercise settings and Remove exercise, each with an icon, and
// between them what else the menu held before (D8), so nothing is lost. `p` is the block's props,
// `x` what the block worked out for the exercise.
export function exerciseMenu(p, x) {
  const { S, update, ex, entry, cfg, mode, bw, perSide, first, unit, exUnit, convertsUnit, unitChoice, guidance, plateLoading } = x
  const pairs = [
    !p.superset && p.onPairPrev && { icon: 'link', label: t('Make superset with previous'), onClick: p.onPairPrev },
    !p.superset && p.onPairNext && { icon: 'link', label: t('Make superset with next'), onClick: p.onPairNext },
    p.superset && p.onUnpair && { icon: 'link', label: t('Unpair'), onClick: p.onUnpair },
  ].filter(Boolean)
  menuSheet({
    title: exerciseNameFor(ex),
    titleClass: exerciseNameClass(ex),
    sections: [
      { items: [
        // shortcut: Per side is switched in Exercise settings, which rebuilds the rows (views/Workout.jsx
        // openProgressionSettings); a one-tap switch needs that rebuild reachable from the fork.
        mode !== 'cardio' && p.onProgressionSettings && { icon: 'sides', label: t('Per side'), sub: t('In Exercise settings'),
          on: isPerSide(cfg), onClick: p.onProgressionSettings },
        pairs.length > 0 && { icon: 'link', label: t('Superset'), sub: p.superset ? t('Unpair') : undefined, chevron: true,
          onClick: () => menuSheet({ title: t('Superset'), items: pairs }) },
        mode === 'reps' && !bw && partOn(S, 'hvExercise', 'units') && { icon: 'ruler', label: t('Weight unit'),
          sub: convertsUnit ? (unitChoice?.step != null ? t('{0} · {1} {0} steps', exUnit, fmtNum(unitChoice.step)) : exUnit) : t('{0}, as the profile', unit),
          onClick: () => unitMenu(S, update, entry.id) },
        p.onProgressionSettings && { icon: 'slider', label: t('Exercise settings'),
          sub: guidance ? t(guidance.policyLabel) + ' · ' + t(...guidance.why) : t('Sets, reps, rest, progression'),
          onClick: p.onProgressionSettings },
      ] },
      { items: [
        p.onNoProg && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('This exercise, this session only'), on: entry.noProg === true, onClick: () => p.onNoProg(entry.noProg !== true) },
        plateLoading && mode === 'reps' && partOn(S, 'hvExercise', 'plates') && moduleOn(S, 'plates') && { icon: 'plate', label: t('Plate loading'), onClick: () => barWeightSheet(entry.id, cfg) },
        p.routineUpdate && { icon: 'clipboard', label: t('Update routine'), sub: p.routineUpdate.sub, onClick: p.routineUpdate.run },
        perSide && { icon: 'swap', label: t('Side order'), sub: first === 'R' ? t('Right first') : t('Left first'),
          onClick: () => menuSheet({ title: t('Side order'), sections: [{ items: [
            { label: t('Left first'), on: first === 'L', onClick: () => update(s => { setSideOrder(s, entry.id, false) }) },
            { label: t('Right first'), on: first === 'R', onClick: () => update(s => { setSideOrder(s, entry.id, true) }) },
          ] }] }) },
      ] },
      // Upstream's one-step moves, beside Reorder's drag: a way without dragging (the audit, 2026-11-21, changes D118).
      { items: [
        p.onReorder && p.onMoveUp && { icon: 'chevronUp', label: t('Move up'), disabled: p.busy || !p.canMoveUp, onClick: p.onMoveUp },
        p.onReorder && p.onMoveDown && { icon: 'chevronDown', label: t('Move down'), disabled: p.busy || !p.canMoveDown, onClick: p.onMoveDown },
      ] },
      { items: [
        p.onRemoveExercise && { icon: 'xmark', label: t('Remove exercise'), danger: true, disabled: p.busy, onClick: p.onRemoveExercise },
      ] },
    ],
  })
}
