// Progression off by default (hevier/DECISIONS.md D61, its 1.4.4 note). Since upstream 1.4.4 the
// profile has a default rule of its own (`S.progDefault`, #814, the fork's PR; Settings →
// Fine-tuning), linear unless the lifter picks another. The fork's is No progression: a profile
// that never chose one (upstream stamps `edited.progDefault` once it is chosen) is stored Off, once
// on install and again when a sync brings a profile that never chose. A choice made anywhere,
// linear included, is kept.

/** Whether profile `S` still has upstream's default rule, never chosen. */
export const unchosenDefault = S => !!S && S.progDefault !== 'off'
  && (S.progDefault == null || S.progDefault === 'linear') && !(S.edited && S.edited.progDefault)

/** Stores the fork's default rule, Off, in a store draft `s`. */
export function progDefaultOff(s) { s.progDefault = 'off' }

export function initProgDefault(store) {
  const run = () => { if (unchosenDefault(store.get())) store.update(progDefaultOff) }
  run()
  store.watch(['progDefault'])?.(run)
}
