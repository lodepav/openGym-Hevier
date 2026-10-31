// The wiring around shared-phase.js (D93): the read from OpenBite (HevierPhasePlugin.java) and the
// statistics pages' filter, one choice across them, All again each time the app starts.
import { create } from 'zustand'
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { countedS } from './counted.js'
import { phaseFromRow, phasedS } from './shared-phase.js'

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/secret.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ P: registerPlugin('HevierPhase') }))
  return pluginP
}

/** OpenBite's phase now, for a workout about to be saved; null when it shares none. */
export async function readSharedPhase() {
  const p = await plugin()
  if (!p) return null
  try { return phaseFromRow(await p.P.read()) } catch { return null }
}

export const useStatsPhase = create(set => ({ phase: null, pick: phase => set({ phase }) }))

/** A React hook: `S` as the filter leaves it. */
export const usePhasedS = S => phasedS(S, useStatsPhase(s => s.phase))

/** Seam S34's hook, called while upstream's statistics pages render: counted (D57), then filtered. */
export const useStatsS = S => usePhasedS(countedS(S))
