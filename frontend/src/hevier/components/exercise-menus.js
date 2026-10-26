// The workout screen's menus for one exercise (hevier/DECISIONS.md D5, D8, D41): the set-type
// picker behind a set's number, the ⋮ menu and its weight unit. They only list; every change goes
// through the handlers HevyExerciseBlock passes in.
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { canBeWarmup, setSpanAt } from '../../lib/history.js'
import { isWarmupRow, isFailureSet, isDropSet, isRestPauseSet } from '../../lib/workout-model.js'
import { menuSheet, exerciseDetailSheet, exerciseHistorySheet, barWeightSheet } from '../../sheets.jsx'
import { isHoldRow, canBeHold, setTicked } from '../lib/hold-set.js'
import { exUnitChoice, setExUnit, defaultStep, unitChoices } from '../lib/ex-unit.js'
import { setSideOrder } from '../lib/side-order.js'
import { brandSheet } from './GymLabels.jsx'

// D5: the set number is Hevy's set-type picker, with openGym's extra kinds of set below it.
export function setTypeMenu({ sets, i, mode, editing, setPhaseAt, setFailureAt, setHold, addDropRow, addBurstRow, onCopySetAt, onRemoveSetAt }) {
  const s = sets[i]
  const cardio = mode === 'cardio'
  const warm = isWarmupRow(s)
  const fail = isFailureSet(s)
  const hold = isHoldRow(s)
  const ticked = setTicked(sets, i)
  const otherWork = sets.some((x, j) => j !== i && !isWarmupRow(x))
  menuSheet({
    title: t('Select set type'),
    sections: [
      { items: [
        mode === 'reps' && { icon: 'sunrise', label: t('Warm-up set'), on: warm, disabled: !warm && (hold || !(mode === 'reps' && canBeWarmup(s) && otherWork)),
          onClick: () => { if (!warm) setPhaseAt(i, true) } },
        { icon: 'dumbbell', label: t('Normal set'), on: !warm && !fail && !isDropSet(s) && !hold, disabled: hold && ticked,
          onClick: () => { if (warm) setPhaseAt(i, false); else if (fail) setFailureAt(i, false); else if (hold) setHold(i, false) } },
        !cardio && { icon: 'gauge', label: t('Failure set'), on: fail, disabled: warm, onClick: () => setFailureAt(i, !fail) },
        mode === 'reps' && { icon: 'arrowDown', label: t('Drop set'), sub: t('+ Drop'), disabled: warm || hold || isRestPauseSet(s), onClick: () => addDropRow(i) },
        mode === 'reps' && { icon: 'timer', label: t('Timed hold'), sub: t('Seconds in place of reps'), on: hold,
          disabled: ticked || (!hold && !canBeHold(s, mode)), onClick: () => setHold(i, !hold) },
      ] },
      { title: t('More'), items: [
        mode === 'reps' && !warm && !hold && !isDropSet(s) && { icon: 'bolt', label: t('Rest-pause burst'), sub: t('+ Burst'), onClick: () => addBurstRow(i) },
        onCopySetAt && { icon: 'copy', label: t('Copy this set'), onClick: () => onCopySetAt(i) },
      ] },
      { items: [
        { icon: 'xmark', label: t('Remove set'), danger: true,
          disabled: !editing && sets.length <= setSpanAt(sets, i)[1], onClick: () => onRemoveSetAt(i) },
      ] },
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

// D8: everything about the exercise that is not a set lives behind ⋮ — Hevy's five items first,
// then what openGym adds (progression included), Remove last. `p` is the block's props, `x` what
// the block worked out for the exercise.
export function exerciseMenu(p, x) {
  const { S, update, ex, entry, cfg, mode, bw, perSide, first, unit, exUnit, convertsUnit, unitChoice, guidance, last, plateLoading } = x
  menuSheet({
    title: exerciseNameFor(ex),
    titleClass: exerciseNameClass(ex),
    sections: [
      { items: [
        p.onMoveUp && { icon: 'chevronUp', label: t('Move up'), onClick: p.onMoveUp, disabled: p.busy || !p.canMoveUp },
        p.onMoveDown && { icon: 'chevronDown', label: t('Move down'), onClick: p.onMoveDown, disabled: p.busy || !p.canMoveDown },
        p.onSwap && { icon: 'swap', label: t('Replace exercise'), onClick: p.onSwap, disabled: p.busy },
        !p.superset && p.onPairPrev && { icon: 'link', label: t('Make superset with previous'), onClick: p.onPairPrev },
        !p.superset && p.onPairNext && { icon: 'link', label: t('Make superset with next'), onClick: p.onPairNext },
        p.superset && p.onUnpair && { icon: 'link', label: t('Unpair'), onClick: p.onUnpair },
        { icon: 'sunrise', label: t('Add warm-up set'), onClick: p.onAddWarmup },
      ] },
      { items: [
        p.onProgressionSettings && { icon: 'slider', label: t('Exercise settings'),
          sub: guidance ? t(guidance.policyLabel) + ' · ' + t(...guidance.why) : t('Sets, reps, rest, progression'),
          onClick: p.onProgressionSettings },
        p.onNoProg && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('This exercise, this session only'), on: entry.noProg === true, onClick: () => p.onNoProg(entry.noProg !== true) },
        plateLoading && mode === 'reps' && { icon: 'plate', label: t('Plate loading'), onClick: () => barWeightSheet(entry.id, cfg) },
        // Any exercise can carry a label (D28), not only a machine, whose line is always there.
        !x.hasLabel && { icon: 'machine', label: t('Add brand'), sub: t('A brand or a note of your own, e.g. Achilles Rehab'), onClick: () => brandSheet(p.entryIdx) },
        p.routineUpdate && { icon: 'clipboard', label: t('Update routine'), sub: p.routineUpdate.sub, onClick: p.routineUpdate.run },
        perSide && { icon: 'swap', label: t('Side order'), sub: first === 'R' ? t('Right first') : t('Left first'),
          onClick: () => menuSheet({ title: t('Side order'), sections: [{ items: [
            { label: t('Left first'), on: first === 'L', onClick: () => update(s => { setSideOrder(s, entry.id, false) }) },
            { label: t('Right first'), on: first === 'R', onClick: () => update(s => { setSideOrder(s, entry.id, true) }) },
          ] }] }) },
        mode === 'reps' && !bw && { icon: 'ruler', label: t('Weight unit'),
          sub: convertsUnit ? t('{0} · {1} {0} steps', exUnit, fmtNum(unitChoice?.step)) : t('{0}, as the profile', unit),
          onClick: () => unitMenu(S, update, entry.id) },
        { icon: 'history', label: t('History'), sub: last ? t('Last time') + ' ' + fmtDate(last.d) : undefined, onClick: () => exerciseHistorySheet(entry.id) },
        { icon: 'info', label: t('How to do it'), onClick: () => exerciseDetailSheet(ex) },
      ] },
      { items: [
        p.onRemoveExercise && { icon: 'xmark', label: t('Remove exercise'), danger: true, disabled: p.busy, onClick: p.onRemoveExercise },
      ] },
    ],
  })
}
