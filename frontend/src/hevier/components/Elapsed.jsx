import { useEffect, useState } from 'react'
import { elapsedClock, elapsedWords } from '../lib/elapsed.js'

// Upstream's Elapsed (components/Elapsed.jsx) with Hevy's formats: `words` for the workout's
// stats row ("18min 19s"), else a clock that turns over at the hour ("1:15:02").
export default function Elapsed({ start, words = false }) {
  const fmt = words ? elapsedWords : elapsedClock
  const [text, setText] = useState(() => fmt(0))
  useEffect(() => {
    const tick = () => setText(fmt((Date.now() - start) / 1000))
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [start, fmt])
  return <span>{text}</span>
}
