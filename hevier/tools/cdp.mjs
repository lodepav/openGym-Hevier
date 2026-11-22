#!/usr/bin/env node
// Drives the openGym WebView on a running emulator/device over the Chrome DevTools Protocol.
// Zero dependencies (Node 22's built-in WebSocket); needs a *debug* APK (WebView debugging on).
//
//   node hevier/tools/cdp.mjs eval "document.title"
//   node hevier/tools/cdp.mjs click "Use on this device"     # first button/link whose text matches
//   node hevier/tools/cdp.mjs text                           # visible text of the page
//   node hevier/tools/cdp.mjs shot out.png                   # screenshot of the WebView
//   node hevier/tools/cdp.mjs reload | nav "#/workout"
//
// Env: ANDROID_SERIAL (required: an emulator this repo booted, ~/.claude/bin/emu), ADB (default
// ~/Android/Sdk/platform-tools/adb), APP_ID (default ch.duartesantos.opengym.hevier.test), CDP_PORT
// (default 9223 + (console port - 5554) / 2: 9223 for emulator-5554, 9224 for emulator-5556).
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ADB = process.env.ADB || homedir() + '/Android/Sdk/platform-tools/adb'
const APP_ID = process.env.APP_ID || 'ch.duartesantos.opengym.hevier.test'
const ROOT = fileURLToPath(new URL('../..', import.meta.url))

// The emulator a run drives: never whatever plain adb picks, and each its own local port, so runs
// on two emulators keep their CDP connections apart. Checked when first needed, not on import.
let dev = null
export function device() {
  if (dev) return dev
  const serial = process.env.ANDROID_SERIAL
  const stop = msg => { console.error(msg); process.exit(2) }
  if (!serial) stop('set ANDROID_SERIAL to an emulator this repo booted (~/.claude/bin/emu list)')
  try { execFileSync(homedir() + '/.claude/bin/emu', ['mine', serial], { cwd: ROOT, stdio: 'ignore' }) }
  catch { stop(`${serial} was not booted from this repo (~/.claude/bin/emu list)`) }
  const m = /^emulator-(\d+)$/.exec(serial)
  if (!m) stop(`${serial} is not an emulator serial (emulator-<port>)`)
  dev = { serial, port: process.env.CDP_PORT || String(9223 + (Number(m[1]) - 5554) / 2) }
  return dev
}

function forward() {
  const { port } = device()
  const pid = execFileSync(ADB, ['shell', 'pidof', APP_ID]).toString().trim().split(/\s+/)[0]
  if (!pid) throw new Error(APP_ID + ' is not running')
  execFileSync(ADB, ['forward', 'tcp:' + port, 'localabstract:webview_devtools_remote_' + pid])
}

export async function connect() {
  forward()
  const pages = await (await fetch(`http://127.0.0.1:${device().port}/json/list`)).json()
  const page = pages.find(p => p.type === 'page')
  if (!page) throw new Error('no WebView page found')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id
    pending.set(n, m => m.error ? fail(new Error(m.error.message)) : ok(m.result))
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  return { send, close: () => ws.close() }
}

export async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}

// A PNG of the screen. The WebView's own capture first; a headless emulator never answers it (no
// compositor frame), so after 5 s it is the device's screencap instead (status and nav bars
// included), and that for the rest of the run.
let screencap = false
export async function screenshot(cdp, file) {
  if (!screencap) {
    const shot = cdp.send('Page.captureScreenshot', { format: 'png' })
    const r = await Promise.race([shot, new Promise(ok => setTimeout(ok, 5000, null))])
    if (r) return writeFileSync(file, Buffer.from(r.data, 'base64'))
    screencap = true
  }
  writeFileSync(file, execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }))
}

// The app's store, as App.jsx's useStore() holds it: found through React's fibers from #root, since
// the bundle exposes nothing. Its actions (update, setUnit) are the app's own, so a change goes
// through the same stamps and saves as a tap. `body` runs with it as `st`.
export const withStore = body => `(() => {
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

// Clicks the smallest visible element whose own text matches (buttons/links preferred).
export const clickJs = needle => `(() => {
  const want = ${JSON.stringify(needle)}.toLowerCase()
  const els = [...document.querySelectorAll('button, a, [role=button], label, li, div, span')]
    .filter(el => el.offsetParent !== null && (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase().includes(want))
  els.sort((a, b) => (b.matches('button, a, [role=button]') - a.matches('button, a, [role=button]')) || a.innerText.length - b.innerText.length)
  const el = els[0]
  if (!el) return 'NOT FOUND: ' + want
  el.scrollIntoView({ block: 'center' }); el.click()
  return 'clicked: ' + (el.innerText || el.getAttribute('aria-label')).trim().slice(0, 60)
})()`

// Run as a command; screens.mjs imports the helpers above instead.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
const [cmd, ...args] = process.argv.slice(2)
const cdp = await connect()
try {
  if (cmd === 'eval') console.log(JSON.stringify(await evaluate(cdp, args.join(' ')), null, 2))
  else if (cmd === 'click') console.log(await evaluate(cdp, clickJs(args.join(' '))))
  else if (cmd === 'text') console.log(await evaluate(cdp, 'document.body.innerText'))
  else if (cmd === 'reload') await evaluate(cdp, 'location.reload()')
  else if (cmd === 'nav') await evaluate(cdp, `location.hash = ${JSON.stringify(args[0])}`)
  else if (cmd === 'shot') {
    await screenshot(cdp, args[0] || 'shot.png')
    console.log('saved ' + (args[0] || 'shot.png'))
  } else {
    console.error('usage: cdp.mjs eval <js> | click <text> | text | shot [file] | reload | nav <#/route>')
    process.exitCode = 2
  }
} finally { cdp.close() }
}
