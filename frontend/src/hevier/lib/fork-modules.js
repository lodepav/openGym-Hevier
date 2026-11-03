// Upstream's Modules (lib/modules.js, 1.4.4), followed by the fork's screens too (hevier/DECISIONS.md
// D97). A module that is off hides the fork's part of it as it hides upstream's, and a fork default
// that is off (D84's plate line) stays off. Every fork screen asks `moduleOn`, which is upstream's
// isOn: one source of truth, never S.modules read directly. FORK_PARTS names what the fork adds to
// each module, for D102's switch per part and for the docs; a fork feature in no module is core.
import { isOn } from '../../lib/modules.js'
import { partOn } from './module-parts.js'

export const moduleOn = (S, id) => isOn(S, id)

/** What the fork draws that each module switches, by decision. */
export const FORK_PARTS = {
  effort: ['D6: the workout’s effort column (through upstream’s effortOf)'],
  plates: ['D84: the plate line under a set', 'D69: automatic warm-ups where a routine progresses (through upstream’s warmupAutoOf)'],
  strength: ['D19: the level in an exercise’s details', 'D81: the list of every exercise by level'],
  body: ['D12: the body-weight Home widget', 'D14: Measures on Profile'],
  health: ['D79: the heart-rate strap, its button, live reading and Settings', 'D80: the strap’s full screen', 'D91: its workout card'],
  motivation: ['D59: the streak (Home widget, Calendar)', 'D87: sharing a workout or a month as a picture'],
}

// Upstream's modules whose every feature the fork leaves out or keeps off (Form videos and Gym
// check-in, D100 and D12; Watch, no watch app in the fork; AI Coach, D11; Seasonal themes, D17).
// Settings → Modules does not list them (seam S54, the user's choice 2026-11-03); what they store
// is left as it is, so a preset still writes them.
export const HIDDEN_MODULES = ['videos', 'watch', 'checkin', 'coach', 'seasonal']

// The Home widgets (D12) a module part switches (D102); the others are core.
const WIDGET_PART = {
  streak: ['motivation', 'streak'], weight: ['body', 'weight'],
  challenges: ['motivation', 'challenges'], recap: ['motivation', 'recaps'], year: ['motivation', 'year'], recoveryhint: ['health', 'tips'],
}
/** Whether Home widget `id` belongs to a module part that is on. */
export const widgetOn = (S, id) => !WIDGET_PART[id] || partOn(S, ...WIDGET_PART[id])
