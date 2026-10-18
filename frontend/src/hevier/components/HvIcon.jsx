// Hevy's glyphs where they differ from upstream's (D17, step 4). Drawn to upstream's
// conventions (components/Icon.jsx: 24×24, live area 3…21, strokes only, round caps), so they sit
// beside upstream's set unnoticed. Any other name falls back to upstream's Icon, so the fork never
// edits the shared table.
import Icon from '../../components/Icon.jsx'

const P = {
  // The workout's gym line: a map pin, where Hevy tags a place
  mapPin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
  // Hevy's rest timer button in the Log Workout bar: an alarm clock, not a stopwatch
  alarm: <><circle cx="12" cy="13" r="7" /><path d="M12 9.6v3.6l2.4 1.6M4 7.6A3.6 3.6 0 0 1 7.6 4M16.4 4A3.6 3.6 0 0 1 20 7.6M7.1 18.1l-1.5 1.8M16.9 18.1l1.5 1.8" /></>,
  // Hevy's Measures tile: a standing figure, arms out
  // A set's count-up timer running (D53): ■ stops it
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  figure: <><circle cx="12" cy="4.8" r="1.9" /><path d="M5.6 8.6 12 9.6l6.4-1M12 9.6v5M12 14.6l-2.6 5.8M12 14.6l2.6 5.8" /></>,
}

export const HV_ICON_NAMES = Object.keys(P)

export default function HvIcon({ name, size, className = '', style, ...rest }) {
  const d = P[name]
  if (!d) return <Icon name={name} size={size} className={className} style={style} {...rest} />
  const s = size ? { width: size, height: size } : null
  return (
    <svg className={'icn ' + className} data-icon={name} viewBox="0 0 24 24" aria-hidden="true"
      focusable="false" style={s ? { ...s, ...style } : style} {...rest}>
      {d}
    </svg>
  )
}
