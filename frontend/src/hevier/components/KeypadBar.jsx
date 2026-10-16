// The row Hevy puts on top of the number keypad (SCREENS.md §0): a "hide keyboard" key at the
// edge, and the rest timer riding above it rather than under the keys. Shown while a field of the
// workout screen has focus. On Android 15 the window does not shrink for the keyboard, so the row
// stands on --native-kb (lib/native-keyboard.js); elsewhere the window shrinks and bottom 0 is
// already the keyboard's top. body.hv-kb lifts upstream's #timer onto the row (hevier.css).
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'

const isField = el => !!el && /^(INPUT|TEXTAREA)$/.test(el.tagName || '')
// A mouse and a hardware keyboard have no keypad to sit on.
const finePointer = () => { try { return !!window.matchMedia?.('(pointer: fine)').matches } catch { return false } }

export function useWorkoutFieldFocus(scope = '.hv-workout') {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const doc = document
    const sync = () => {
      const el = doc.activeElement
      setOn(isField(el) && !!el.closest?.(scope) && !finePointer())
    }
    // focusout fires before the next field takes focus: one tick later, activeElement is settled.
    const later = () => setTimeout(sync, 0)
    doc.addEventListener('focusin', sync)
    doc.addEventListener('focusout', later)
    return () => { doc.removeEventListener('focusin', sync); doc.removeEventListener('focusout', later) }
  }, [scope])
  useEffect(() => {
    document.body.classList.toggle('hv-kb', on)
    return () => document.body.classList.remove('hv-kb')
  }, [on])
  return on
}

export default function KeypadBar() {
  const on = useWorkoutFieldFocus()
  if (!on) return null
  // pointerdown keeps the focus where it is until the blur below, so the field commits its value
  // through its own blur, as any other way of leaving it does.
  return <div className="hv-keypad" role="toolbar" aria-label={t('Keyboard')}>
    <button type="button" className="hv-kb-hide" aria-label={t('Hide keyboard')}
      onPointerDown={e => e.preventDefault()}
      onClick={() => document.activeElement?.blur?.()}>
      <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="11" rx="2.4" />
        <path d="M7 8h.01M10.3 8h.01M13.7 8h.01M17 8h.01M8 11.5h8M9.5 18.5 12 21l2.5-2.5" />
      </svg>
    </button>
  </div>
}
