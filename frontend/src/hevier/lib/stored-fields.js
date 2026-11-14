// Every field the fork adds to the stored state (S), with where it lives and a sample value.
// Upstream's sync merge and backup know none of them by name; stored-fields.test.js proves each
// one comes through both, and fails when fork code starts writing an `hv…` field not listed here.
//
// Device-only localStorage keys are left out. NOT_STORED and LEGACY below name the other hv
// fields fork code uses that are not stored state.

/** `at`: 'S' (top level), 'gym' (an S.equipProfiles item), 'workout', 'entry', 'set', 'routine'. */
export const STORED_FIELDS = [
  { field: 'hvCables', at: 'S', sample: { '8878': { g1: '2:1' } } },
  { field: 'hvFolders', at: 'S', sample: ['Push'] },
  { field: 'hvFoldersClosed', at: 'S', sample: ['Push'] },
  { field: 'hvGymMissing', at: 'S', sample: { '0043': ['g1'] } },
  { field: 'hvGymPlaces', at: 'S', sample: { g1: { lat: 47.37, lng: 8.54, name: 'City Gym' } } },
  { field: 'hvGymSwaps', at: 'S', sample: { '0043': { g1: '0044' } } },
  { field: 'hvHome', at: 'S', sample: { order: ['week', 'routines'], hidden: ['week'] } },
  { field: 'hvHrMax', at: 'S', sample: { max: 190, born: 1990 } },
  { field: 'hvImportCable', at: 'S', sample: { 'Hevy|lat pulldown (cable)': '2:1' } },
  { field: 'hvImportMap', at: 'S', sample: { 'Hevy|odd lift': '0463' } },
  { field: 'hvMachines', at: 'S', sample: { '8878': { g1: 'Life Fitness' } } },
  { field: 'hvMainMuscle', at: 'S', sample: { '0043': 'Glutes' } },
  { field: 'hvModuleParts', at: 'S', sample: { 'body.photos': false } },
  { field: 'hvMuscleSets', at: 'S', sample: 'share' },
  { field: 'hvOneLimb', at: 'S', sample: 1 },
  { field: 'hvPlateLine', at: 'S', sample: true },
  { field: 'hvShownName', at: 'S', sample: { '0043': 'Back squat' } },
  { field: 'hvSideOrder', at: 'S', sample: { '0043': 'RL' } },
  { field: 'hvStrength', at: 'S', sample: { '0043': { lv: [60, 80, 100, 130, 160], u: 'kg', d: '2026-10-17' } } },
  { field: 'hvTimerSec', at: 'S', sample: 120 },
  { field: 'hvVolume', at: 'S', sample: 'weight' },
  { field: 'hvWarmupEffort', at: 'S', sample: false },
  { field: 'hvBw', at: 'gym', sample: 1 },
  { field: 'hvHevyRoutine', at: 'workout', sample: 'b459cba5-cd6d-463c-abd6-54f8eafcadcb' },
  { field: 'hvPhase', at: 'workout', sample: { p: 'cut', r: -0.5 } },
  // hvGym is also on the running session (S.active), which upstream's merge leaves to the caller.
  { field: 'hvGym', at: 'entry', sample: 'g1' },
  { field: 'hvBrand', at: 'entry', sample: 'Life Fitness' },
  { field: 'hvCable', at: 'entry', sample: '2:1' },
  // Written in the running session's sets (tested here on a saved set).
  { field: 'hvLast', at: 'set', sample: 'LR' },
  { field: 'hvRun', at: 'set', sample: 1760716800000 },
  { field: 'hvGoal', at: 'set', sample: 60 },
  { field: 'hvProg', at: 'routine', sample: true },
  { field: 'hvHevyFolder', at: 'routine', sample: 'PPL' },
]

/**
 * Not stored: `hvClock` (on upstream's timer in useUI); `hvExercise`, `hvGyms`, `hvStats`,
 * `hvWorkout` (the fork's module ids, D114, inside hvModuleParts' keys); `hvFolder` … `hvUnit`
 * (an import's parsed data, gone once it is applied); `hvPairR` (a previous-sets read).
 */
export const NOT_STORED = ['hvClock', 'hvExercise', 'hvGyms', 'hvStats', 'hvWorkout', 'hvFolder', 'hvFolderAt', 'hvFolderId',
  'hvMeasures', 'hvRaw', 'hvRedo', 'hvSource', 'hvTemplates', 'hvTitles', 'hvUnit', 'hvPairR']
/** Legacy, deleted by a migration: ex-aliases.js, ex-unit.js and previous-sets.js move them. */
export const LEGACY = ['hvAliases', 'hvExUnit', 'hvPrevious']
