// Seam S71 in components/Media.jsx (the ninth audit, 2026-11-22): an exercise's animation starts on
// its still when the system asks for reduced motion, and its "tap to pause" hint is a named button
// TalkBack can find. Off in upstream's build (HEVIER), so upstream's own tests see its media as before.
import { HEVIER } from '../flag.js'
import { reducedMotion } from '../../lib/seasonal.js'
import { t } from '../../lib/i18n.js'

/** Whether the animation plays when it opens: not under Reduce Motion. */
export const startsPlaying = (on = HEVIER) => !(on && reducedMotion())

/** The hint's props: a button named for what a tap does, Enter and Space as a tap. */
export function pauseButton(playing, onTap, on = HEVIER) {
  if (!on) return {}
  return {
    role: 'button', tabIndex: 0, 'aria-label': t(playing ? 'Pause animation' : 'Play animation'),
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } },
  }
}
