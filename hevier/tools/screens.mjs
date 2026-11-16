#!/usr/bin/env node
// UI check across Android screen sizes: resizes the running emulator's display to each phone
// profile (`wm size` / `wm density` / font scale, no extra AVDs), restarts the app, visits each
// screen, takes a screenshot and checks the layout. Exits 1 on a finding; a note (a tap target
// under 24 px, text cut with an ellipsis) is listed but does not fail.
//
//   node hevier/tools/screens.mjs --out <dir>                    # every run, every screen
//   node hevier/tools/screens.mjs --out <dir> --only small,fold  # some runs
//   node hevier/tools/screens.mjs --out <dir> --screens /home,/workout --no-workout
//   node hevier/tools/screens.mjs --out <dir> --sizes --colours  # and the size and colour ledgers
//   node hevier/tools/screens.mjs --out <after> --sizes --colours --compare <before>   # and the diff
//   node hevier/tools/screens.mjs --compare <before> <after>     # two finished runs, no emulator
//   node hevier/tools/screens.mjs --list
//
// Needs the debug APK installed and the emulator running (emulator.sh). The display is put back
// (`wm size reset`, `wm density reset`, font scale 1) at the end, also after an error; a run in lb
// or Arabic puts the profile's unit and language back as it ends.
// <dir>/report.md lists the findings; <dir>/<run>/<screen>.png are the screenshots; results.json
// holds the findings, sizes.json and colours.json the ledgers (keyed "<run> <screen>", then by
// selector path); compare.md lists every change from <before>, by screen (exit 1 on any change).
// The live workout is a fixture (screens-lib.mjs), started through the app's store and discarded.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { connect, evaluate, screenshot } from './cdp.mjs'
import { compareMarkdown, diffFindings, diffLedgers, fixtureActive, ledgerJs } from './screens-lib.mjs'

const ADB = process.env.ADB || homedir() + '/Android/Sdk/platform-tools/adb'
const APP_ID = process.env.APP_ID || 'ch.duartesantos.opengym.hevier.test'
const ACTIVITY = APP_ID + '/ch.duartesantos.opengym.MainActivity'

// Real phones' panels (px) and densities, portrait (D24). dp = px × 160 / dpi.
const PROFILES = [
  { name: 'xperia1vi', size: '1080x2340', dpi: 420, note: 'Xperia 1 VI, 19.5:9, 411×891 dp (the AVD itself)' },
  { name: 'small', size: '720x1280', dpi: 320, note: 'budget 16:9, 360×640 dp' },
  { name: 'narrow', size: '640x1136', dpi: 320, note: '320×568 dp, the narrowest still sold' },
  { name: 'pixel', size: '1080x2400', dpi: 420, note: 'Pixel 8 class, 20:9, 411×914 dp' },
  { name: 'tall', size: '1080x2520', dpi: 440, note: 'Xperia 5 class, 21:9, 393×916 dp' },
  { name: 'large', size: '1440x3120', dpi: 560, note: 'Pixel 7 Pro class, 411×891 dp at a high density' },
  { name: 'fold', size: '1812x2176', dpi: 420, note: 'foldable inner screen, about 5:6, 690×829 dp' },
  { name: 'bigfont', size: '1080x2340', dpi: 420, font: 1.3, note: 'Xperia 1 VI with the font at 130%' },
]
// The same displays with the weights in lb and in Arabic (right to left), where text is widest.
const variant = (base, name, extra) => ({ ...PROFILES.find(p => p.name === base), name, ...extra })
PROFILES.push(
  variant('narrow', 'narrow-lb', { unit: 'lb', note: 'narrow, weights in lb' }),
  variant('bigfont', 'bigfont-lb', { unit: 'lb', note: 'bigfont, weights in lb' }),
  variant('narrow', 'narrow-ar', { lang: 'ar', note: 'narrow, in Arabic (right to left)' }),
  variant('bigfont', 'bigfont-ar', { lang: 'ar', note: 'bigfont, in Arabic (right to left)' }),
)
const SCREENS = ['/home', '/workout', '/routines', '/lifts', '/history-tab', '/stats', '/calendar', '/report', '/measures', '/library', '/settings',
  '/strength', '/exercise-time', '/lift-trends', '/stats/all', '/settings/modules/hvStats']

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
if (args.includes('--list')) {
  for (const p of PROFILES) console.log(p.name.padEnd(10), p.size.padEnd(10), String(p.dpi).padEnd(4), p.note)
  process.exit(0)
}
const BEFORE = opt('--compare')
const load = file => JSON.parse(readFileSync(file, 'utf8'))
// The ledgers and findings of two runs, compared; compare.md is written into the second.
function compare(before, after) {
  const pair = f => (existsSync(before + '/' + f) && existsSync(after + '/' + f) ? [load(before + '/' + f), load(after + '/' + f)] : null)
  const sz = pair('sizes.json'), col = pair('colours.json'), res = pair('results.json')
  const diff = {
    sizes: sz ? diffLedgers(...sz, { tolerance: 0.5 }) : [],
    colours: col ? diffLedgers(...col) : [],
    findings: res ? diffFindings(...res) : [],
  }
  writeFileSync(after + '/compare.md', compareMarkdown(diff))
  const skipped = [!sz && 'sizes', !col && 'colours', !res && 'findings'].filter(Boolean)
  console.log(`compare with ${before}: ${diff.sizes.length} size, ${diff.colours.length} colour, ${diff.findings.length} finding change(s)` +
    (skipped.length ? ` (not in both runs: ${skipped.join(', ')})` : '') + `; ${after}/compare.md`)
  return diff.sizes.length + diff.colours.length + diff.findings.length ? 1 : 0
}
if (BEFORE && !opt('--out')) {
  const after = args[args.indexOf('--compare') + 2]
  if (!after) { console.error('usage: screens.mjs --compare <beforeDir> <afterDir>'); process.exit(2) }
  process.exit(compare(BEFORE, after))
}
const OUT = opt('--out')
if (!OUT) { console.error('usage: screens.mjs --out <dir> [--only a,b] [--screens /a,/b] [--no-workout] [--sizes] [--colours] [--compare <beforeDir>] | --compare <beforeDir> <afterDir> | --list'); process.exit(2) }
const withSizes = args.includes('--sizes'), withColours = args.includes('--colours')
const only = opt('--only')?.split(',')
const profiles = only ? PROFILES.filter(p => only.includes(p.name)) : PROFILES
const screens = opt('--screens')?.split(',') || SCREENS
const withWorkout = !args.includes('--no-workout')
if (!profiles.length) { console.error('no such profile; --list shows them'); process.exit(2) }

const adb = (...a) => execFileSync(ADB, ['shell', ...a]).toString().trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))

// The app's store, as App.jsx's useStore() holds it: found through React's fibers from #root, since
// the bundle exposes nothing. Its actions (update, setUnit) are the app's own, so a change goes
// through the same stamps and saves as a tap. `body` runs with it as `st`.
const withStore = body => `(() => {
  const root = document.getElementById('root')
  const key = root && Object.keys(root).find(k => k.startsWith('__reactContainer$'))
  const stack = key ? [root[key].stateNode?.current || root[key]] : []
  let st = null
  while (stack.length && !st) {
    const f = stack.pop()
    for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h && !st; h = h.next) {
      const v = h.memoizedState
      if (v && typeof v === 'object' && v.S && typeof v.update === 'function' && typeof v.setUnit === 'function') st = v
    }
    if (f.sibling) stack.push(f.sibling)
    if (f.child) stack.push(f.child)
  }
  if (!st) throw new Error('the app store was not found')
  ${body}
})()`
const until = async (cdp, js, tries = 20) => { for (let i = 0; i < tries; i++) { if (await evaluate(cdp, js)) return true; await sleep(250) } return false }
// The first element on the page matching `sel`, clicked. Classes, not words, so it works in Arabic.
const clickSel = (sel, n = 0) => `(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.getClientRects().length)[${n}]
  if (!el) return false
  el.scrollIntoView({ block: 'center' }); el.click(); return true
})()`
// A swipe action's button sits under its row (inert until swiped): its React onClick is called.
const pressLast = sel => `(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(sel)})].at(-1)
  const k = el && Object.keys(el).find(k => k.startsWith('__reactProps$'))
  if (!k || typeof el[k].onClick !== 'function') return false
  el[k].onClick({ preventDefault() {}, stopPropagation() {} }); return true
})()`
const ESCAPE = "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))"
const hasActive = withStore('return !!st.S.active')

function setDisplay(p) {
  adb('wm', 'size', p.size)
  adb('wm', 'density', String(p.dpi))
  adb('settings', 'put', 'system', 'font_scale', String(p.font || 1))
}
function resetDisplay() {
  try { adb('wm', 'size', 'reset'); adb('wm', 'density', 'reset'); adb('settings', 'put', 'system', 'font_scale', '1') } catch {}
}

// The app restarted, so the WebView reads the new size; resolves once the page has rendered.
async function launch() {
  adb('am', 'force-stop', APP_ID)
  adb('am', 'start', '-W', '-n', ACTIVITY)
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try {
      const cdp = await connect()
      if (await evaluate(cdp, "document.readyState === 'complete' && !!document.querySelector('#root > *')")) return cdp
      cdp.close()
    } catch {}
  }
  throw new Error('the app did not come up')
}

// Layout checks, run in the page. Each finding names the element by its text.
const CHECK = `(() => {
  const W = innerWidth, H = innerHeight, out = []
  const name = el => ((el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 40)) || el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')
  const shown = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity !== 0 && el.getClientRects().length > 0 }
  // Inside a box that scrolls or clips sideways (a chip row, a carousel), or moved by a transform
  // (a sheet sliding in): going past the edge there is by design.
  const contained = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (s.overflowX !== 'visible' || s.transform !== 'none') return true
    }
    return false
  }
  // A fixed or sticky bar (the tabs, the open workout's bar) floats over the page as it scrolls,
  // and an element painted over by another (a set row's swipe actions) is not seen: neither is
  // something the user meets. The middle of the element's on-screen part is tested (a swipe action
  // half past the edge is still under its row); one wholly off the screen counts as seen.
  const layer = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return p } return null }
  const onTop = (el, r) => {
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, W), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, H)
    if (x1 - x0 < 1 || y1 - y0 < 1) return true
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2
    const t = document.elementFromPoint(x, y); return !!t && (el.contains(t) || t.contains(el))
  }
  const se = document.scrollingElement
  if (se.scrollWidth > W + 1) out.push({ check: 'page scrolls sideways', detail: (se.scrollWidth - W) + ' px too wide' })
  const all = [...document.querySelectorAll('body *')].filter(shown)
  const off = new Set()
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || r.bottom < 0) continue
    if ((r.right > W + 1 || r.left < -1) && !contained(el) && onTop(el, r)) off.add(el)
  }
  for (const el of off) if (!off.has(el.parentElement)) {
    const r = el.getBoundingClientRect()
    out.push({ check: 'past the screen edge', el: name(el), detail: 'x ' + Math.round(r.left) + '…' + Math.round(r.right) + ' of ' + W })
  }
  const controls = all.filter(el => el.matches('button, a, [role=button], input, select, label, h1, h2, h3, .chip'))
  for (const el of controls) {
    const s = getComputedStyle(el)
    if (el.scrollWidth > el.clientWidth + 1 && s.overflowX !== 'visible' && s.textOverflow !== 'ellipsis' && !el.matches('input, select'))
      out.push({ check: 'text cut off', el: name(el), detail: el.scrollWidth + ' px of text in ' + el.clientWidth })
  }
  // Cut by design, so a note, kept to compare one run with another.
  for (const el of all) {
    const s = getComputedStyle(el)
    const line = s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1
    const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1
    if (line || clamp) out.push({ note: true, check: 'text cut with an ellipsis', el: name(el), detail: line ? el.scrollWidth + ' px of text in ' + el.clientWidth : el.scrollHeight + ' px of lines in ' + el.clientHeight })
  }
  const taps = controls.filter(el => el.matches('button, a, [role=button], input, select'))
    .map(el => [el, el.getBoundingClientRect()]).filter(([el, r]) => r.width && r.height && r.bottom > 0 && r.top < H && onTop(el, r))
  for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
    const [a, ra] = taps[i], [b, rb] = taps[j]
    if (a.contains(b) || b.contains(a) || layer(a) !== layer(b)) continue
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
    if (w > 4 && h > 4) out.push({ check: 'controls overlap', el: name(a) + ' × ' + name(b), detail: Math.round(w) + '×' + Math.round(h) + ' px' })
  }
  for (const [el, r] of taps) if (r.width < 24 || r.height < 24)
    out.push({ note: true, check: 'tap target under 24 px', el: name(el), detail: Math.round(r.width) + '×' + Math.round(r.height) + ' px' })
  return { size: W + '×' + H, out }
})()`

const sizes = {}, colours = {}
async function visit(cdp, label, dir, results, run) {
  await sleep(1200)
  const { size, out } = await evaluate(cdp, CHECK)
  label = label.replace(/\/plan\/r\/[^/]+/, '/routine')
  const file = dir + '/' + label.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') + '.png'
  await screenshot(cdp, file)
  results.push({ screen: label, size, file, out })
  if (withSizes) sizes[run + ' ' + label] = await evaluate(cdp, ledgerJs('sizes'))
  if (withColours) colours[run + ' ' + label] = await evaluate(cdp, ledgerJs('colours'))
  const fails = out.filter(f => !f.note).length, notes = out.length - fails
  console.log(`  ${label.padEnd(16)} ${size.padEnd(9)} ${fails ? fails + ' finding(s)' : 'ok'}${notes ? ', ' + notes + ' note(s)' : ''}`)
}

// A unit or language for this run, through the store, and what it replaced, read first so it is
// put back even when applying fails. The unit is relabelled, not converted (convert: false), so no
// stored weight is rounded on the way back.
const READ_PREFS = withStore('return { unit: st.S.unit || "kg", lang: st.S.lang ?? null, langAuto: st.S.langAuto ?? null }')
async function applyPrefs(cdp, p) {
  if (p.unit) await evaluate(cdp, withStore(`st.setUnit(${JSON.stringify(p.unit)}, { convert: false })`))
  if (p.lang) {
    await evaluate(cdp, withStore(`st.update(s => { s.lang = ${JSON.stringify(p.lang)}; s.langAuto = false })`))
    if (!await until(cdp, `document.documentElement.lang === ${JSON.stringify(p.lang)}`)) throw new Error('the language did not change to ' + p.lang)
    await sleep(800)
  }
}
async function restorePrefs(cdp, was) {
  await evaluate(cdp, withStore(`
    st.setUnit(${JSON.stringify(was.unit)}, { convert: false })
    st.update(s => {
      if (${JSON.stringify(was.lang)} === null) delete s.lang; else s.lang = ${JSON.stringify(was.lang)}
      if (${JSON.stringify(was.langAuto)} === null) delete s.langAuto; else s.langAuto = ${JSON.stringify(was.langAuto)}
    })`))
  await sleep(1500)   // the file mirror is written 800 ms after a change, and the next run force-stops the app
}

// Each step: open something, visit it, close it. A step that finds nothing to open says so.
async function step(cdp, results, screen, open, show, close = ESCAPE, note = false) {
  if (!await evaluate(cdp, open)) { results.push({ screen, out: [{ note, check: 'flow', detail: 'nothing to open it with' }] }); return }
  await show()
  if (close) { await evaluate(cdp, close); await sleep(600) }
}

// From Today: the last workout's Workout Detail and, from it, Exercise Details.
async function homeExtras(cdp, dir, results, run) {
  await evaluate(cdp, "location.hash = '#/home'")
  await sleep(1000)
  await evaluate(cdp, 'scrollTo(0, 0)')
  await step(cdp, results, 'workout detail', clickSel('.hv-tlast'), async () => {
    await until(cdp, "location.hash.startsWith('#/workout-detail')")
    await visit(cdp, 'workout detail', dir, results, run)
    await step(cdp, results, 'sheet: exercise details', clickSel('.hv-wd-ex .hv-name'), () => visit(cdp, 'sheet: exercise details', dir, results, run))
  }, "location.hash = '#/home'")
}

// The live workout: the fixture, its sheets, a toast, Save Workout and Discard's dialog, then
// discarded, so the data stays as it was.
async function liveWorkout(cdp, dir, results, run) {
  if (await evaluate(cdp, hasActive)) {
    // With a workout open, /workout is that workout (checked above; the Workout tab's hub is
    // /routines, D13); the open workout is left as it is.
    results.push({ screen: 'live workout', out: [{ note: true, check: 'flow', detail: 'a workout is open on the emulator, so the fixture was not started (the open one was checked on /workout)' }] })
    return
  }
  const A = fixtureActive({ start: 0, d: '' })
  await evaluate(cdp, withStore(`
    const now = Date.now(), A = ${JSON.stringify(A)}
    A.start = now; A.id = 'hv-screens-' + now
    A.d = new Date(now - new Date(now).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    st.update(s => { s.active = A })`))
  await evaluate(cdp, "location.hash = '#/workout'")
  if (!await until(cdp, "!!document.querySelector('.hv-ex')", 40)) {
    results.push({ screen: 'live workout', out: [{ check: 'flow', detail: 'the fixture workout did not open' }] })
  } else {
    await visit(cdp, 'live workout', dir, results, run)
    await evaluate(cdp, "document.querySelectorAll('.hv-ex')[document.querySelectorAll('.hv-ex').length - 1].scrollIntoView({ block: 'start' })")
    await visit(cdp, 'live workout, end', dir, results, run)
    await evaluate(cdp, 'scrollTo(0, 0)')
    await step(cdp, results, 'sheet: set type', clickSel('.hv-ex .hv-set'), () => visit(cdp, 'sheet: set type', dir, results, run))
    await step(cdp, results, 'sheet: rest timer', clickSel('.hv-ex .hv-acts button[aria-label^="Rest"]'), () => visit(cdp, 'sheet: rest timer', dir, results, run))
    await step(cdp, results, 'sheet: exercise details (live)', clickSel('.hv-ex .hv-name'), () => visit(cdp, 'sheet: exercise details (live)', dir, results, run))
    await step(cdp, results, 'sheet: exercise picker', clickSel('.hv-addex'), () => visit(cdp, 'sheet: exercise picker', dir, results, run))
    // The last set's Delete: its toast, with Undo. The fixture goes anyway.
    await step(cdp, results, 'toast', pressLast('.hv-ex .swpane.del button'), () => visit(cdp, 'toast', dir, results, run), null, true)
    await step(cdp, results, 'sheet: finish', clickSel('.hv-finish'), () => visit(cdp, 'sheet: finish', dir, results, run))
    await sleep(800)
    await step(cdp, results, 'dialog: discard', clickSel('.hv-foot .hv-danger'), async () => {
      await visit(cdp, 'dialog: discard', dir, results, run)
      await evaluate(cdp, clickSel('#modal-root [role=dialog] .btn.danger'))
    }, null)
    await sleep(800)
  }
  if (await evaluate(cdp, hasActive)) {
    // The dialog did not end it: the store does, as the tab bar's discard does.
    await evaluate(cdp, withStore('st.update(s => { s.active = null })'))
    results.push({ screen: 'live workout', out: [{ check: 'flow', detail: 'Discard did not end the fixture workout; the store ended it' }] })
  }
}

const report = []
try {
  for (const p of profiles) {
    console.log(`${p.name}: ${p.size} @ ${p.dpi} dpi${p.font ? ', font ' + p.font : ''} (${p.note})`)
    setDisplay(p)
    let cdp = await launch()
    const dir = OUT + '/' + p.name
    mkdirSync(dir, { recursive: true })
    const results = []
    let was = null
    try {
      if (p.unit || p.lang) { was = await evaluate(cdp, READ_PREFS); await applyPrefs(cdp, p) }
      // A routine's page and its editor, for the first routine on the device.
      const rid = await evaluate(cdp, "(() => { try { return JSON.parse(localStorage.gym_state_v1).routines[0].id } catch { return null } })()")
      const all = rid && !opt('--screens') ? [...screens, `/plan/r/${rid}/view`, `/plan/r/${rid}`] : screens
      for (const s of all) {
        await evaluate(cdp, `location.hash = ${JSON.stringify('#' + s)}`)
        await visit(cdp, s, dir, results, p.name)
      }
      if (!opt('--screens')) await homeExtras(cdp, dir, results, p.name)
      if (withWorkout) await liveWorkout(cdp, dir, results, p.name)
    } finally {
      if (was) {
        try { await restorePrefs(cdp, was) } catch {
          try { cdp.close(); cdp = await connect(); await restorePrefs(cdp, was) } catch (e) {
            console.error(`could not put the profile back: set the unit to ${was.unit} and the language to ${was.lang ?? 'automatic'} by hand (${e.message})`)
          }
        }
      }
      cdp.close()
    }
    report.push({ profile: p, results })
  }
} finally { resetDisplay() }

let md = '# Screen check\n\n', total = 0
for (const { profile: p, results } of report) {
  const n = results.reduce((a, r) => a + r.out.filter(f => !f.note).length, 0); total += n
  md += `## ${p.name} — ${p.size} @ ${p.dpi} dpi${p.font ? ', font ' + p.font : ''}: ${n ? n + ' finding(s)' : 'ok'}\n\n${p.note}\n\n`
  for (const r of results) {
    if (!r.out.length) continue
    md += `### ${r.screen}${r.size ? ' (' + r.size + ' CSS px)' : ''}${r.file ? ' — ' + r.file : ''}\n\n`
    for (const f of r.out) md += `- ${f.note ? 'note: ' : ''}**${f.check}**${f.el ? ': ' + f.el : ''}${f.detail ? ' (' + f.detail + ')' : ''}\n`
    md += '\n'
  }
}
writeFileSync(OUT + '/report.md', md)
const json = v => JSON.stringify(v, null, 1) + '\n'
writeFileSync(OUT + '/results.json', json(report.flatMap(({ profile: p, results }) => results.map(r => ({ ...r, screen: p.name + ' ' + r.screen })))))
if (withSizes) writeFileSync(OUT + '/sizes.json', json(sizes))
if (withColours) writeFileSync(OUT + '/colours.json', json(colours))
console.log(`\n${total ? total + ' finding(s)' : 'no findings'}; report: ${OUT}/report.md`)
process.exitCode = (total ? 1 : 0) | (BEFORE ? compare(BEFORE, OUT) : 0)
