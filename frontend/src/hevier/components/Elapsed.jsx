import { useEffect, useState } from 'react'
import { elapsedClock, elapsedWords } from '../lib/elapsed.js'

// Upstream's Elapsed (components/Elapsed.jsx) with Hevy's formats: `words` for the workout's
// stats row ("18min 19s"), else a clock that turns over at the hour ("1:15:02").
// `pausedAt` (D107, upstream's #976): a paused workout's clock stands at its pause.
export default function Elapsed({ start, pausedAt = 0, words = false }) {
  const fmt = words ? elapsedWords : elapsedClock
  const [text, setText] = useState(() => fmt(0))
  useEffect(() => {
    const tick = () => setText(fmt(((pausedAt > 0 ? pausedAt : Date.now()) - start) / 1000))
    tick()
    if (pausedAt > 0) return undefined
    const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [start, pausedAt, fmt])
  return <span>{text}</span>
}
