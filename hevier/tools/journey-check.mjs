#!/usr/bin/env node
// The "Check" mode of the UX journeys (hevier/ux/JOURNEYS.md): taps through a journey's steps on
// the running app over CDP, the way a person would, then reads what was saved and checks it
// (journey-lib.mjs). For after an upstream merge: a seam no longer called, a moved handler or a
// sheet that will not open keeps every unit test green and still breaks a journey's end state.
//
//   node hevier/tools/journey-check.mjs run <J1..J7|J8|J8b> <out.json> [--base <baseline.json>]
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
import { CHECKS, OWNER, UX, J8_TYPED as T, entryFacts, exportFacts, report, routineFacts, rowOf, rowPlan, snapOf } from './journey-lib.mjs'

useViteEnv()
const app = p => import(new URL('../../frontend/src/' + p, import.meta.url))
const X = await app('hevier/lib/hevy-export.js')
const { nextPlanned } = await app('hevier/lib/next-planned.js')
const { bestSetOf, formulaOf } = await app('lib/onerm.js')
const { exOr } = await app('lib/exercises.js')
const { defaults: statsDefaults } = await app('hevier/lib/stats-layout.js')

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
    // J2 to J7: sheets closed by their backdrop, the exercise picker, labels and the AX names.
    closeSheet: () => tap(sheet()?.previousElementSibling?.classList.contains('mback') ? sheet().previousElementSibling : null),
    sheetTitle: () => sheet()?.querySelector('h3, h2')?.textContent.trim() ?? null,
    pkSearch: q => { const el = sheet()?.querySelector('input[aria-label="Search exercise"]'); return el ? setValue(el, q) : false },
    // A picker row by the exercise's name (its label is "Name · sub", or "Use Name · sub" in a swap).
    pkRow: (name, go) => {
      const want = name.toLowerCase()
      const b = [...(sheet()?.querySelectorAll('.hv-pk-row .item-open') || [])].filter(vis).find(b => {
        const l = (b.getAttribute('aria-label') || '').toLowerCase().replace(/^use /, '')
        return l === want || l.startsWith(want + ' ·')
      })
      return b ? (go ? tap(b) : true) : false
    },
    pkRows: () => [...(sheet()?.querySelectorAll('.hv-pk-row .item-open') || [])].filter(vis).slice(0, 6).map(b => b.getAttribute('aria-label')).join(' | ') || 'none',
    byLabel: (label, sel) => tap([...document.querySelectorAll(sel || 'button')].filter(vis).find(b => (b.getAttribute('aria-label') || '').toLowerCase() === label.toLowerCase())),
    hasLabel: label => [...document.querySelectorAll('[aria-label]')].filter(vis).some(b => b.getAttribute('aria-label') === label),
    cardText: (idx, sel) => card(idx)?.querySelector(sel)?.textContent.trim() ?? null,
    // The weight column's header (the third: SET · PREVIOUS · weight).
    head: idx => card(idx)?.querySelector('.hv-head')?.children[2]?.textContent.trim() ?? null,
    cell: (idx, row, i) => rows(idx)[row]?.querySelectorAll('.hv-cell input')[i]?.value ?? null,
    count: sel => [...document.querySelectorAll(sel)].filter(vis).length,
    hash: () => location.hash,
    // What TalkBack reads (A3, A5): each control's role and name, from the DOM.
    ax: idx => {
      const item = el => el && { role: el.getAttribute('role') || ({ BUTTON: 'button', INPUT: 'textbox' })[el.tagName] || el.tagName.toLowerCase(), name: (el.getAttribute('aria-label') || el.textContent || '').trim() }
      const r = rows(idx).find(x => !x.classList.contains('done')) || rows(idx)[0]
      return {
        fields: [...(r?.querySelectorAll('.hv-cell input') || [])].map(item),
        setType: item(r?.querySelector('.hv-set')),
        tick: item(r?.querySelector('.hv-chk, .hv-eff-tick')),
        rest: [...document.querySelectorAll('.hv-dock button')].filter(vis).map(item),
      }
    },
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
// A screen still drawing gets a few seconds: the step fails only when it never lands.
const must = async (call, what) => { if (!await until(() => page(call), 10, 300)) throw new Error(what); await sleep(500) }
// The same for a page expression of its own, not one of the helpers above.
const mustJs = async (js, what) => { if (!await evaluate(cdp, js)) throw new Error(what); await sleep(500) }
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

async function j1({ during } = {}) {
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
    if (during) await during()   // J7 reads the AX names here, a set row and the rest panel both on screen
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

/* ------------------------------------------------- the test profile's journeys, J2 to J7 -- */

const nameOf = id => exOr(id).n
const shell = (...args) => execFileSync(ADB, ['shell', ...args]).toString().trim()
/** Closes every open sheet by its backdrop. */
async function closeSheets() {
  for (let n = 0; n < 6 && await page('sheetOpen()'); n++) { await page('closeSheet()'); await sleep(400) }
}
/** Ticks the exercises `ids` in the open Add Exercise picker and adds them (`at`: the step, for the error). */
async function pickExercises(ids, at) {
  await sleep(600)   // over a sheet already open (Backups), the picker comes on top
  await waitSheet(`${at}: the exercise picker`)
  for (const id of ids) {
    const name = nameOf(id)
    if (!await page(`pkSearch(${JSON.stringify(name)})`)) throw new Error(`${at}: no search field in the exercise picker`)
    if (!await until(() => page(`pkRow(${JSON.stringify(name)}, false)`), 12, 250)) throw new Error(`${at}: no "${name}" (${id}) in the exercise picker; it lists ${await page('pkRows()')}; the sheet reads ${JSON.stringify(await evaluate(cdp, `([...document.querySelectorAll('[aria-modal="true"]')].at(-1)?.innerText || '').slice(0, 300)`))}`)
    await page(`pkRow(${JSON.stringify(name)}, true)`)
    await sleep(400)
  }
  // Several at once are ticked, then added; a titled pick (a backup) took the tap already.
  if (await page(`has('.hv-pk-add .btn.primary')`)) await must(`click('.hv-pk-add .btn.primary')`, `${at}: no Add button in the picker`)
  await sleep(800)
}
/** Adds `id` to the running workout from its Add Exercise; returns its index. */
async function addToWorkout(id, at) {
  await must(`click('.hv-addex')`, `${at}: no Add Exercise button`)
  await pickExercises([id], at)
  if (!await until(async () => (await readS()).active?.entries.some(e => e.id === id), 12, 250)) throw new Error(`${at}: ${nameOf(id)} (${id}) did not join the workout`)
  await sleep(500)
  const S = await readS()
  return S.active.entries.map(e => e.id).lastIndexOf(id)
}
async function startEmpty(at) {
  await nav('#/routines')
  await must(`byLabel('Empty workout')`, `${at}: no Empty workout on the Routines page`)
  if (!await until(async () => !!(await readS()).active)) throw new Error(`${at}: Empty workout started nothing`)
  await sleep(1500)
}
/** Discard Workout and its confirm; returns the question it asked. */
async function discard(at) {
  await must(`click('.hv-foot .hv-danger')`, `${at}: no Discard Workout button`)
  await waitSheet(`${at}: the discard confirm`)
  const asked = await page('sheetTitle()')
  await must(`inSheet('button', 'Discard')`, `${at}: no Discard in the confirm`)
  if (!await until(async () => !(await readS()).active)) throw new Error(`${at}: the workout is still open after Discard`)
  return asked
}
const routineByName = (S, name, J) => { const r = S.routines.find(x => x.name === name); if (!r) throw new Error(`${J}: no routine "${name}" in the test profile`); return r }

async function j2() {
  let S = await readS()
  const before = snapOf(S)
  const ui = {}
  // 1. Settings → Data: the import is there; nothing is tapped (no file is on the device, so no CSV summary).
  await nav('#/settings/data')
  ui.importShown = await until(async () => { const b = await page('body()'); return b.includes('Import backup') && b.includes('Import from another app') }, 12, 250)
  // 2. Lifts: the leg press found by its brand, its page opened.
  await nav('#/lifts')
  await mustJs(`(el => el && (el.scrollIntoView({ block: 'center' }), true))(document.querySelector('input[aria-label="Search exercises"]'))`, 'J2 step 2: no search on Lifts')
  await evaluate(cdp, `(() => { const el = document.querySelector('input[aria-label="Search exercises"]'); el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'life fitness'); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  const lp = nameOf(UX.LEG_PRESS).toLowerCase()
  const liftSel = `[...document.querySelectorAll('.hv-lift')].find(b => b.getClientRects().length && (b.getAttribute('aria-label') || '').toLowerCase().startsWith(${JSON.stringify(lp)}))`
  ui.liftFound = await until(() => evaluate(cdp, `!!${liftSel}`), 12, 250)
  if (ui.liftFound) {
    await evaluate(cdp, `${liftSel}.click()`)
    ui.liftOpened = await until(async () => (await page(`text('.hv-xd-bar h3')`))?.toLowerCase() === lp, 12, 250)
    ui.labels = await page(`has('.hv-xd-labels')`)
    await closeSheets()
  }
  // 3. Routines: the folder opened, the routine's page from its row, its editor; one set added and removed.
  const r = routineByName(S, UX.ROUTINE, 'J2 step 3')
  const routine = { name: r.name, before: routineFacts(r), sets: {} }
  await nav('#/routines')
  const rowSel = `[...document.querySelectorAll('.hv-rname')].find(b => b.getClientRects().length && b.querySelector('.hv-rname-n')?.textContent.trim() === ${JSON.stringify(r.name)})`
  if (!await evaluate(cdp, `!!${rowSel}`) && r.folder) {
    await evaluate(cdp, `(() => { const b = [...document.querySelectorAll('.hv-ftoggle')].find(b => b.textContent.trim().startsWith(${JSON.stringify(r.folder + ' (')})); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); return !!b })()`)
    await sleep(600)
  }
  if (!await until(() => evaluate(cdp, `!!${rowSel}`), 8, 250)) throw new Error(`J2 step 3: no row for ${r.name} on the Routines page`)
  await evaluate(cdp, `(el => { el.scrollIntoView({ block: 'center' }); el.click() })(${rowSel})`)
  ui.routinePage = await until(async () => { const h = await page('hash()'); return h.endsWith('/view') && h.includes(r.id) }, 12, 250)
  if (!ui.routinePage) throw new Error(`J2 step 3: a tap on ${r.name}'s row opened ${await page('hash()')}`)
  await must(`click('.hv-rv-edit')`, `J2 step 3: no Edit on ${r.name}'s page`)
  ui.editor = await until(() => page(`has('.hv-routine .hv-rtitle')`), 12, 250)
  if (!ui.editor) throw new Error(`J2 step 3: ${r.name}'s Edit opened no editor`)
  const setsOf = async () => (await readS()).routines.find(x => x.id === r.id)?.ex[0]?.sets ?? null
  routine.sets.before = await setsOf()
  await must(`click('.hv-routine .hv-ex .hv-addset')`, `J2 step 3: no + Set on ${r.name}'s first exercise`)
  await until(async () => (await setsOf()) !== routine.sets.before, 8, 250)
  routine.sets.added = await setsOf()
  // The last work set's remove mark, not a warm-up's.
  await mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)([...document.querySelector('.hv-routine .hv-ex').querySelectorAll('.hv-rt-del')].filter(b => /^Remove set /.test(b.getAttribute('aria-label') || '')).at(-1))`, `J2 step 3: no remove mark on ${r.name}'s added set`)
  await until(async () => (await setsOf()) === routine.sets.before, 8, 250)
  routine.sets.removed = await setsOf()
  await must(`click('.hv-routine .hv-finish')`, `J2 step 3: no Done in ${r.name}'s editor`)
  await restart()
  S = await readS()
  routine.after = routineFacts(S.routines.find(x => x.id === r.id))
  return { before, after: snapOf(S), routine, ui }
}

async function j3() {
  let S = await readS()
  const before = snapOf(S)
  const gyms = (S.equipProfiles || []).filter(p => p?.id != null)
  if (gyms.length < 2) throw new Error('J3: the test profile has fewer than two gyms')
  // The gym where the cable is not on ×2 yet, so step 3 switches it; else the one not active now.
  const pick = gyms.find(g => S.hvCables?.[UX.CABLE]?.[g.id] !== 'x2') || gyms.find(g => g.id !== S.activeEquipId) || gyms[0]
  const other = gyms.find(g => g.id !== pick.id)
  const ui = {}
  // 1. An empty workout, the gym changed from the gym line by its exact label.
  await startEmpty('J3 step 1')
  await pickGym(pick.name)
  if ((await readS()).active?.hvGym !== pick.id) throw new Error(`J3 step 1: picking ${pick.name} on the gym line did not set the workout's gym`)
  // 2. The leg press: its brand follows the gym; another brand picked, PREVIOUS follows.
  const i = await addToWorkout(UX.LEG_PRESS, 'J3 step 2')
  ui.brandShown = (await page(`cardText(${i}, '.hv-brand.has')`)) || null
  ui.prevBefore = await page(`prev(${i}, 0)`)
  const known = [S.hvMachines?.[UX.LEG_PRESS]?.[other.id], ...Object.values(S.hvMachines || {}).flatMap(m => Object.values(m || {}))].filter(Boolean)
  ui.picked = known.find(b => b !== ui.brandShown)
  if (!ui.picked) throw new Error('J3 step 2: no other brand known to pick for the leg press')
  await must(`inCard(${i}, '.hv-brand')`, 'J3 step 2: no brand line on the leg press')
  await waitSheet('J3 step 2: the brand sheet')
  await must(`inSheet('button', ${JSON.stringify(ui.picked)})`, `J3 step 2: no ${ui.picked} among the known brands`)
  await sleep(600)
  ui.prevAfter = await page(`prev(${i}, 0)`)
  const logged = b => (S.workouts || []).some(w => (w.entries || []).some(e => e.id === UX.LEG_PRESS && e.hvBrand === b))
  ui.logged = { before: !!ui.brandShown && logged(ui.brandShown), after: logged(ui.picked) }
  // 3. A cable on ×2; the weight column's header.
  const j = await addToWorkout(UX.CABLE, 'J3 step 3')
  if ((await readS()).active.entries[j].hvCable !== 'x2' && !/×2/.test(await page(`cardText(${j}, '.hv-cable')`) || '')) {
    await must(`inCard(${j}, '.hv-cable')`, 'J3 step 3: no cable setup beside the cable\'s brand')
    await waitSheet('J3 step 3: the cable setup sheet')
    await must(`menu('Two stacks · ×2')`, 'J3 step 3: no "Two stacks · ×2" in the cable setup')
    await sleep(600)
  }
  ui.header = await page(`head(${j})`)
  // 4. Add Exercise: a search the gym narrows says how many it hid (D67); the picker closed again.
  await must(`click('.hv-addex')`, 'J3 step 4: no Add Exercise button')
  await waitSheet('J3 step 4: the exercise picker')
  // The workout's gym has nearly everything; the picker's gym filter set to the small gym hides some.
  await must(`inSheet('button', ${JSON.stringify(pick.name)})`, `J3 step 4: no gym filter reading ${pick.name} in the picker`)
  await waitSheet('J3 step 4: the equipment filter')
  await must(`menu(${JSON.stringify(other.name)})`, `J3 step 4: no ${other.name} in the equipment filter`)
  await sleep(600)
  ui.hiddenGym = other.name
  for (const q of ['sled', 'smith', 'trap bar', 'landmine', 'kettlebell', 'band', 'sandbag', 'cable']) {
    await page(`pkSearch(${JSON.stringify(q)})`)
    if (await until(() => page(`has('.hv-pk-hidden')`), 4, 250)) { ui.hidden = await page(`text('.hv-pk-hidden span')`); ui.query = q; break }
  }
  if (!ui.hidden) throw new Error(`J3 step 4: no search hid anything at ${other.name} (sled, smith, trap bar, landmine, kettlebell, band, sandbag, cable)`)
  await closeSheets()
  // 5. Discard, asked first.
  ui.discardAsked = await discard('J3 step 5')
  await restart()
  S = await readS()
  return { before, after: snapOf(S), gym: pick.name, other: other.name, ui }
}

async function j4() {
  let S = await readS()
  const before = snapOf(S)
  const ui = {}
  await startEmpty('J4 step 1')
  // 1. A one-limb exercise starts per side (D75); More → Side order → Right first; one set logged R then L.
  const i = await addToWorkout(UX.ONE_LEG, 'J4 step 1')
  S = await readS()
  let e = S.active.entries[i]
  const k = e.sets.findIndex(s => s.sides && !(s.phase === 'warmup' || s.warmup))
  ui.perSide = k >= 0
  if (!ui.perSide) throw new Error(`J4 step 1: ${nameOf(UX.ONE_LEG)} did not start per side`)
  await page(`inCard(${i}, '.hv-openex')`)
  await must(`inCard(${i}, '.hv-more')`, `J4 step 1: no More on ${UX.ONE_LEG}`)
  await waitSheet(`J4 step 1: ${UX.ONE_LEG}'s More menu`)
  await must(`menu('Side order')`, `J4 step 1: no Side order in ${UX.ONE_LEG}'s More menu`)
  await waitSheet('J4 step 1: the Side order menu')
  await must(`menu('Right first')`, 'J4 step 1: no Right first in the Side order menu')
  await sleep(600)
  await closeSheets()
  S = await readS(); e = S.active.entries[i]
  const plan = await planOf(S, i)
  ui.firstSide = plan.find(p => p.set === k)?.side ?? null
  for (const side of plan.filter(p => p.set === k).map(p => p.side)) {
    // A new exercise may open with no reps: one typed, so the tick logs something.
    if (!(Number(e.sets[k].sides?.[side]?.r) > 0)) await page(`type(${i}, ${rowFor(plan, k, side)}, 1, '10')`)
    await tickRow(i, rowFor(plan, k, side))
  }
  S = await readS()
  ui.ticked = { R: !!S.active.entries[i].sets[k]?.sides?.R?.done, L: !!S.active.entries[i].sets[k]?.sides?.L?.done }
  await page(`click('.hv-dock button', 'Skip')`)
  // 2. A plank: its ⏱ hold on the big clock, Stop after a few seconds, then the tick.
  const pi = await addToWorkout(UX.PLANK, 'J4 step 2')
  await must(`inCard(${pi}, '.hv-go')`, 'J4 step 2: no ▶ timer on the plank\'s first set')
  await waitSheet('J4 step 2: the hold clock')
  await sleep(3500)
  await must(`inSheet('button', 'Stop')`, 'J4 step 2: no Stop on the hold clock')
  await until(async () => !(await readS()).active.entries[pi].sets[0]?.hvRun, 12, 250)
  await closeSheets()
  const secOf = async () => Number((await readS()).active.entries[pi].sets[0]?.sec ?? NaN)
  ui.plank = { afterStop: await secOf() }
  await tickRow(pi, 0)
  ui.plank.afterTick = await secOf()
  ui.plank.done = !!(await readS()).active.entries[pi].sets[0]?.done
  await page(`click('.hv-dock button', 'Skip')`)
  // 3. The bike: 1234 on the number pad reads 12:34.
  const bi = await addToWorkout(UX.BIKE, 'J4 step 3')
  await must(`type(${bi}, 0, 0, ${JSON.stringify(UX.BIKE_DIGITS)})`, 'J4 step 3: no time field on the bike\'s first set')
  await sleep(500)
  ui.bike = { shown: await page(`cell(${bi}, 0, 0)`), min: (await readS()).active.entries[bi].sets[0]?.min ?? null }
  // 4. A set timer running, the app left with Home for 20 s and opened again.
  S = await readS()
  if (S.active.entries[bi].sets.length < 2) {
    await page(`inCard(${bi}, '.hv-openex')`)
    await must(`inCard(${bi}, '.hv-addset')`, 'J4 step 4: no + Set on the bike')
    await until(async () => (await readS()).active.entries[bi].sets.length > 1, 8, 250)
  }
  await mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)(document.querySelector('[data-exidx="${bi}"] [aria-label="Start set, Set 2"]'))`, 'J4 step 4: no ▶ (Start set, Set 2) on the bike')
  const started = Date.now()
  await sleep(800)
  execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
  await sleep(20000)
  execFileSync(ADB, ['shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1'], { stdio: 'ignore' })
  cdp?.close()
  let last = null
  if (!await until(async () => { try { await open(); return true } catch (x) { last = x; return false } }, 30, 1000)) throw new Error('J4 step 4: the app did not come back from Home: ' + last?.message)
  if (!(await page('hash()')).startsWith('#/workout')) await nav('#/workout')
  await until(() => page(`has('[data-exidx="${bi}"] .hv-running')`), 12, 250)
  const clock = await page(`cardText(${bi}, '.hv-running')`)
  ui.away = { shown: clock ? clock.split(':').reduce((a, n) => a * 60 + Number(n), 0) : null, expected: Math.round((Date.now() - started) / 1000), clock }
  // 5. Discard, asked first.
  ui.discardAsked = await discard('J4 step 5')
  await restart()
  S = await readS()
  return { before, after: snapOf(S), ui }
}

async function j5() {
  let S = await readS()
  const before = snapOf(S)
  const ui = { chart: {}, arrange: {}, report: {}, lift: {}, detail: {}, calendar: {} }
  const pins = { workouts: S.workouts.length, routines: S.routines.length }
  // 1. Statistics' weekly chart: switched to reps, a week tapped; on sets a week opens its muscles.
  await nav('#/stats')
  if (!await until(() => page(`has('.hv-chart')`), 12, 250)) throw new Error('J5 step 1: Statistics has no weekly chart')
  const chip = label => mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)([...document.querySelectorAll('.hv-chart .hv-chips .hv-chip')].find(b => b.textContent.trim() === ${JSON.stringify(label)}))`, `J5 step 1: no ${label} chip on the weekly chart`)
  const bar = `(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)([...document.querySelectorAll('.hv-chart .hv-barcol')].filter(b => !b.querySelector('i.zero')).at(-1) || [...document.querySelectorAll('.hv-chart .hv-barcol')].at(-1))`
  await chip('Reps')
  ui.chart.reps = await page(`text('.hv-chart-h h2')`)
  await mustJs(bar, 'J5 step 1: no week bar on the chart')
  ui.chart.week = await page(`text('.hv-chart-h h2')`)
  await mustJs(bar, 'J5 step 1: no week bar to tap off')
  await chip('Sets')
  await mustJs(bar, 'J5 step 1: no week bar on the sets chart')
  ui.chart.setsSheet = await until(() => page('sheetOpen()'), 8, 250)
  await closeSheets()
  await chip('Duration')
  // 2. Arrange Statistics: a card hidden, the first tile moved down, then Reset.
  await mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)([...document.querySelectorAll('.hv-stat-ends .hv-chip')].find(b => b.textContent.trim() === 'Arrange'))`, 'J5 step 2: no Arrange chip on Statistics')
  if (!await until(() => page(`has('.hv-arrange')`), 12, 250)) throw new Error('J5 step 2: Arrange did not open Arrange Statistics')
  const layout = async () => (await readS()).hvStatsLayout || {}
  await must(`byLabel('Weekly chart card')`, 'J5 step 2: no switch for the Weekly chart card')
  ui.arrange.hidden = await until(async () => ((await layout()).cards?.hidden || []).includes('weekly'), 8, 250)
  const tilesBefore = JSON.stringify((await layout()).tiles?.order ?? null)
  await mustJs(`(b => b ? (b.click(), true) : false)(document.querySelector('.hv-arrlist .hv-grip'))`, 'J5 step 2: no handle on the first tile')
  await waitSheet('J5 step 2: the tile\'s Move menu')
  await must(`menu('Move down')`, 'J5 step 2: no Move down for the first tile')
  ui.arrange.moved = await until(async () => JSON.stringify((await layout()).tiles?.order ?? null) !== tilesBefore, 8, 250)
  await closeSheets()
  await must(`click('.hv-arrange .hv-link', 'Reset')`, 'J5 step 2: no Reset on Arrange Statistics')
  ui.arrange.reset = await until(async () => (await page('toasts()')).includes('Layout reset'), 12, 250)
  // 3. The monthly report, back a month at a time until a month has a row to tap (12 at most).
  await nav('#/report')
  for (let n = 0; n < 12 && !ui.report.opened; n++) {
    if (!await page(`byLabel('Previous month')`)) break
    await sleep(500)
    if (await page(`has('.hv-report-row')`)) {
      await page(`click('.hv-report-row')`)
      ui.report.opened = await until(() => page(`has('.hv-xd')`), 8, 250)
    }
  }
  await closeSheets()
  // 4. A lift's page from Lifts (never Save on its strength level), then All history.
  await nav('#/lifts')
  const lp = nameOf(UX.LEG_PRESS).toLowerCase()
  await evaluate(cdp, `(() => { const el = document.querySelector('input[aria-label="Search exercises"]'); if (!el) return false; el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(lp)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  const liftSel = `[...document.querySelectorAll('.hv-lift')].find(b => b.getClientRects().length && (b.getAttribute('aria-label') || '').toLowerCase().startsWith(${JSON.stringify(lp)}))`
  if (await until(() => evaluate(cdp, `!!${liftSel}`), 12, 250)) {
    await evaluate(cdp, `${liftSel}.click()`)
    ui.lift.opened = await until(() => page(`has('.hv-xd-page')`), 12, 250)
    ui.lift.last = await page(`has('.hv-xd-last')`)
    ui.lift.reps = await page(`count('.hv-xd-rr')`)
    ui.lift.chart = await page(`has('.hv-xd-chart')`)
    ui.lift.strength = await page(`has('.hv-sl')`)
    pins.lift = { reps: ui.lift.reps, tiles: await page(`count('.hv-xd-tile')`), all: await page(`text('.hv-xd-last .hv-link')`) }
    await must(`click('.hv-xd-last .hv-link')`, 'J5 step 4: no All history on the lift\'s page')
    await until(() => page(`has('.hv-xd-history')`), 12, 250)
    ui.lift.all = await page(`count('.hv-xd-sess')`)
  }
  await closeSheets()
  // 5. The latest workout's detail: its ↑ = ↓ marks each say what they mean (D66).
  await nav('#/history-tab')
  await must(`click('.hv-wcard-t')`, 'J5 step 5: no workout card on History')
  ui.detail.opened = await until(() => page(`has('.hv-wd')`), 12, 250)
  ui.detail.trends = await page(`count('.hv-wd .hv-trend')`)
  ui.detail.named = await evaluate(cdp, `[...document.querySelectorAll('.hv-wd .hv-trend')].filter(e => e.getClientRects().length && (e.getAttribute('aria-label') || '').trim()).length`)
  pins.detail = { name: await page(`text('.hv-wd-t')`), exercises: await page(`count('.hv-wd-ex')`), trends: ui.detail.trends }
  await closeSheets()
  // 6. Calendar: earlier months, and a planned day's sheet (closed untouched).
  await nav('#/calendar')
  await until(() => page(`has('.hv-cal-m')`), 12, 250)
  ui.calendar.before = await page(`count('.hv-cal-m:not(.small)')`)
  await must(`click('.hv-cal-more:not(.next)')`, 'J5 step 6: no Show earlier months')
  await sleep(800)
  ui.calendar.after = await page(`count('.hv-cal-m:not(.small)')`)
  const planned = await evaluate(cdp, `(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)([...document.querySelectorAll('.hv-cal-c')].find(b => (b.getAttribute('aria-label') || '').includes('Planned')))`)
  ui.calendar.planned = planned ? await until(() => page('sheetOpen()'), 8, 250) : null
  await closeSheets()
  await restart()
  S = await readS()
  return { before, after: snapOf(S), layoutDefault: statsDefaults(), ui, pins }
}

async function j6() {
  let S = await readS()
  const before = snapOf(S)
  const ui = { toasts: [] }
  const mid = {}
  // 1. Routines → Rotation: a weekday given one more routine, then the same tap takes it off again.
  await nav('#/routines')
  await must(`byLabel('Rotation, your weekly plan')`, 'J6 step 1: no Rotation chip on the Routines page')
  if (!await until(() => page(`has('.plan-day')`), 12, 250)) throw new Error('J6 step 1: the Rotation page shows no weekday row to change')
  ui.day = await evaluate(cdp, `(b => { b.scrollIntoView({ block: 'center' }); b.click(); return b.getAttribute('data-day') })(document.querySelector('.plan-day'))`)
  await waitSheet(`J6 step 1: day ${ui.day}'s routines`)
  const off = await evaluate(cdp, `[...document.querySelectorAll('[aria-modal="true"] .menu-item[aria-pressed="false"]')].at(0)?.querySelector('.tt')?.textContent.trim() ?? null`)
  if (!off) throw new Error(`J6 step 1: no routine to add to day ${ui.day}`)
  const weekNow = async () => JSON.stringify((await readS()).week?.[ui.day] ?? null)
  const was = await weekNow()
  const toggle = `(b => b ? (b.click(), true) : false)([...document.querySelectorAll('[aria-modal="true"] .menu-item[aria-pressed]')].find(i => i.querySelector('.tt')?.textContent.trim() === ${JSON.stringify(off)}))`
  await mustJs(toggle, `J6 step 1: no ${off} in day ${ui.day}'s sheet`)
  ui.dayChanged = await until(async () => (await weekNow()) !== was, 8, 250)
  await mustJs(toggle, `J6 step 1: no ${off} to take off day ${ui.day}`)
  await until(async () => (await weekNow()) === was, 8, 250)
  await must(`inSheet('button', 'Done')`, `J6 step 1: no Done in day ${ui.day}'s sheet`)
  // 2. A new folder, a routine made in it from the folder's ⋯, three exercises, a superset, a warm-up.
  await nav('#/routines')
  await must(`click('.hv-chip', '+ Folder')`, 'J6 step 2: no + Folder chip')
  await waitSheet('J6 step 2: the New Folder sheet')
  await must(`sheetType(${JSON.stringify(UX.FOLDER)})`, 'J6 step 2: no name field in the New Folder sheet')
  await must(`inSheet('button', 'Create')`, 'J6 step 2: no Create in the New Folder sheet')
  ui.folderMade = await until(() => page(`hasLabel(${JSON.stringify('More, ' + UX.FOLDER)})`), 8, 250)
  await must(`byLabel(${JSON.stringify('More, ' + UX.FOLDER)})`, `J6 step 2: no ⋯ on the folder ${UX.FOLDER}`)
  await waitSheet('J6 step 2: the folder\'s menu')
  await must(`menu('New Routine')`, 'J6 step 2: no New Routine in the folder\'s menu')
  if (!await until(async () => /^#\/plan\/r\/[^/]+$/.test(await page('hash()')), 12, 250)) throw new Error('J6 step 2: New Routine opened no editor')
  const rid = decodeURIComponent((await page('hash()')).split('/').pop())
  const routineNow = async () => (await readS()).routines.find(x => x.id === rid)
  await evaluate(cdp, `(el => { el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(UX.ROUTINE_NAME)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); return true })(document.querySelector('.hv-rtitle'))`)
  await must(`click('.hv-routine .hv-addex')`, 'J6 step 2: no Add Exercise in the editor')
  await pickExercises(UX.NEW_ROUTINE, 'J6 step 2')
  if (!await until(async () => (await routineNow())?.ex.length === 3, 12, 250)) throw new Error(`J6 step 2: the routine holds ${JSON.stringify((await routineNow())?.ex.map(x => x.id))}, not three exercises`)
  const more = n => mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)(document.querySelectorAll('.hv-routine .hv-ex')[${n}]?.querySelector('.hv-more'))`, `J6: no ⋮ on exercise ${n + 1}`)
  await more(1)
  await waitSheet('J6 step 2: exercise 2\'s menu')
  await must(`menu('Make superset with previous')`, 'J6 step 2: no Make superset with previous on exercise 2')
  await sleep(600)
  await mustJs(`(b => b ? (b.scrollIntoView({ block: 'center' }), b.click(), true) : false)(document.querySelectorAll('.hv-routine .hv-ex')[0]?.querySelector('.hv-addwarm'))`, 'J6 step 2: no + Warm-up on exercise 1')
  await sleep(600)
  // A rep range shows only with progression on (D69), and a new routine has it off: not set here.
  let r = await routineNow()
  mid.orderBefore = r.ex.map(x => x.id)
  await more(2)
  await waitSheet('J6 step 2: exercise 3\'s menu')
  await must(`menu('Move up')`, 'J6 step 2: no Move up on exercise 3')
  await sleep(600)
  r = await routineNow()
  mid.orderAfter = r.ex.map(x => x.id)
  mid.ex = [...mid.orderAfter].sort()
  const first = r.ex.find(x => x.id === UX.NEW_ROUTINE[0])
  const second = r.ex.find(x => x.id === UX.NEW_ROUTINE[1])
  mid.linked = !!first?.sg && first.sg === second?.sg
  mid.warmups = Number(first?.warmupSets || 0) + (Array.isArray(first?.warmupRows) ? first.warmupRows.length : 0)
  // 3. ⋯ → Backups on the first exercise: one added, marked missing at a gym, the mark taken back.
  const at = r.ex.findIndex(x => x.id === UX.NEW_ROUTINE[0])
  await more(at)
  await waitSheet('J6 step 3: the exercise\'s menu')
  await must(`menu('Backups')`, 'J6 step 3: no Backups in the exercise\'s menu')
  await waitSheet('J6 step 3: the Backups sheet')
  await must(`inSheet('button', 'Add a backup')`, 'J6 step 3: no Add a backup')
  await pickExercises([UX.BACKUP], 'J6 step 3')
  r = await routineNow()
  mid.backup = (r.ex[at]?.subs || []).join(',') || null
  const gym = (S.equipProfiles || []).find(p => p?.id != null)
  const chip = `${nameOf(UX.BACKUP)}: available at ${gym?.name}`
  const missing = async () => ((await readS()).hvGymMissing?.[UX.BACKUP] || []).includes(gym?.id)
  if (gym && await page(`byLabel(${JSON.stringify(chip)})`)) {
    mid.missingMarked = await until(missing, 8, 250)
    await page(`byLabel(${JSON.stringify(chip)})`)
    mid.missingCleared = await until(async () => !await missing(), 8, 250)
  } else throw new Error(`J6 step 3: no "${chip}" chip in the Backups sheet`)
  await closeSheets()
  // 4. The routine deleted from the editor's ⋯, then the folder from its ⋯ if it is still listed.
  await must(`byLabel(${JSON.stringify('More, ' + (r.name || UX.ROUTINE_NAME))})`, 'J6 step 4: no ⋯ in the editor\'s bar')
  await waitSheet('J6 step 4: the routine\'s menu')
  await must(`menu('Delete routine')`, 'J6 step 4: no Delete routine')
  await until(async () => !(await routineNow()), 8, 250)
  ui.toasts.push(...await page('toasts()'))
  await nav('#/routines')
  if (await until(() => page(`hasLabel(${JSON.stringify('More, ' + UX.FOLDER)})`), 4, 250)) {
    await must(`byLabel(${JSON.stringify('More, ' + UX.FOLDER)})`, 'J6 step 4: no ⋯ on the folder')
    await waitSheet('J6 step 4: the folder\'s menu')
    await must(`menu('Delete Folder')`, 'J6 step 4: no Delete Folder')
    await sleep(400)
    ui.toasts.push(...await page('toasts()'))
  }
  await restart()
  S = await readS()
  return { before, after: snapOf(S), mid, ui }
}

/** J7: J1 at font_scale 2.0 (A6, G7), with the AX names read mid-workout; the scale back at 1.0 in every case. */
async function j7() {
  const out = { font: {} }
  try {
    shell('settings', 'put', 'system', 'font_scale', '2.0')
    await restart()
    out.font.during = shell('settings', 'get', 'system', 'font_scale')
    const run = await j1({ during: async () => { out.ax = await page('ax(0)') } })
    Object.assign(out, run, { font: out.font, ax: out.ax })
  } finally {
    try { shell('settings', 'put', 'system', 'font_scale', '1.0'); out.font.after = shell('settings', 'get', 'system', 'font_scale') } catch (e) { out.font.after = 'not set: ' + e.message }
  }
  return out
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

const RUNS = { J1: () => j1(), J2: j2, J3: j3, J4: j4, J5: j5, J6: j6, J7: j7, J8: j8, J8b: j8b }

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
    if (cmd !== 'run' || !RUNS[J] || !out) fail('usage: journey-check.mjs run <J1..J7|J8|J8b> <out.json> [--base <baseline.json>] | import <backup.json>')
    const base = baseAt > 0 ? JSON.parse(readFileSync(args[baseAt + 1], 'utf8')) : null
    await open()
    if ((await readS()).active) fail('a workout is in progress: finish or discard it first')
    let run
    try { run = await RUNS[J]() } catch (e) {
      // Said first: the page may be gone, and the clean-up below must not swallow why.
      console.error(`journey-check: ${J}: ${e.message}`)
      throw e
    } finally {
      // A throw mid-journey leaves the workout running; the profile is restored next anyway.
      try { await Promise.race([evaluate(cdp, withStore('if (st.S.active) st.update(s => { s.active = null })')), sleep(3000)]) } catch {}
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
