#!/usr/bin/env node
// What every routine opens with on the running emulator, as one JSON file, and the differences
// from an earlier one. For the upstream merge (skills/upstream-merge, step 3a and 7) and before a
// release: the same profile must open the same way after a change, unless a decision says not.
//
//   node hevier/tools/routine-snapshot.mjs <out.json>                     # snapshot
//   node hevier/tools/routine-snapshot.mjs <out.json> --diff <before.json>  # and compare; exit 1 on a difference
//   node hevier/tools/routine-snapshot.mjs --compare <before.json> <after.json>   # two files, no emulator
//
// It starts each routine from the Workout tab, reads the stored session (the same reading as
// frontend/src/hevier/lib/routine-open.js, which routine-open.test.js runs without the emulator),
// probes the warm-ups, and discards the workout. The probe: in the first exercise that opens with
// an untouched warm-up before a plain work set, 10 more is typed into the first work set, and the
// warm-ups are read again (progression off: they stay, D69; on: they follow, upstream's #156).
//
// Needs the debug APK running (emulator.sh) with no workout in progress. It changes nothing that
// is kept: every workout it starts is discarded. Restore the test profile first
// (hevier/ux/JOURNEYS.md), or the two snapshots are of different data.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { connect, evaluate } from './cdp.mjs'
import { openedSnapshot, settingsSnapshot, diffSnapshots } from '../../frontend/src/hevier/lib/routine-open.js'

const sleep = ms => new Promise(ok => setTimeout(ok, ms))
const until = async (ok, tries = 40) => { for (let n = 0; n < tries; n++) { if (await ok()) return true; await sleep(500) } return false }
const STATE = 'JSON.parse(localStorage.gym_state_v1)'

// Clicks the n-th visible button with exactly this text (`cdp.mjs click` matches part of a text,
// and "Done" would hit a set's tick). -1 is the last one.
const clickExact = (text, n = 0) => `(() => {
  const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && b.textContent.trim() === ${JSON.stringify(text)})
  const b = bs.at(${n})
  if (!b) return false
  b.scrollIntoView({ block: 'center' }); b.click()
  return true
})()`

// Types into the weight field of the screen's `row`-th set row, the way a person's typing arrives.
const typeWeight = (row, value) => `(() => {
  const input = document.querySelectorAll('.hv-row:not(.hv-sub-row)')[${row}]?.querySelector('input.hv-num')
  if (!input) return false
  input.scrollIntoView({ block: 'center' }); input.focus()
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))})
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.blur()
  return true
})()`

/** Where the probe types: the first exercise with an untouched warm-up before a plain work set. */
export function probeTarget(opened) {
  let row = 0
  for (const [idx, e] of opened.exercises.entries()) {
    const first = e.sets.findIndex(s => s.kind === 'work')
    const plain = s => !s.sides && !s.side && !s.mode && s.w > 0 && s.r > 0
    if (first > 0 && plain(e.sets[first]) && e.sets.slice(0, first).every(s => !s.edited && plain(s))) {
      return { idx, id: e.id, row: row + first, weight: e.sets[first].w + 10 }
    }
    // A per-side set is two rows on the screen, its L and its R.
    row += e.sets.reduce((n, s) => n + (s.sides ? 2 : 1), 0)
  }
  return null
}

const warmups = (opened, idx) => opened.exercises[idx].sets.filter(s => s.kind === 'warmup').map(s => s.w)

async function snapshot() {
  const cdp = await connect()
  const read = async () => JSON.parse(await evaluate(cdp, `JSON.stringify(${STATE})`))
  try {
    let S = await read()
    if (S.active) throw new Error('a workout is in progress: finish or discard it first')
    const out = { settings: settingsSnapshot(S), routines: [] }
    for (let i = 0; i < (S.routines || []).length; i++) {
      await evaluate(cdp, 'location.hash = "#/workout"')
      // The app may still be starting: wait for the button, then for the session, up to 20 s each.
      if (!await until(() => evaluate(cdp, clickExact('Start Routine', i)))) throw new Error(`no Start Routine button ${i + 1} on the Workout tab`)
      await until(async () => (await read()).active)
      await sleep(1000)
      S = await read()
      const opened = openedSnapshot(S)
      if (!opened) throw new Error(`routine ${i + 1} did not start`)
      const routine = S.routines.find(r => (S.active.entries || []).some(e => e.rid === r.id))
      const target = probeTarget(opened)
      let probe = null
      if (target) {
        if (!await evaluate(cdp, typeWeight(target.row, target.weight))) throw new Error(`no weight field in set row ${target.row + 1}`)
        await sleep(500)
        const after = openedSnapshot(await read())
        const typed = after.exercises[target.idx].sets.find(s => s.kind === 'work').w
        if (typed !== target.weight) throw new Error(`typed ${target.weight} into ${target.id}, the session has ${typed}`)
        probe = { id: target.id, typed: target.weight, before: warmups(opened, target.idx), after: warmups(after, target.idx) }
      }
      out.routines.push({ routine: routine?.name ?? null, hvProg: routine?.hvProg === true, ...opened, probe })
      if (!await evaluate(cdp, clickExact('Discard Workout'))) throw new Error('no Discard Workout button')
      await sleep(800)
      await evaluate(cdp, clickExact('Discard', -1))
      await sleep(800)
      if ((await read()).active) throw new Error('the workout was not discarded')
    }
    return out
  } finally { cdp.close() }
}

function report(before, after) {
  const lines = diffSnapshots(before, after)
  if (!lines.length) { console.log('No difference.'); return 0 }
  console.log(`${lines.length} difference${lines.length > 1 ? 's' : ''} (before → after):`)
  for (const l of lines) console.log('  ' + l)
  return 1
}

const load = file => JSON.parse(readFileSync(file, 'utf8'))

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (args[0] === '--compare' && args.length === 3) process.exit(report(load(args[1]), load(args[2])))
  const out = args[0]
  if (!out || out.startsWith('--') || (args[1] && (args[1] !== '--diff' || !args[2]))) {
    console.error('usage: routine-snapshot.mjs <out.json> [--diff <before.json>] | --compare <before.json> <after.json>')
    process.exit(2)
  }
  // Exit 2: it could not run, which is not a difference (exit 1).
  const snap = await snapshot().catch(e => { console.error('routine-snapshot: ' + e.message); process.exit(2) })
  writeFileSync(out, JSON.stringify(snap, null, 2) + '\n')
  const probes = snap.routines.filter(r => r.probe)
  console.log(`${snap.routines.length} routines, ${snap.routines.reduce((n, r) => n + r.exercises.length, 0)} exercises, ${probes.length} warm-up probe${probes.length === 1 ? '' : 's'} → ${out}`)
  for (const r of probes) console.log(`  ${r.routine} (progression ${r.hvProg ? 'on' : 'off'}): warm-ups ${r.probe.before.join(', ')} → ${r.probe.after.join(', ')}`)
  if (!probes.length) console.log('  No routine opens with an untouched warm-up: the warm-up probe saw nothing.')
  process.exit(args[1] ? report(load(args[2]), snap) : 0)
}
