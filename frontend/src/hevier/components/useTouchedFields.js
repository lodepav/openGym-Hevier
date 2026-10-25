// D2: which values of an exercise's sets were typed or copied this session, so the rest stay grey.
// A mark is a row's index and a field name ('w', 'r', or a side's 'Lw' …). A weight edit is also
// on the row itself as weightOrigin, which survives a reload; reps have no mark of their own.
import { useRef, useState } from 'react'
import { shiftTouched, reorderTouched } from '../lib/touched.js'

export function useTouchedFields(sets) {
  const [touched, setTouched] = useState(() => new Set())
  // A set added or removed above a row renumbers it: its marks move with it (lib/touched.js).
  // The rows are kept as they were last drawn, a value typed included, so the comparison finds
  // the row that went rather than the one typed into.
  const rowsNow = sets.map(s => JSON.stringify(s))
  const [rowsSeen, setRowsSeen] = useState(rowsNow)
  if (rowsNow.join('\n') !== rowsSeen.join('\n')) {
    setRowsSeen(rowsNow)
    if (rowsNow.length !== rowsSeen.length) setTouched(prev => shiftTouched(prev, rowsSeen, rowsNow))
  }
  // The sets as they were when typing began over a grey value, to put back if it is left empty:
  // { k: the field's mark, sets }.
  const typedOver = useRef(null)
  const mark = (i, key) => i + ':' + key
  return {
    isTouched: (i, key) => touched.has(mark(i, key)),
    touch: (i, key) => setTouched(prev => (prev.has(mark(i, key)) ? prev : new Set(prev).add(mark(i, key)))),
    untouch: (i, key) => setTouched(prev => {
      if (!prev.has(mark(i, key))) return prev
      const next = new Set(prev)
      next.delete(mark(i, key))
      return next
    }),
    // A set moved to another place (made a warm-up or a work set): `order[j]` is new row j's old number.
    reorder: order => setTouched(prev => reorderTouched(prev, order)),
    typedOver,
  }
}
