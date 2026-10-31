// @vitest-environment happy-dom
/* What a release leaves on a phone. hevier/tools/upgrade-fixture.sh runs this with that release's
 * own code, renamed to a test: its importer, the fork's hooks and its store write the saved state,
 * and its own readers state the numbers that upgrade.test.jsx expects of the current code. */
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'

const HEAD = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"'
const row = (title, day, ex, i, type, w, r) =>
  `"${title}","${day} Oct 2026, 16:27","${day} Oct 2026, 17:44","","${ex}",,"",${i},"${type}",${w},${r},,,`
const CSV = [
  HEAD,
  row('Lower A', 5, 'Squat (Barbell)', 0, 'warmup', 60, 8),
  row('Lower A', 5, 'Squat (Barbell)', 1, 'normal', 100, 5),
  row('Lower A', 5, 'Squat (Barbell)', 2, 'normal', 102.5, 5),
  row('Lower A', 5, 'Leg Press (Machine) (brand: Hammer)', 0, 'normal', 180, 10),
  row('Upper A', 7, 'Bench Press (Barbell)', 0, 'normal', 80, 8),
  row('Upper A', 7, 'Bench Press (Barbell)', 1, 'failure', 80, 6),
  row('Upper A', 7, 'Lat Pulldown (Cable)', 0, 'normal', 60, 10),
  row('Lower B', 9, 'Romanian Deadlift (Barbell)', 0, 'normal', 90, 8),
  row('Lower B', 9, 'Romanian Deadlift (Barbell)', 1, 'dropset', 70, 10),
].join('\n')

it('writes the fixture', async () => {
  localStorage.clear()
  const { hooks } = await import('../hooks.js')
  const imp = await import('../lib/hevy-import.js')
  Object.assign(hooks, imp.importHooks(() => null))
  const { useStore } = await import('../../store/useStore.js')
  const { parseImport, mergeImport } = await import('../../lib/import-csv.js')
  const { workoutVolume } = await import('../../lib/history.js')

  const parsed = parseImport(CSV, { unit: 'kg' })
  const done = hooks.importDone ? hooks.importDone(parsed) || parsed : parsed
  useStore.getState().update(s => {
    mergeImport(s, done)
    mergeImport(s, { kind: 'bodyweight', bodyweight: [{ d: '2026-10-05', w: 81.5 }, { d: '2026-10-09', w: 81 }] })
    s.restSec = 150
  })

  const S = useStore.getState().S
  const entries = S.workouts.flatMap(w => w.entries)
  writeFileSync(process.env.FIXTURE_OUT, JSON.stringify({
    saved: localStorage.getItem('gym_state_v1'),
    facts: {
      workouts: S.workouts.length,
      entries: entries.length,
      sets: entries.flatMap(e => e.sets).length,
      volume: S.workouts.reduce((sum, w) => sum + workoutVolume(w), 0),
      brands: entries.map(e => e.hvBrand).filter(Boolean),
      bodyweight: S.bodyweight.map(b => b.w),
      restSec: S.restSec,
    },
  }, null, 1) + '\n')
})
