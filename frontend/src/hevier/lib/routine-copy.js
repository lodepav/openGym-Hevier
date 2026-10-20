// Copy routine (Workout tab's ⋯ and the routine editor's ⋮): upstream's copyRoutine, less the
// links to a Hevy routine. A copy kept `hevyId`, so the export to Hevy (D34) sent it as an update
// of the original's Hevy routine, overwriting it; without the id it goes as a new routine.
// `hvHevyFolder` (D30) only means something beside that id.
import { copyRoutine } from '../../lib/routines.js'

export function copyRoutineHere(routine, suffix) {
  const copy = copyRoutine(routine, suffix)
  delete copy.hevyId
  delete copy.hvHevyFolder
  return copy
}
