// The faster full run (hevier/skills/verify): the threads pool, except for the tests that set
// process.env.TZ. A worker thread has its own copy of process.env, so setting TZ there does not
// move the clock, and those tests only pass in a process of their own.
import { configDefaults, defineConfig } from 'vitest/config'
import vite from '../../../vite.config.js'

// Every test file that sets process.env.TZ (grep -rl "process.env.TZ *=" src); upstream 1.4.4 added four.
const SETS_TZ = ['src/lib/import-apps.test.js', 'src/lib/seasonal.test.js', 'src/lib/streak.test.js', 'src/lib/voice.test.js', 'src/lib/wrapped.test.js']
// Spread, not `extends`: extends appends setupFiles to vite.config's, and this one replaces it.
const setupFiles = [new URL('./test-setup-lazy.js', import.meta.url).pathname]
const project = test => ({ ...vite, test: { ...vite.test, setupFiles, ...test } })

export default defineConfig({
  test: {
    // Keeps transformed modules on disk (node_modules/.experimental-vitest-cache) between runs.
    experimental: { fsModuleCache: true },
    projects: [
      project({ name: 'threads', pool: 'threads', exclude: [...configDefaults.exclude, ...SETS_TZ] }),
      project({ name: 'tz', pool: 'forks', include: SETS_TZ }),
    ],
  },
})
