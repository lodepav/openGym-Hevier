// D2, as Hevy does it: a prefilled value nobody has touched is the field's
// grey placeholder, not its text, so a tap neither selects it nor opens the copy/paste menu.
// Typing replaces it; leaving the field empty keeps it (`onRestore`). A firm value is not
// selected either (changed 2026-10-20: the selection opened Android's copy menu at every tap):
// the caret goes to its end, the first key typed replaces the number, and a backspace edits it.
// One input for both, so the keyboard stays up when the first key makes the value firm. The
// parsing is upstream's NumberField's (components/ui.jsx), copied: it takes no placeholder mode.
import { useRef, useState } from 'react'

export default function HintNumberField({ value, onChange, onTypeOver, onRestore, hint = false, decimal = true, nullable = false, className = '', ...rest }) {
  const [draft, setDraft] = useState(null)
  const committed = useRef(null)
  const fresh = useRef(false)  // a firm value just focused: the first key typed replaces it
  const over = useRef(false)   // typing began over the grey value, in this focus
  if (draft !== null && (committed.current ?? null) !== (value ?? null)) { setDraft(null); committed.current = null }
  const empty = hint && draft === null
  const commit = raw => {
    if (empty && !over.current) { over.current = true; onTypeOver?.() }
    let s = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
    const i = s.indexOf('.')
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
    const whole = !decimal && i !== -1 ? s.slice(0, i) : s
    const n = whole === '' || whole === '.' ? (nullable ? null : 0) : Math.max(0, parseFloat(whole))
    committed.current = n
    setDraft(s)
    onChange(n)
  }
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      className={'num ' + className}
      value={empty ? '' : (draft ?? (value ?? ''))}
      placeholder={empty ? String(value ?? '') : undefined}
      onFocus={e => {
        over.current = false
        if (hint) return
        fresh.current = true
        // After the tap has placed the caret: at the end, nothing selected.
        const el = e.target
        setTimeout(() => { if (document.activeElement === el) { const n = el.value.length; el.setSelectionRange?.(n, n) } }, 0)
      }}
      onChange={e => {
        const was = fresh.current
        fresh.current = false
        commit(was ? typedOver(String(draft ?? value ?? ''), e.target.value) : e.target.value)
      }}
      onBlur={() => {
        if (over.current && (draft ?? '') === '') onRestore?.()
        over.current = false
        setDraft(null); committed.current = null; fresh.current = false
      }}
      {...rest}
    />
  )
}

/** What a field reads after the first key typed into a firm value: the typed text alone, as if the
 * value had been selected; a deletion edits the value as usual. */
export function typedOver(before, after) {
  if (after.length <= before.length) return after
  let a = 0
  while (a < before.length && before[a] === after[a]) a++
  let b = 0
  while (b < before.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++
  return after.slice(a, after.length - b)
}
