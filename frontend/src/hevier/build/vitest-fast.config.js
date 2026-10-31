// The faster full run (hevier/skills/verify): the threads pool, except for the tests that set
// process.env.TZ. A worker thread has its own copy of process.env, so setting TZ there does not
// move the clock, and those tests only pass in a process of their own.
import { configDefaults, defineConfig } from 'vitest/config'

const SETS_TZ = ['src/lib/seasonal.test.js']
const VITE = new URL('../../../vite.config.js', import.meta.url).pathname

export default defineConfig({
  test: {
    projects: [
      { extends: VITE, test: { name: 'threads', pool: 'threads', exclude: [...configDefaults.exclude, ...SETS_TZ] } },
      { extends: VITE, test: { name: 'tz', pool: 'forks', include: SETS_TZ } },
    ],
  },
})
