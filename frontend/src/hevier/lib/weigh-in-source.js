// Health Connect as the only source of weigh-ins (hevier/DECISIONS.md D32, seam S22): while upstream's
// "Weigh-ins from other apps" read is on and its Health module too, no weigh-in is typed in. The read's state is on the phone
// (upstream's lib/health-sync.js), so this module keeps a copy that the screens can read at once.
import { useSyncExternalStore } from 'react'
import { loadHealth, onHealthChange } from '../../lib/health-sync.js'
import { isOn } from '../../lib/modules.js'

let on = false
const subs = new Set()
const set = h => {
  const next = !!h?.readWeight
  if (next === on) return
  on = next
  for (const cb of subs) cb()
}

/** Starts following the read's switch. */
export function initWeighInSource(load = loadHealth, onChange = onHealthChange) {
  onChange(set)
  return Promise.resolve(load()).then(set).catch(() => {})
}

/** Whether weigh-ins come from Health Connect only: the read on, and the Health module that runs it. */
export const hcOnly = S => on && isOn(S, 'health')

const readOn = () => on
export function useHcOnly(S) {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, readOn, readOn) && isOn(S, 'health')
}

/**
 * Upstream's `bwSheet(opts)` asks first (S22): true means the sheet is not opened. The check-in
 * before a workout goes on without a weight; any other Log says where weigh-ins come from.
 */
export function weighInBlocked(S, opts = {}, say) {
  if (!hcOnly(S)) return false
  if (opts.required) opts.onDone?.(null)
  else say?.()
  return true
}
