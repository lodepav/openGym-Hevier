// A switch per part inside a module (hevier/DECISIONS.md D102), on top of upstream's Modules (D97).
// A module with two or more parts the fork draws lists them on a page of its own. The module wins:
// off, every part is hidden whatever its switch, and back on each part is as it was left. Upstream's
// presets set the modules only, never the parts. A part never set is on, unless it is off by
// default (`off: true`). Stored in `S.hvModuleParts` (`{ 'module.part': boolean }`, only the choices
// made), one fork field that syncs whole.
//
// Built 2026-11-03 with the parts the fork draws itself and that have no switch of their own; the
// others D102 named stay their module's (the plate line and automatic warm-ups have their own
// switches; Effort's Stats part, Health's reads and the Integrations cards are upstream's screens,
// which follow upstream's module switch). Motivation's challenges, recaps and Your year, and Health's
// recovery tips, joined as Home widgets (D98). D114 (2026-11-09) adds Integrations' Send to Hevy and
// OpenBite, Motivation's record marks, Strength's weekly sets, the Exercise settings categories, and
// the fork's own modules Gyms (`hvGyms`) and Statistics extras (`hvStats`, lib/fork-modules.js),
// which the Strength levels list moved into (its old switch, `strength.list`, still decides until
// the new one is set: `was`).
import { isOn } from '../../lib/modules.js'

export const PARTS = {
  strength: [
    { id: 'details', title: 'In an exercise’s details', desc: 'Beginner to Elite from your own thresholds, under the records.' },
    { id: 'weekly', title: 'Weekly sets per muscle', desc: 'Sets per muscle this week against a target range, on Home and Statistics.' },
  ],
  body: [
    { id: 'weight', title: 'Body weight', desc: 'The Home widget, and the weight chart, goal and log in Measures.' },
    { id: 'measurements', title: 'Body measurements', desc: 'Circumferences and your own fields, in Measures.' },
    { id: 'photos', title: 'Progress photos', desc: 'Photos of you over time, in Measures.' },
  ],
  motivation: [
    { id: 'streak', title: 'Week streak', desc: 'On Home and in the Calendar.' },
    { id: 'challenges', title: 'Monthly challenges', desc: 'Three small goals a month, on Home.' },
    { id: 'recaps', title: 'Week and month recap', desc: 'Your week, your month: a card on Home when one is over.' },
    { id: 'year', title: 'Your year in openGym', desc: 'From December to January, your year on Home.' },
    { id: 'share', title: 'Share as a picture', desc: 'A finished workout or a month, as a card to save or send.' },
    { id: 'records', title: 'Record marks', desc: 'A trophy on a set that beats a record, and the records on a finished workout.' },
  ],
  // D98: the recovery tips join the strap.
  health: [
    { id: 'strap', title: 'Heart-rate strap', desc: 'A Bluetooth strap records every workout, with its live reading.' },
    { id: 'tips', title: 'Recovery tips', desc: 'Now and then a word on Home about what has rested.' },
  ],
  // D114: upstream's webhooks and MCP server follow the module alone.
  integrations: [
    { id: 'hevy', title: 'Send to Hevy', desc: 'New workouts and changed routines go to Hevy by themselves, with your API key.' },
    { id: 'openbite', title: 'OpenBite', desc: 'Your diet phase on workouts and in Statistics, and how strength is going, for OpenBite.' },
  ],
  // D114: the categories of an exercise's settings; sets, reps, weight, rests and the note always show.
  hvExercise: [
    { id: 'progression', title: 'Progression', desc: 'The rule that moves the weight or reps up, in an exercise’s settings.' },
    { id: 'plates', title: 'Plate loading', desc: 'The bar, plates and weight stack of an exercise. Also needs Plates and warm-ups.' },
    { id: 'intensity', title: 'Drop-sets, rest-pause and pyramids', desc: 'Sets that change shape, and the last set to failure.' },
    { id: 'units', title: 'Weight unit and dumbbells', desc: 'An exercise’s own kg or lb, and what a dumbbell weight means.' },
  ],
  hvGyms: [
    { id: 'brands', title: 'Machine brands and cable setups', desc: 'A brand or cable setup per gym on a machine exercise, and records per machine.' },
    { id: 'nearby', title: 'Gyms nearby', desc: 'Find a gym near you on the map when you add one.' },
    { id: 'backups', title: 'Backups per gym', desc: 'A routine started at a gym swaps in the backups that gym takes.' },
  ],
  hvStats: [
    { id: 'report', title: 'Monthly report', desc: 'Your month in numbers, on Statistics.' },
    { id: 'time', title: 'Exercise time', desc: 'How long each exercise takes, on a workout and on a page of its own.' },
    { id: 'levels', title: 'Strength levels list', desc: 'Every exercise by the level it reaches. Also needs Strength levels.', was: 'strength.list' },
  ],
}

const key = (mod, part) => mod + '.' + part
const partOf = (mod, part) => (PARTS[mod] || []).find(p => p.id === part)

/** Whether module `mod` lists parts of its own. */
export const hasParts = mod => (PARTS[mod] || []).length > 1

/** The part's own switch, whatever the module says: its stored choice, else its default. */
export function partSwitch(S, mod, part) {
  const v = S?.hvModuleParts?.[key(mod, part)]
  if (typeof v === 'boolean') return v
  const p = partOf(mod, part), was = p?.was && S?.hvModuleParts?.[p.was]
  return typeof was === 'boolean' ? was : !p?.off
}

/** Whether part `part` of module `mod` shows: the module on (upstream's isOn) and the part's switch. */
export const partOn = (S, mod, part) => isOn(S, mod) && partSwitch(S, mod, part)

/** Whether any part of `mod` shows (a screen that only holds its parts, like Measures). */
export const anyPartOn = (S, mod) => isOn(S, mod) && (PARTS[mod] || []).some(p => partSwitch(S, mod, p.id))

/** Sets a part's switch in a store draft `s`. */
export function setPart(s, mod, part, on) {
  if (!partOf(mod, part)) return
  s.hvModuleParts = { ...(s.hvModuleParts && typeof s.hvModuleParts === 'object' ? s.hvModuleParts : {}), [key(mod, part)]: !!on }
}
