// D2's "touched" marks (a value typed or copied this session) are kept per row number, as
// `${row}:${field}`. When a set is added or removed above a row, its number changes, so the marks
// move with it: the rows before and after are compared, and the marks below the first row that
// differs shift by the rows added or removed there (the removed rows' marks go).

/** The marks for the rows `after`, from those for `before` (each a list of the rows as JSON). */
export function shiftTouched(marks, before, after) {
  const n = after.length - before.length
  if (!n || !marks.size) return marks
  let k = 0
  while (k < before.length && k < after.length && before[k] === after[k]) k++
  const out = new Set()
  for (const key of marks) {
    const at = key.indexOf(':')
    const i = Number(key.slice(0, at))
    if (i < k) out.add(key)
    else if (n > 0) out.add(i + n + key.slice(at))
    else if (i >= k - n) out.add(i + n + key.slice(at))
  }
  return out
}

/** The marks after the rows were reordered: `order[j]` is the old number of new row `j`. */
export function reorderTouched(marks, order) {
  if (!marks.size) return marks
  const out = new Set()
  for (const key of marks) {
    const at = key.indexOf(':')
    const j = order.indexOf(Number(key.slice(0, at)))
    if (j !== -1) out.add(j + key.slice(at))
  }
  return out
}
