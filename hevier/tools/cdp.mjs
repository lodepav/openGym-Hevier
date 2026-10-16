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
// Env: ADB (default ~/Android/Sdk/platform-tools/adb), APP_ID (default ch.duartesantos.opengym.test),
// CDP_PORT (default 9223).
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const ADB = process.env.ADB || homedir() + '/Android/Sdk/platform-tools/adb'
const APP_ID = process.env.APP_ID || 'ch.duartesantos.opengym.test'
const PORT = process.env.CDP_PORT || '9223'

function forward() {
  const pid = execFileSync(ADB, ['shell', 'pidof', APP_ID]).toString().trim().split(/\s+/)[0]
  if (!pid) throw new Error(APP_ID + ' is not running')
  execFileSync(ADB, ['forward', 'tcp:' + PORT, 'localabstract:webview_devtools_remote_' + pid])
}

async function connect() {
  forward()
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
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

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}

// Clicks the smallest visible element whose own text matches (buttons/links preferred).
const clickJs = needle => `(() => {
  const want = ${JSON.stringify(needle)}.toLowerCase()
  const els = [...document.querySelectorAll('button, a, [role=button], label, li, div, span')]
    .filter(el => el.offsetParent !== null && (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase().includes(want))
  els.sort((a, b) => (b.matches('button, a, [role=button]') - a.matches('button, a, [role=button]')) || a.innerText.length - b.innerText.length)
  const el = els[0]
  if (!el) return 'NOT FOUND: ' + want
  el.scrollIntoView({ block: 'center' }); el.click()
  return 'clicked: ' + (el.innerText || el.getAttribute('aria-label')).trim().slice(0, 60)
})()`

const [cmd, ...args] = process.argv.slice(2)
const cdp = await connect()
try {
  if (cmd === 'eval') console.log(JSON.stringify(await evaluate(cdp, args.join(' ')), null, 2))
  else if (cmd === 'click') console.log(await evaluate(cdp, clickJs(args.join(' '))))
  else if (cmd === 'text') console.log(await evaluate(cdp, 'document.body.innerText'))
  else if (cmd === 'reload') await evaluate(cdp, 'location.reload()')
  else if (cmd === 'nav') await evaluate(cdp, `location.hash = ${JSON.stringify(args[0])}`)
  else if (cmd === 'shot') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(args[0] || 'shot.png', Buffer.from(data, 'base64'))
    console.log('saved ' + (args[0] || 'shot.png'))
  } else {
    console.error('usage: cdp.mjs eval <js> | click <text> | text | shot [file] | reload | nav <#/route>')
    process.exitCode = 2
  }
} finally { cdp.close() }
