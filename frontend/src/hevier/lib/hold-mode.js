// A hold starts as a hold (D55). Upstream logs every catalogue exercise that is not cardio as
// weight × reps until its settings say otherwise (`modeOf`, lib/history.js), so a plank added to a
// workout or a routine asked for reps. `holdMode` answers upstream's `defaultConfig` (seam S32)
// when nothing else chose a mode: 'time' for a catalogue exercise that is only ever held, and for
// any exercise whose last logged sets were timed (an imported Hevy plank's are). Everything else,
// and an entry whose settings already name a mode, stays upstream's.
import { lastEntryFor } from '../../lib/history.js'
import { isCardio } from '../../lib/exercises.js'

// Static holds of the catalogue, by id: planks, wall sits, L-sits, hollow and lever holds,
// isometric holds. A plank with a movement in it (jacks, taps, rows, walk-outs) is not one.
export const HOLDS = new Set([
  // planks
  '0463', '2135', '0715', '0714', '4811', '2899', '0133', '1470', '1469', '3544', '3238', '3983',
  '5159', '7389', '1706', '7275', '1148', '1135', '1134', '1145', '0867', '5045', '4934', '8610',
  '4170', '1193', '2164', '5879', '10041',
  // core holds
  '1246', '6547', '9486', '1402', '3419', '11877', '3420', '5344', '4332', '9451', '6019',
  // hangs, levers, supports
  '6545', '9045', '9043', '9044', '4983', '1442', '9320', '9325', '9311', '9317', '10950',
  // wall sits and leg holds
  '7557', '7558', '7559', '6558', '6344', '10906', '10907', '10915', '5198', '6001', '11451', '10926',
  // loaded holds
  '2717', '2718', '2726', '1448', '1446', '1444', '1450', '1449', '1443', '4910', '7588',
])

const timedSets = sets => {
  const work = (sets || []).filter(s => s && s.phase !== 'warmup')
  return work.length > 0 && work.every(s => !(s.r > 0)) && work.some(s => s.sec > 0)
}

/** 'time' when a freshly added `id` should be a timed hold, else null (upstream decides). */
export function holdMode(S, id) {
  if (!id || isCardio(id)) return null
  if (HOLDS.has(String(id))) return 'time'
  const last = S ? lastEntryFor(S, id) : null
  return last && timedSets(last.sets) ? 'time' : null
}
