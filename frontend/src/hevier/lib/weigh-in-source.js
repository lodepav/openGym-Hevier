// Health Connect as the only source of weigh-ins (hevier/DECISIONS.md D32, seam S22): while D27's
// "Weigh-ins from other apps" read is on, no weigh-in is typed in. The read's state is on the phone
// (health-read-sync.js), so this module keeps a copy that the screens can read at once.
import { useSyncExternalStore } from 'react'
import { loadRead, onReadChange } from './health-read-sync.js'

let on = false
const subs = new Set()
const set = h => {
  const next = !!h?.readWeight
  if (next === on) return
  on = next
  for (const cb of subs) cb()
}

/** Starts following the read's switch. */
export function initWeighInSource(load = loadRead, onChange = onReadChange) {
  onChange(set)
  return Promise.resolve(load()).then(set).catch(() => {})
}

/** Whether weigh-ins come from Health Connect only. */
export const hcOnly = () => on

export function useHcOnly() {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, hcOnly, hcOnly)
}

/**
 * Upstream's `bwSheet(opts)` asks first (S22): true means the sheet is not opened. The check-in
 * before a workout goes on without a weight; any other Log says where weigh-ins come from.
 */
export function weighInBlocked(opts = {}, say) {
  if (!on) return false
  if (opts.required) opts.onDone?.(null)
  else say?.()
  return true
}
