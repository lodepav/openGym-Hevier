// The shoulder's three heads, fork-only (hevier/DECISIONS.md D65). Upstream has one shoulder
// muscle, `deltoids`, and its catalogue names every shoulder exercise's target "delts"; the
// split it would need is upstream issue #638. Until then the fork sorts a shoulder exercise
// into front, side or rear by its name, for the muscle filters only (D64's Shoulders group):
// nothing is stored, no statistic or body map changes. A shoulder exercise no rule names
// (stretches, rotator-cuff work, carries, Olympic lifts) is only under Shoulders as a whole.
import { smOf } from '../../lib/exercises.js'

export const HEADS = ['front', 'side', 'rear']
// The picker's names (Hevy's spelling) and the explorer's keys beside the body map's muscles.
export const HEAD_NAME = { front: 'Front Delts', side: 'Side Delts', rear: 'Rear Delts' }
export const HEAD_SLUG = { front: 'delts-front', side: 'delts-side', rear: 'delts-rear' }
const BY_NAME = Object.fromEntries(HEADS.map(h => [HEAD_NAME[h], h]))
const BY_SLUG = Object.fromEntries(HEADS.map(h => [HEAD_SLUG[h], h]))
export const headOfName = n => BY_NAME[n] || null
export const headOfSlug = s => BY_SLUG[s] || null

// In this order: a bent-over lateral raise is the rear's, a lateral-to-front raise the side's.
const REAR = /\brear\b|revers(e)? (delt )?fly|reverse pec|face pull|posterior|bent[- ]over\b.*(lateral|raise|fly)|pull ?apart|delt row|high pull|powell|\bt-raise|\bw raise/i
const SIDE = /lateral|side raise|side lying.*raise|upright row|\by[- ]raise|lu raise|\by elevation/i
const FRONT = /\bfront\b|forward raise|press|arnold|military|pike push|handstand push|jerk|thruster|\braise\b/i

/** The head a shoulder exercise (target delts or shoulders) works most, by its name; null when none says. */
export function headOf(ex) {
  if (!isShoulder(ex)) return null
  const n = String(ex.n || ex.name || '')
  if (REAR.test(n)) return 'rear'
  // Rotator-cuff work (a lateral or external rotation) is no head's, unless it raises or presses too.
  if (/rotation/i.test(n) && !/raise|press/i.test(n)) return null
  return SIDE.test(n) ? 'side' : FRONT.test(n) ? 'front' : null
}
const isShoulder = ex => ['delts', 'deltoids', 'shoulders'].includes(ex?.tg)

/**
 * The explorer's share of a head (as upstream's `musclesOf` reads a muscle): the exercise's
 * shoulder load when it is that head's; for the rear also a secondary "rear deltoids" (rows,
 * pull-downs), and for the front a chest exercise's or a triceps press's or dip's secondary
 * shoulders (the catalogue names no head there, but pressing and flys work the front), each at
 * the part the shoulder gets.
 */
export function headShare(head, ex, load) {
  const d = load?.deltoids
  if (!d) return undefined
  if (headOf(ex) === head) return d
  if (isShoulder(ex)) return undefined
  if (head === 'rear') return smOf(ex).includes('rear deltoids') ? d : undefined
  if (head === 'front') return frontSecondary(ex) ? d : undefined
  return undefined
}
const frontSecondary = ex => !smOf(ex).includes('rear deltoids')
  && (['pectorals', 'chest'].includes(ex.tg) || (ex.tg === 'triceps' && /press|dip|push[- ]?up/i.test(String(ex.n || ex.name || ''))))
