// S for one exercise card of the live workout: the copy it last drew from while nothing it shows
// has changed (lib/card-state.js), so a change in another card does not re-render this one.
import { useRef } from 'react'
import { useStore } from '../../store/useStore.js'
import { sameForCard } from '../lib/card-state.js'

export function useCardState(idx, unit) {
  const seen = useRef(null)
  return useStore(s => {
    if (seen.current && sameForCard(seen.current, s.S, idx, unit)) return seen.current
    return (seen.current = s.S)
  })
}
