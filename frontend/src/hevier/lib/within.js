// A promise that gives up: `p`, or a rejection with `err` after `ms` (hevier's network calls, so a
// request that never answers cannot hold the export or the gym search for good).
export function within(p, ms, err = new Error('timeout')) {
  let tm
  return Promise.race([p, new Promise((_, reject) => { tm = setTimeout(() => reject(err), ms) })]).finally(() => clearTimeout(tm))
}
