// D2, as Hevy does it: a prefilled value nobody has touched is the field's
// grey placeholder, not its text, so a tap neither selects it nor opens the copy/paste menu.
// Typing replaces it; leaving the field empty keeps it (`onRestore`). Once the value is firm the
// field behaves as upstream's NumberField (components/ui.jsx): focus selects the number, so
// typing replaces it. One input for both, so the keyboard stays up when the first key makes the
// value firm. The parsing is upstream's, copied: NumberField takes no placeholder mode.
import { useRef, useState } from 'react'

export default function HintNumberField({ value, onChange, onTypeOver, onRestore, hint = false, decimal = true, nullable = false, className = '', ...rest }) {
  const [draft, setDraft] = useState(null)
  const committed = useRef(null)
  const justFocused = useRef(false)
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
      onFocus={e => { over.current = false; if (hint) return; justFocused.current = true; e.target.select() }}
      onMouseUp={e => { if (justFocused.current) { justFocused.current = false; e.preventDefault() } }}
      onChange={e => commit(e.target.value)}
      onBlur={() => {
        if (over.current && (draft ?? '') === '') onRestore?.()
        over.current = false
        setDraft(null); committed.current = null; justFocused.current = false
      }}
      {...rest}
    />
  )
}
