#!/usr/bin/env node
// The "Check" mode of the UX journeys (hevier/ux/JOURNEYS.md): taps through a journey's steps on
// the running app over CDP, the way a person would, then reads what was saved and checks it
// (journey-lib.mjs). For after an upstream merge: a seam no longer called, a moved handler or a
// sheet that will not open keeps every unit test green and still breaks a journey's end state.
//
//   node hevier/tools/journey-check.mjs run <J1|J8|J8b> <out.json> [--base <baseline.json>]
//   node hevier/tools/journey-check.mjs import <backup.json>     # Settings → Data → Import backup → Replace
//
// journey-check.sh runs it: it restores the journey's profile first and the app's own data after.
// Exit 0 when every check passed and nothing differs from the baseline, 1 when not, 2 when it
// could not run. JOURNEY_HR=1 also checks the heart rate on every ticked set (a strap paired by
// hand, hevier/tools/fake-strap). The Hevy export is only built here (hevy-export.js), never sent.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { connect, evaluate, withStore } from './cdp.mjs'
import { useViteEnv } from './vite-env.mjs'
import { CHECKS, OWNER, J8_TYPED as T, entryFacts, exportFacts, report, routineFacts, rowOf, rowPlan } from './journey-lib.mjs'

useViteEnv()
const app = p => import(new URL('../../frontend/src/' + p, import.meta.url))
const X = await app('hevier/lib/hevy-export.js')
const { nextPlanned } = await app('hevier/lib/next-planned.js')
const { bestSetOf, formulaOf } = await app('lib/onerm.js')

const ADB = process.env.ADB || homedir() + '/Android/Sdk/platform-tools/adb'
const APP_ID = process.env.APP_ID || 'ch.duartesantos.opengym.hevier.test'
const sleep = ms => new Promise(ok => setTimeout(ok, ms))
const until = async (ok, tries = 40, ms = 500) => { for (let n = 0; n < tries; n++) { if (await ok()) return true; await sleep(ms) } return false }

// In-page helpers, put on window by the first call after a page loads. They match the app's English
// strings ("Start", "Save", "Skip"...): both profiles are in English. Every lookup is by the classes and
// aria-labels the fork's components draw (HevyWorkout, HevyExerciseBlock, GymLabels, FinishSheet).
const PAGE = `(() => {
  // Laid out at all; offsetParent would miss a fixed element (the rest dock).
  const vis = el => !!el && el.getClientRects().length > 0
  const sheet = () => [...document.querySelectorAll('[aria-modal="true"]')].at(-1) || null
  const card = idx => document.querySelector('[data-exidx="' + idx + '"]')
  const rows = idx => [...(card(idx)?.querySelectorAll('.hv-row:not(.hv-sub-row)') || [])]
  const tap = el => { if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true }
  const setValue = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    el.focus()
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.blur()
    return true
  }
  const byText = (root, sel, text) => root && [...root.querySelectorAll(sel)].filter(vis).find(b => b.textContent.trim() === text)
  return {
    sides: idx => rows(idx).map(r => (r.classList.contains('hv-side') ? r.querySelector('.hv-lr')?.textContent.trim() || null : null)),
    type: (idx, row, cell, v) => { const el = rows(idx)[row]?.querySelectorAll('.hv-cell input')[cell]; if (!el) return false; el.scrollIntoView({ block: 'center' }); return setValue(el, v) },
    prev: (idx, row) => rows(idx)[row]?.querySelector('.hv-prev')?.textContent.trim() ?? null,
    tick: (idx, row) => {
      const r = rows(idx)[row]
      if (!r) return 'no row'
      const c = r.querySelector('.hv-chk'); if (c) { tap(c); return 'tick' }
      const e = r.querySelector('.hv-eff-tick'); if (e) { tap(e); return 'effort' }
      return 'no tick'
    },
    rate: (idx, row) => tap(rows(idx)[row]?.querySelector('.hv-eff')),
    effort: v => {
      const s = sheet()
      if (v == null) return tap(byText(s, 'button', 'Log without rating'))
      return tap([...(s?.querySelectorAll('.effpick .menu-item') || [])].find(i => i.querySelector('.effpick-n')?.textContent.trim() === String(v)))
    },
    // D90's "Fix it" sheet on a tick, by its title.
    prompt: () => { const s = sheet(); return s && byText(s, 'button', 'Fix it') ? (s.querySelector('h3, h2')?.textContent.trim() || s.textContent.trim().slice(0, 120)) : null },
    logAnyway: () => { const s = sheet(); return tap(s && [...s.querySelectorAll('button')].find(b => /^Log /.test(b.textContent.trim()))) },
    menu: label => { const s = sheet(); return tap(s && [...s.querySelectorAll('.menu-item')].find(i => i.querySelector('.tt')?.textContent.trim() === label)) },
    inSheet: (sel, text) => tap(byText(sheet(), sel, text)),
    // A settings row's switch by its title, turned on (left alone when on already).
    switchOn: title => { const x = [...(sheet()?.querySelectorAll('input[type=checkbox],[role=switch]') || [])].find(x => (x.closest('.row, [class*=row]')?.textContent || '').trim().startsWith(title)); if (!x) return false; if (!x.checked) x.click(); return true },
    sheetType: v => { const el = sheet()?.querySelector('textarea, input.input'); return el ? setValue(el, v) : false },
    sheetOpen: () => !!sheet(),
    click: (sel, text) => tap(text == null ? [...document.querySelectorAll(sel)].find(vis) : byText(document, sel, text)),
    inCard: (idx, sel, text) => tap(text == null ? card(idx)?.querySelector(sel) : byText(card(idx), sel, text)),
    text: sel => { const el = [...document.querySelectorAll(sel)].find(vis); return el ? el.textContent.trim() : null },
    attr: (sel, a) => document.querySelector(sel)?.getAttribute(a) ?? null,
    has: sel => [...document.querySelectorAll(sel)].some(vis),
    body: () => document.body.innerText,
    today: () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') },
    toasts: () => [...document.querySelectorAll('.toast-msg')].map(t => t.textContent.trim()),
  }
})()`

let cdp = null
async function open() {
  cdp = await connect()
  if (!await until(async () => { try { return await evaluate(cdp, withStore('return true')) } catch { return false } })) throw new Error('the app did not start (no store found)')
  // A crashed emulator comes back from its quick-boot snapshot with the app it had then: refuse
  // to check a build other than the APK this checkout made (journey-check.sh passes its bundle).
  const want = process.env.JOURNEY_BUNDLE
  const have = await evaluate(cdp, `[...document.scripts].map(s => s.src).find(s => /\\/assets\\/index-/.test(s)) || ''`)
  if (want && !have.endsWith('/' + want)) throw new Error(`the app on the device runs ${have.split('/').pop() || 'no bundle'}, not this checkout's ${want}: reinstall (hevier/tools/emulator.sh --no-build) or use --build`)
}
// Runs a helper; a page that reloaded has lost them, so they go on again first.
const page = call => evaluate(cdp, `(window.__jc = window.__jc || ${PAGE}).${call}`)
const readS = async () => JSON.parse(await evaluate(cdp, withStore('return JSON.stringify(st.S)')))
const must = async (call, what) => { if (!await page(call)) throw new Error(what); await sleep(500) }
const nav = async hash => { await evaluate(cdp, `location.hash = ${JSON.stringify(hash)}`); await sleep(800) }
const waitSheet = async what => { if (!await until(() => page('sheetOpen()'), 12, 250)) throw new Error('no sheet opened: ' + what) ; await sleep(300) }
const idxOf = (S, id) => { const i = (S.active?.entries || []).findIndex(e => e.id === id); if (i < 0) throw new Error(`${id} is not in the session`); return i }

// The app as a person leaves it: stopped and started again, so what is read is what was saved.
async function restart() {
  await sleep(4000)   // the debounced save and the phone file (lib/mobile.js nativeSave)
  cdp?.close()
  execFileSync(ADB, ['shell', 'am', 'force-stop', APP_ID])
  execFileSync(ADB, ['shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1'], { stdio: 'ignore' })
  let last = null
  if (!await until(async () => { try { await open(); return true } catch (e) { last = e; return false } }, 30, 1000)) throw new Error('the app did not come back after a restart: ' + last?.message)
}

const prompts = []
/** Ticks a card's row: the tick, or with effort on the rating in its place (`rpe`; null logs without one). */
async function tickRow(idx, row, rpe = null) {
  const how = await page(`tick(${idx}, ${row})`)
  if (how === 'effort') {
    await waitSheet(`the effort picker of row ${row + 1} in exercise ${idx + 1}`)
    if (!await page(`effort(${JSON.stringify(rpe)})`)) throw new Error(`no ${rpe == null ? '"Log without rating"' : 'RPE ' + rpe} in the effort picker`)
  } else if (how === 'tick') {
    await sleep(400)
  } else throw new Error(`exercise ${idx + 1}, row ${row + 1}: ${how}`)
  await sleep(500)
  const asked = await page('prompt()')
  if (asked) { prompts.push(asked); await page('logAnyway()'); await sleep(500) }
  // A tick shown beside the rating (a timed column takes the rating's place): rated after.
  if (how === 'tick' && rpe != null && await page(`rate(${idx}, ${row})`)) {
    await waitSheet('the effort picker')
    if (!await page(`effort(${JSON.stringify(rpe)})`)) throw new Error(`no RPE ${rpe} in the effort picker`)
    await sleep(500)
  }
}
const planOf = async (S, idx) => rowPlan(S.active.entries[idx].sets, await page(`sides(${idx})`))
const rowFor = (plan, set, side = null) => { const r = rowOf(plan, set, side); if (r == null) throw new Error(`no row for set ${set + 1}${side ? ' ' + side : ''}`); return r }

async function startRoutine(id) {
  await nav('#/plan/r/' + encodeURIComponent(id) + '/view')
  if (!await until(async () => evaluate(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetParent !== null && !b.disabled && b.textContent.trim() === 'Start'); if (!b) return false; b.click(); return true })()`))) throw new Error('no Start button on the routine page')
  if (!await until(async () => !!(await readS()).active)) throw new Error('the routine did not start')
  await sleep(1500)
}
async function headerDetails() {
  await evaluate(cdp, 'window.scrollTo(0, 0)')
  await sleep(600)
  if (!await page(`has('.hv-gym')`)) await must(`click('.hv-wname')`, 'no workout name to open the header with')
}
async function pickGym(name) {
  await headerDetails()
  await must(`click('.hv-gym')`, 'no gym line in the workout header')
  await waitSheet('the gym sheet')
  // An exact label: the sheet's "Find gyms nearby" is never tapped (it sends the position out).
  await must(`menu(${JSON.stringify(name)})`, `no gym "${name}" in the gym sheet`)
}
async function finish() {
  await must(`click('.hv-finish')`, 'no Finish button')
  if (!await until(() => page(`has('.hv-fin')`), 12, 250)) throw new Error('Finish opened no sheet')
  if (await page(`attr('.hv-fin-chk', 'aria-checked')`) === 'true') await must(`click('.hv-fin-chk')`, 'the routine tick did not untick')
  await must(`click('.hv-fin-save')`, 'no Save in the Finish sheet')
  let saved = false
  await until(async () => { if ((await page('toasts()')).includes('Workout saved')) saved = true; return saved }, 24, 250)
  if (!await until(async () => !(await readS()).active)) throw new Error('the workout is still in progress after Save')
  return saved
}
async function todayNext() {
  await nav('#/home')
  await until(() => page(`has('.hv-next-n')`), 12, 250)
  return page(`text('.hv-next-n')`)
}
const nextNames = (S, today) => { const n = nextPlanned(S, today); return n ? n.ids.map(id => S.routines.find(r => r.id === id)?.name ?? id).join(' + ') : null }
/** The export draft as Hevy would get it, each exercise with the built-in template it goes as. Never sent. */
function draftOf(S, w) {
  const d = X.workoutDraft(w, S.unit, S)
  if (!d) return null
  const done = X.finish(d, X.templateFinder(X.builtinTemplates(), S))
  d.exercises.forEach((e, i) => { e.template = done.exercises[i].exercise_template_id ?? null })
  return exportFacts(d)
}
const beforeOf = (S, routineId) => ({
  routine: routineFacts(S.routines.find(r => r.id === routineId)),
  hvMachines: structuredClone(S.hvMachines || {}), hvCables: structuredClone(S.hvCables || {}),
})
const openedOf = S => S.active.entries.map(entryFacts)

/* ------------------------------------------------------------------------- journeys -- */

async function j8() {
  let S = await readS()
  const since = Date.now() - 60000
  const before = beforeOf(S, OWNER.UPPER_A)
  await startRoutine(OWNER.UPPER_A)
  await pickGym(OWNER.GROSTONAS.name)
  S = await readS()
  const opened = { entries: openedOf(S) }

  // Lever incline chest press: the top set retyped, the warm-ups read again, then every set ticked.
  let i = idxOf(S, '1299')
  let e = S.active.entries[i], plan = await planOf(S, i)
  const work = e.sets.map((s, k) => (s.phase === 'warmup' || s.warmup ? -1 : k)).filter(k => k >= 0)
  const warms = e.sets.map((s, k) => (s.phase === 'warmup' || s.warmup ? k : -1)).filter(k => k >= 0)
  const topW = Math.round((Number(e.sets[work[0]].w) + T.TOP_STEP) * 1000) / 1000
  await must(`type(${i}, ${rowFor(plan, work[0])}, 0, ${JSON.stringify(String(topW))})`, 'no weight field on 1299\'s top set')
  S = await readS()
  opened.warmupsAfterTyping = S.active.entries[i].sets.filter(s => s.phase === 'warmup' || s.warmup).map(s => [Number(s.w), Number(s.r)])
  for (const k of warms) await tickRow(i, rowFor(plan, k))
  await tickRow(i, rowFor(plan, work[0]), T.TOP_RPE)
  if (work[1] != null) await tickRow(i, rowFor(plan, work[1]), T.BACK_RPE)

  // Military press: the brand changed where it shows; PREVIOUS follows it; the kg typed as is.
  S = await readS()
  i = idxOf(S, '0587'); e = S.active.entries[i]; plan = await planOf(S, i)
  const mWork = e.sets.map((s, k) => (s.phase === 'warmup' || s.warmup ? -1 : k)).filter(k => k >= 0)
  const prevBefore = await page(`prev(${i}, ${rowFor(plan, mWork[0])})`)
  await must(`inCard(${i}, '.hv-brand')`, 'no brand line on 0587')
  await waitSheet('the brand sheet')
  await must(`inSheet('button', ${JSON.stringify(T.PRESS_BRAND)})`, `no ${T.PRESS_BRAND} among the known brands`)
  await sleep(500)
  const prevAfter = await page(`prev(${i}, ${rowFor(plan, mWork[0])})`)
  await must(`type(${i}, ${rowFor(plan, mWork[0])}, 0, ${JSON.stringify(String(T.PRESS_KG))})`, 'no weight field on 0587\'s top set')
  S = await readS(); e = S.active.entries[i]
  for (const [k, s] of e.sets.entries()) await tickRow(i, rowFor(plan, k), s.phase === 'warmup' || s.warmup ? null : T.BACK_RPE)

  // Cable bar lateral pulldown: ×2 at this gym; every set as opened.
  S = await readS()
  i = idxOf(S, '0150'); e = S.active.entries[i]; plan = await planOf(S, i)
  for (const [k, s] of e.sets.entries()) await tickRow(i, rowFor(plan, k), s.phase === 'warmup' || s.warmup ? null : T.BACK_RPE)

  // Preacher curl and one-arm triceps extension: per side, uneven reps, one weight. The curl's
  // routine slot is not per side, so it is switched on in the workout (More → Per side), as the owner does.
  for (const [id, reps] of [['0592', T.CURL], ['0362', T.TRICEPS]]) {
    S = await readS()
    i = idxOf(S, id); e = S.active.entries[i]
    if (id === '0592' && !e.sets.some(s => s.sides)) {
      await page(`inCard(${i}, '.hv-openex')`)
      await must(`inCard(${i}, '.hv-more')`, `no More on ${id}`)
      await waitSheet(`${id}'s More menu`)
      await must(`menu('Per side')`, `no Per side in ${id}'s More menu`)
      await waitSheet(`${id}'s settings`)
      await must(`switchOn('Per side')`, `no Per side switch in ${id}'s settings`)
      await must(`inSheet('button', 'Done')`, `no Done in ${id}'s settings`)
      await sleep(800)
      S = await readS(); e = S.active.entries[i]
    }
    plan = await planOf(S, i)
    const k = e.sets.findIndex(s => s.sides && !(s.phase === 'warmup' || s.warmup))
    if (k < 0) throw new Error(`${id} did not open per side`)
    for (const side of ['L', 'R']) await must(`type(${i}, ${rowFor(plan, k, side)}, 1, ${JSON.stringify(String(reps[side]))})`, `no reps field on ${id}'s ${side} side`)
    for (const side of plan.filter(p => p.set === k).map(p => p.side)) await tickRow(i, rowFor(plan, k, side), T.BACK_RPE)
  }

  // The workout note, from the header.
  await headerDetails()
  await must(`click('.hv-wnote')`, 'no workout note in the header')
  await waitSheet('the workout note')
  await must(`sheetType(${JSON.stringify(T.NOTE)})`, 'no field in the workout note sheet')
  await must(`inSheet('button', 'Save')`, 'no Save in the workout note sheet')

  const saved = await finish()
  const next = await todayNext()
  await restart()
  S = await readS()
  const w = S.workouts.filter(x => x.routineId === OWNER.UPPER_A).at(-1)
  const today = await page('today()')
  return {
    S, since, before, opened, prompts,
    ui: { saved, prevBefore, prevAfter, next, nextExpected: nextNames(S, today) },
    draft: w ? draftOf(S, w) : null,
    best: bestSetOf(w?.entries.find(x => x.id === '1299'), formulaOf(S)),
  }
}

async function j8b() {
  let S = await readS()
  const since = Date.now() - 60000
  const before = beforeOf(S, OWNER.LOWER_A)
  await startRoutine(OWNER.LOWER_A)
  await pickGym(OWNER.SAHAROVA.name)
  S = await readS()
  const opened = { entries: openedOf(S) }
  // Calf raise: the warm-up, the left and right holds as opened (75 s at a set weight), the first rep set.
  const i = idxOf(S, '1178'), e = S.active.entries[i], plan = await planOf(S, i)
  const warm = s => s.phase === 'warmup' || s.warmup
  const holds = e.sets.map((s, k) => (s.mode === 'time' ? k : -1)).filter(k => k >= 0)
  const reps = e.sets.findIndex(s => !warm(s) && s.mode !== 'time')
  const order = [...e.sets.map((s, k) => (warm(s) ? k : -1)).filter(k => k >= 0), ...holds, ...(reps >= 0 ? [reps] : [])]
  for (const k of order) {
    for (const p of plan.filter(x => x.set === k)) await tickRow(i, p.row, warm(e.sets[k]) ? null : T.BACK_RPE)
  }
  const saved = await finish()
  await restart()
  S = await readS()
  const w = S.workouts.filter(x => x.routineId === OWNER.LOWER_A).at(-1)
  return { S, since, before, opened, prompts, ui: { saved }, draft: w ? draftOf(S, w) : null }
}

async function j1() {
  let S = await readS()
  const since = Date.now() - 60000
  // 1. Today's next session, started from its card (D134).
  const started = await todayNext()
  const routine = routineFacts(S.routines.find(r => r.name === started))
  const go = started && await until(() => evaluate(cdp, `(() => { const b = [...document.querySelectorAll('.hv-today-start, .hv-next button')].find(b => b.offsetParent !== null && b.textContent.trim() === ${JSON.stringify('Start ' + started)}); if (!b) return false; b.click(); return true })()`), 10)
  if (!go || !await until(async () => !!(await readS()).active)) throw new Error(`Today's "Start ${started}" did not start a workout`)
  await sleep(1500)
  S = await readS()
  const opened = openedOf(S)
  // 2. The first exercise: one set ticked as opened, the next one's weight changed, then ticked.
  const plan = await planOf(S, 0)
  const sets = S.active.entries[0].sets
  const todo = sets.map((s, k) => (!s.done ? k : -1)).filter(k => k >= 0 && rowOf(plan, k) != null)
  if (todo.length < 2) throw new Error('the first exercise opens with fewer than two plain sets')
  const prefilled = { idx: 0, set: todo[0] }
  const typed = { idx: 0, set: todo[1], w: Math.round(((Number(sets[todo[1]].w) || 0) + 2.5) * 100) / 100 }
  await tickRow(0, rowFor(plan, prefilled.set))
  // 3. The rest in the panel: +1 min, then Skip (D127).
  const left = async () => { const t = await page(`text('#hv-dock-left')`); if (!t) return null; const [m, s] = t.split(':').map(Number); return m * 60 + s }
  const rest = { before: null, after: null, skipped: false }
  if (await until(() => page(`has('.hv-dock')`), 12, 250)) {
    rest.before = await left()
    await must(`click('.hv-dock button', '+1 min')`, 'no +1 min in the rest panel')
    rest.after = await left()
    await must(`click('.hv-dock button', 'Skip')`, 'no Skip in the rest panel')
    rest.skipped = await until(async () => !await page(`has('.hv-dock')`), 8, 250)
  }
  await must(`type(0, ${rowFor(plan, typed.set)}, 0, ${JSON.stringify(String(typed.w))})`, 'no weight field on the next set')
  await tickRow(0, rowFor(plan, typed.set))
  if (await page(`has('.hv-dock')`)) await page(`click('.hv-dock button', 'Skip')`)
  // 4. Swap the second exercise for the first one offered (D129), and log its first set.
  let swap = null
  S = await readS()
  if (S.active.entries.length > 1) {
    swap = { idx: 1, from: S.active.entries[1].id, to: null }
    await page(`inCard(1, '.hv-openex')`)
    await sleep(500)
    await must(`inCard(1, '.hv-acts button', 'Swap')`, 'no Swap on the second exercise')
    await must(`click('[aria-label^="Use "]')`, 'the swap offered nothing to use')
    await until(async () => (await readS()).active?.entries[1]?.id !== swap.from, 12, 250)
    S = await readS()
    swap.to = S.active.entries[1]?.id ?? null
    const p1 = await planOf(S, 1)
    const first = rowOf(p1, 0) ?? rowOf(p1, 0, p1[0]?.side)
    const s0 = S.active.entries[1].sets[0]
    // A new exercise may open empty: a weight and reps typed, so the tick logs something.
    if (s0 && !(Number(s0.r) > 0) && first != null) { await page(`type(1, ${first}, 0, '10')`); await page(`type(1, ${first}, 1, '8')`); await sleep(400) }
    if (first != null) await tickRow(1, first)
  }
  // 5. A swipe to delete and its undo: a gesture, walked in Walk mode only.
  // 6. Finish without "Update the routine too".
  const saved = await finish()
  // 7. History lists it; its detail shows the retyped weight.
  await nav('#/history-tab')
  const inHistory = await until(async () => (await page('body()')).includes(started), 12, 250)
  let detailShowsWeight = false
  if (inHistory) {
    await evaluate(cdp, `(() => { const el = [...document.querySelectorAll('button, a, [role=button], li, div')].filter(e => e.offsetParent !== null && e.textContent.includes(${JSON.stringify(started)})).sort((a, b) => a.textContent.length - b.textContent.length)[0]; el?.click(); return !!el })()`)
    detailShowsWeight = await until(async () => (await page('body()')).includes(String(typed.w)), 12, 250)
  }
  await restart()
  S = await readS()
  return { S, since, started, routine, opened, prefilled, typed, rest, swap, ui: { saved, inHistory, detailShowsWeight } }
}

/** The owner profile's first step (journey-check.sh --make-owner-profile): a backup imported through Settings → Data, replacing. */
async function importBackup(file) {
  const text = readFileSync(file, 'utf8')
  const want = JSON.parse(text).workouts?.length ?? 0
  const S = await readS()
  if (S.active) throw new Error('a workout is in progress: finish or discard it first')
  await nav('#/settings/data')
  const input = 'input[type=file][accept=".json,.zip,application/json,application/zip"]'
  if (!await until(() => evaluate(cdp, `!!document.querySelector(${JSON.stringify(input)})`), 12, 250)) throw new Error('no Import backup on Settings → Data')
  await evaluate(cdp, `(() => {
    const input = document.querySelector(${JSON.stringify(input)})
    const dt = new DataTransfer()
    dt.items.add(new File([${JSON.stringify(text)}], 'opengym-backup.json', { type: 'application/json' }))
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`)
  await waitSheet('the import confirm')
  if (!await page(`inSheet('button', 'Import')`) && !await page(`menu('Replace anyway')`)) throw new Error('the import asked nothing to confirm')
  if (!await until(async () => (await readS()).workouts?.length === want, 40, 500)) throw new Error(`the import did not bring the backup's ${want} workouts in`)
  let st = await readS()
  if (st.effort !== 'rpe') await evaluate(cdp, withStore(`st.update(s => { s.effort = 'rpe' })`))
  st = await readS()
  console.log(`imported ${st.workouts.length} workouts, ${st.routines.length} routines, effort ${st.effort}, warm-up effort ${st.hvWarmupEffort === true ? 'on' : 'off'}`)
}

const RUNS = { J1: j1, J8: j8, J8b: j8b }

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...args] = process.argv.slice(2)
  const fail = msg => { console.error('journey-check: ' + msg); process.exit(2) }
  try {
    if (cmd === 'import' && args[0]) {
      await open()
      await importBackup(args[0])
      cdp.close()
      process.exit(0)
    }
    const [J, out] = args
    const baseAt = args.indexOf('--base')
    if (cmd !== 'run' || !RUNS[J] || !out) fail('usage: journey-check.mjs run <J1|J8|J8b> <out.json> [--base <baseline.json>] | import <backup.json>')
    const base = baseAt > 0 ? JSON.parse(readFileSync(args[baseAt + 1], 'utf8')) : null
    await open()
    if ((await readS()).active) fail('a workout is in progress: finish or discard it first')
    let run
    try { run = await RUNS[J]() } finally {
      // A throw mid-journey leaves the workout running; the profile is restored next anyway.
      try { await evaluate(cdp, withStore('if (st.S.active) st.update(s => { s.active = null })')) } catch {}
    }
    run.hr = process.env.JOURNEY_HR === '1'
    const result = CHECKS[J](run)
    writeFileSync(out, JSON.stringify({ journey: J, problems: result.problems, facts: result.facts, info: result.info ?? null }, null, 2) + '\n')
    const r = report(J, result, base)
    console.log(r.text)
    cdp.close()
    process.exit(r.code)
  } catch (e) { fail(e.message) }
}
