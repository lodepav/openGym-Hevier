// Wiring for finish-labels.js: every finish of a live session gets its labels, whatever saved it.
import { finishLabels, labelFinished } from './finish-labels.js'

export function initFinishLabels(store) {
  return store.subscribe((state, prev) => {
    if (state.S === prev.S) return
    const found = finishLabels(prev.S, state.S)
    if (found) store.update(s => { s.workouts = labelFinished(s.workouts, found) })
  })
}
