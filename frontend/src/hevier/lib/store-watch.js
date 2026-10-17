// Battery (PLAN.md §5 item 29): the fork's background-ish passes (the Health Connect read, the
// Hevy export, the month widget) each wake only when a field of S they read has changed. The
// running workout lives in `S.active`, so watching S as a whole woke all three for every set
// typed or ticked. Fields are compared by identity, as the store replaces what it changes.

/** True when any of `keys` differs between two copies of S. */
export const fieldsChanged = (a, b, keys) => keys.some(k => a?.[k] !== b?.[k])

/** A subscribe function for the init helpers: calls back when one of `keys` of S changed. */
export const watchS = (subscribe, keys) => cb => subscribe((a, b) => {
  if (a.S !== b.S && fieldsChanged(a.S, b.S, keys)) cb()
})
