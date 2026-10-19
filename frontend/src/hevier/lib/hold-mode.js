// A hold starts as a hold (D55). Upstream logs every catalogue exercise that is not cardio as
// weight × reps until its settings say otherwise (`modeOf`, lib/history.js), so a plank added to a
// workout or a routine asked for reps. `holdMode` answers upstream's `defaultConfig` (seam S32)
// when nothing else chose a mode: 'time' for a catalogue exercise that is only ever held, and for
// any exercise whose last logged sets were timed (an imported Hevy plank's are). Everything else,
// and an entry whose settings already name a mode, stays upstream's.
import { lastEntryFor } from '../../lib/history.js'
import { isCardio } from '../../lib/exercises.js'

// Static holds of the catalogue, by id: planks and side bridges, wall sits, L-sits, hollow holds,
// levers, planches and handstands, hangs, isometric holds. The same list is offered upstream as a
// catalogue flag (DuarteSantos8/openGym#694). A plank with a movement in it (jacks, taps, rows,
// walk-outs) is not one, nor a Pallof press, though the catalogue files both as isometric.
export const HOLDS = new Set([
  // planks
  '0463', '2135', '0715', '0714', '4811', '2899', '0133', '1470', '1469', '3544', '3238', '3983',
  '5159', '7389', '1706', '7275', '1148', '1135', '1134', '1145', '0867', '5045', '4934', '8610',
  '4170', '1193', '2164', '5879', '10041', '2155', '2526',
  // side bridges and bridge holds
  '0706', '0701', '0705', '5047', '4458', '3337', '4457', '0568', '4894', '1098', '0142', '0143', '0668',
  // core holds
  '1246', '6547', '9486', '1402', '3419', '11877', '3420', '5344', '4332', '9451', '6019',
  '3226', '3230', '4348', '5399', '9313',
  // hangs, levers, supports
  '6545', '9045', '9043', '9044', '4983', '1442', '9320', '9325', '9311', '9317', '10950',
  '1357', '3836', '3835', '3832', '3834', '3833',
  // levers, planches, the flag, handstands
  '3297', '3296', '3303', '3301', '3315', '3299', '3300', '10665', '3314', '3298', '10989', '3302', '10998',
  // wall sits and leg holds
  '7557', '7558', '7559', '6558', '6344', '10906', '10907', '10915', '5198', '6001', '11451', '10926',
  '0734', '0731', '10113', '3714', '3715',
  // loaded holds
  '2717', '2718', '2726', '1448', '1446', '1444', '1450', '1449', '1443', '4910', '7588',
  '2714', '1044', '9607',
  // single-joint isometric holds
  '11792', '10138', '10921', '10139', '5061', '5145', '9310', '9994', '1297', '8200', '10126', '9990', '9995', '9996',
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
