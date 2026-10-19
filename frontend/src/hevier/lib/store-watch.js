// Battery: the fork's background-ish passes (the Health Connect read, the
// Hevy export, the month widget) each wake only when a field of S they read has changed. The
// running workout lives in `S.active`, so watching S as a whole woke all three for every set
// typed or ticked. The store's update deep-copies S (store/useStore.js `clone`), so every field
// is a new object after any change: fields are compared by content, as JSON. Each copy of S is
// written out once per field, however many watchers and screens ask.

const sigs = new WeakMap()

/** A field of S as JSON, kept per copy of S. */
export function fieldSig(S, key) {
  if (!S || typeof S !== 'object') return ''
  let m = sigs.get(S)
  if (!m) sigs.set(S, (m = new Map()))
  if (!m.has(key)) m.set(key, JSON.stringify(S[key] ?? null))
  return m.get(key)
}

/** True when any of `keys` differs between two copies of S. */
export const fieldsChanged = (a, b, keys) => a !== b && keys.some(k => a?.[k] !== b?.[k] && fieldSig(a, k) !== fieldSig(b, k))

/** A subscribe function for the init helpers: calls back when one of `keys` of S changed. */
export const watchS = (subscribe, keys) => cb => subscribe((a, b) => {
  if (a.S !== b.S && fieldsChanged(a.S, b.S, keys)) cb()
})

/**
 * The store as every fork `init*` helper takes it: `get()` the state S, `update(fn)` a change to
 * it, `watch(keys)` a subscribe that wakes only when one of those fields of S changed,
 * `subscribe(fn)` to the whole store (`fn(state, previous)`), and `toast(msg, opts)`.
 */
export const storeAdapter = (useStore, toast) => ({
  get: () => useStore.getState().S,
  update: fn => useStore.getState().update(fn),
  watch: keys => watchS(useStore.subscribe, keys),
  subscribe: fn => useStore.subscribe(fn),
  toast,
})
