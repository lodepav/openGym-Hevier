// @vitest-environment happy-dom
// The upstream exports and behaviours the fork's overlay is built on (hevier/SEAMS.md, "Upstream
// contracts"). A failure after an upstream merge means upstream changed one of them: adapt the
// fork's code to the new shape — never edit upstream to bring the old one back.
import { describe, it, expect } from 'vitest'
import * as sheets from '../sheets.jsx'
import * as history from '../lib/history.js'
import * as model from '../lib/workout-model.js'
import * as plan from '../views/Plan.jsx'
import * as historyView from '../views/History.jsx'
import * as stats from '../views/Stats.jsx'
import { HEVIER } from './flag.js'

describe('hevier: upstream contract', () => {
  it('sheets.jsx still exports the flows the overlay calls', () => {
    for (const name of ['startFlow', 'beginWorkout', 'finishWorkout', 'finishWorkoutSheet', 'menuSheet',
      'exerciseDetailSheet', 'exerciseHistorySheet', 'exerciseNoteSheet', 'effortPickerSheet',
      'workoutDetailSheet', 'calendarSheet', 'starterPlanSheet', 'dayOverrideSheet', 'bwSheet']) {
      expect(typeof sheets[name], name).toBe('function')
    }
  })

  it('history.js still exports the read-back helpers', () => {
    for (const name of ['lastEntryFor', 'effectiveRoutines', 'effectiveRoutineIds']) {
      expect(typeof history[name], name).toBe('function')
    }
  })

  it('workout-model.js still exports the set-type helpers', () => {
    for (const name of ['isWarmupRow', 'isFailureSet', 'toggleFailure', 'addDrop', 'dropsOf', 'isSideSet']) {
      expect(typeof model[name], name).toBe('function')
    }
  })

  it('the views the fork screens borrow from still export what they use', () => {
    expect(typeof plan.deleteRoutineWithUndo).toBe('function')
    expect(typeof historyView.historyRows).toBe('function')
    expect(Array.isArray(stats.FATIGUE_LEVELS)).toBe(true)
  })

  it('the fork UI is off unless the build asks for it', () => {
    // npm test runs without VITE_HEVIER, so upstream's own suite sees upstream's UI.
    expect(HEVIER).toBe(false)
  })
})
