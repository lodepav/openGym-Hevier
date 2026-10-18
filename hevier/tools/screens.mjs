#!/usr/bin/env node
// UI check across Android screen sizes: resizes the running emulator's display to each phone
// profile (`wm size` / `wm density` / font scale, no extra AVDs), restarts the app, visits each
// screen, takes a screenshot and checks the layout. Exits 1 on a finding; a note (a tap target
// under 24 px) is listed but does not fail.
//
//   node hevier/tools/screens.mjs --out <dir>                    # every profile, every screen
//   node hevier/tools/screens.mjs --out <dir> --only small,fold  # some profiles
//   node hevier/tools/screens.mjs --out <dir> --screens /home,/workout --no-workout
//   node hevier/tools/screens.mjs --list
//
// Needs the debug APK installed and the emulator running (emulator.sh). The display is put back
// (`wm size reset`, `wm density reset`, font scale 1) at the end, also after an error.
// <dir>/report.md lists the findings; <dir>/<profile>/<screen>.png are the screenshots.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { connect, evaluate, clickJs } from './cdp.mjs'

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
const SCREENS = ['/home', '/workout', '/routines', '/profile', '/stats', '/calendar', '/report', '/measures', '/library', '/settings']

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
if (args.includes('--list')) {
  for (const p of PROFILES) console.log(p.name.padEnd(10), p.size.padEnd(10), String(p.dpi).padEnd(4), p.note)
  process.exit(0)
}
const OUT = opt('--out')
if (!OUT) { console.error('usage: screens.mjs --out <dir> [--only a,b] [--screens /a,/b] [--no-workout] | --list'); process.exit(2) }
const only = opt('--only')?.split(',')
const profiles = only ? PROFILES.filter(p => only.includes(p.name)) : PROFILES
const screens = opt('--screens')?.split(',') || SCREENS
const withWorkout = !args.includes('--no-workout')
if (!profiles.length) { console.error('no such profile; --list shows them'); process.exit(2) }

const adb = (...a) => execFileSync(ADB, ['shell', ...a]).toString().trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))

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

async function visit(cdp, label, dir, results) {
  await sleep(1200)
  const { size, out } = await evaluate(cdp, CHECK)
  label = label.replace(/\/plan\/r\/[^/]+/, '/routine')
  const file = dir + '/' + label.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') + '.png'
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(file, Buffer.from(data, 'base64'))
  results.push({ screen: label, size, file, out })
  const fails = out.filter(f => !f.note).length, notes = out.length - fails
  console.log(`  ${label.padEnd(16)} ${size.padEnd(9)} ${fails ? fails + ' finding(s)' : 'ok'}${notes ? ', ' + notes + ' note(s)' : ''}`)
}

const report = []
try {
  for (const p of profiles) {
    console.log(`${p.name}: ${p.size} @ ${p.dpi} dpi${p.font ? ', font ' + p.font : ''} (${p.note})`)
    setDisplay(p)
    const cdp = await launch()
    const dir = OUT + '/' + p.name
    mkdirSync(dir, { recursive: true })
    const results = []
    try {
      // A routine's page and its editor, for the first routine on the device.
      const rid = await evaluate(cdp, "(() => { try { return JSON.parse(localStorage.gym_state_v1).routines[0].id } catch { return null } })()")
      const all = rid && !opt('--screens') ? [...screens, `/plan/r/${rid}/view`, `/plan/r/${rid}`] : screens
      for (const s of all) {
        await evaluate(cdp, `location.hash = ${JSON.stringify('#' + s)}`)
        await visit(cdp, s, dir, results)
      }
      // The live workout: an empty one, discarded afterwards, so the data stays as it was.
      if (withWorkout) {
        await evaluate(cdp, "location.hash = '#/workout'")
        await sleep(800)
        // With a workout open, /workout is that workout (checked above; the Workout tab's hub is
        // /routines, D13); the open workout is left as it is.
        const open = await evaluate(cdp, "!!document.body.innerText.match(/Discard Workout/)")
        if (open) results.push({ screen: 'live workout', out: [{ note: true, check: 'flow', detail: 'a workout is open on the emulator, so /workout showed it (the Workout tab was checked on /routines)' }] })
        else if ((await evaluate(cdp, clickJs('Start Empty Workout'))).startsWith('NOT FOUND'))
          results.push({ screen: 'live workout', out: [{ check: 'flow', detail: 'no Start Empty Workout button' }] })
        else {
          await visit(cdp, 'live-workout', dir, results)
          await evaluate(cdp, clickJs('Discard Workout'))
          await sleep(600)
          await evaluate(cdp, clickJs('Discard'))   // the confirmation
          await sleep(600)
          if (await evaluate(cdp, "location.hash.startsWith('#/workout') && !!document.body.innerText.match(/Discard Workout/)"))
            results.push({ screen: 'live workout', out: [{ check: 'flow', detail: 'the workout was not discarded: discard it by hand' }] })
        }
      }
    } finally { cdp.close() }
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
console.log(`\n${total ? total + ' finding(s)' : 'no findings'}; report: ${OUT}/report.md`)
process.exitCode = total ? 1 : 0
