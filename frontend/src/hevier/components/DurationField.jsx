// A set's time typed as Hevy types it (hevier/DECISIONS.md D53): the system's number pad, digits
// filling h:mm:ss from the right (lib/duration-entry.js). The value is seconds. As HintNumberField
// (D2), an untouched prefilled time is the grey placeholder: typing replaces it and a field left
// empty keeps it (`onRestore`); a firm one is selected on focus, so typing replaces it too.
import { useRef, useState } from 'react'
import { elapsedClock } from '../lib/elapsed.js'
import { digitsIn, fromDigits, showDigits } from '../lib/duration-entry.js'

export default function DurationField({ sec, onChange, onTypeOver, onRestore, hint = false, className = '', ...rest }) {
  const [draft, setDraft] = useState(null)   // the digits typed in this focus
  const over = useRef(false)
  const empty = hint && draft === null
  const text = sec == null ? '' : elapsedClock(sec)
  return (
    <input
      type="text"
      inputMode="numeric"
      className={'num hv-dur ' + className}
      value={draft !== null ? showDigits(draft) : empty ? '' : text}
      placeholder={empty ? text : undefined}
      onFocus={e => { over.current = false; if (!hint) e.target.select() }}
      onChange={e => {
        if (empty && !over.current) { over.current = true; onTypeOver?.() }
        const d = digitsIn(e.target.value)
        setDraft(d)
        onChange(fromDigits(d))
      }}
      onBlur={() => {
        if (over.current && !draft) onRestore?.()
        over.current = false
        setDraft(null)
      }}
      {...rest}
    />
  )
}
