// The pure half of screens.mjs: the fixture workout, the size and colour ledgers' in-page code, and
// the before/after diff. screens-lib.test.mjs runs them without the emulator.
import { syncSideAggregate } from '../../frontend/src/lib/workout-model.js'

// Catalogue ids (catalogue/exercises): a barbell lift, a superset pair, one limb per side, a long name.
export const FIXTURE_IDS = { BENCH: '0025', CURL: '0294', ROW: '0861', CALF: '1178', LONG: '10331' }

/**
 * The live workout the sweep opens in place of an empty one, so a restyle (D123) is checked on
 * the rows that differ: a warm-up, a set to failure, a drop set, a superset pair, a per-side exercise, a very long
 * name and weights with two decimals. `start` and `d` come from the page, so its clock decides.
 */
export function fixtureActive({ start, d, id = 'hv-screens-' + start } = {}) {
  const { BENCH, CURL, ROW, CALF, LONG } = FIXTURE_IDS
  const target = (exId, extra) => ({ id: exId, sets: 3, reps: 8, weight: 110.23, mode: 'reps', restSec: 120, ...extra })
  const side = (w, r) => syncSideAggregate({ sides: { L: { w, r, done: false }, R: { w, r, done: false } } })
  return {
    id, d, start, routineIds: [], name: 'Screen check fixture', bw: null, cur: 0, workoutView: 'cards',
    entries: [
      { id: BENCH, target: target(BENCH), plan: null, sets: [
        { w: 40.5, r: 10, done: true, phase: 'warmup', warmup: true },
        { w: 110.23, r: 8, done: true },
        { w: 110.23, r: 6, done: false, failure: true },
        { w: 110.23, r: 8, done: false, type: 'dropset', drops: [{ w: 88.18, r: 6 }, { w: 66.14, r: 5 }] },
      ] },
      { id: CURL, sg: 'hv-screens-ss', target: target(CURL, { weight: 22.68, reps: 12 }), plan: null, sets: [
        { w: 22.68, r: 12, done: true }, { w: 22.68, r: 12, done: false },
      ] },
      { id: ROW, sg: 'hv-screens-ss', target: target(ROW, { weight: 63.5, reps: 12 }), plan: null, sets: [
        { w: 63.5, r: 12, done: false }, { w: 63.5, r: 12, done: false },
      ] },
      { id: CALF, target: target(CALF, { weight: 16.33, reps: 24, side: true }), plan: null, sets: [side(16.33, 12), side(16.33, 12)] },
      { id: LONG, target: target(LONG, { weight: 110.23, reps: 10 }), plan: null, sets: [
        { w: 110.23, r: 10, done: false }, { w: 110.23, r: 10, done: false },
      ] },
    ],
  }
}

/**
 * A stable key for an element: tag names from the nearest element with a plain id (#root,
 * #modal-root), with :nth-of-type only where siblings share the tag. Classes are left out, so a
 * restyle that adds one keeps the key; React's generated ids (":r1:") are skipped.
 */
export function selectorPath(el, stop = null) {
  const parts = []
  for (let n = el; n && n !== stop && n.nodeType === 1; n = n.parentElement) {
    const tag = n.tagName.toLowerCase()
    if (n.id && /^[A-Za-z][\w-]*$/.test(n.id)) { parts.unshift(tag + '#' + n.id); break }
    const same = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [n]
    parts.unshift(same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(n) + 1) + ')' : tag)
  }
  return parts.join('>')
}

/** Text that changes on its own between two runs: a clock, an elapsed "18min 19s", "2 days ago". */
export function isMoving(text) {
  const s = String(text || '').trim()
  return /^(\d+:)?\d{1,2}:\d{2}$/.test(s) || /^\d+\s?(h|min|s)(\s\d+\s?(min|s))*$/.test(s) || /\bago\b|\bjust now\b/i.test(s)
}

const CONTROLS = 'button, input, [role=button], .hv-row, .btn, .chip'

/**
 * The page's expression for one ledger, `sizes` (each control's box) or `colours` (each visible
 * element's computed colours and font). Keyed by selectorPath; moving text is left out.
 */
export function ledgerJs(kind) {
  return `(() => {
  const selectorPath = ${selectorPath}
  const isMoving = ${isMoving}
  const shown = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity !== 0 && el.getClientRects().length > 0 }
  const name = el => ((el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 40)) || el.tagName.toLowerCase()
  const els = [...document.querySelectorAll(${JSON.stringify(kind === 'sizes' ? CONTROLS : 'body *')})].filter(el => shown(el) && !(el.textContent.length < 40 && isMoving(el.textContent)))
  const r1 = v => Math.round(v * 10) / 10
  const out = {}
  for (const el of els) {
    const key = selectorPath(el)
    if (${JSON.stringify(kind)} === 'sizes') {
      const r = el.getBoundingClientRect()
      out[key] = { n: name(el), x: r1(r.left), y: r1(r.top + scrollY), w: r1(r.width), h: r1(r.height) }
    } else {
      const s = getComputedStyle(el)
      out[key] = { n: name(el), color: s.color, background: s.backgroundColor, border: s.borderColor, shadow: s.boxShadow, fill: s.fill, font: s.fontFamily }
    }
  }
  return out
})()`
}

const same = (a, b, tolerance) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= tolerance : a === b)

/**
 * Every difference between two ledgers ({ screen: { key: record } }), by screen: an element gone,
 * one added, or one whose fields changed (numbers within `tolerance` px count as the same). A
 * screen only one side has is one line. The record's `n` is its readable name, never compared.
 */
export function diffLedgers(before, after, { tolerance = 0 } = {}) {
  const out = []
  for (const screen of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    const a = before[screen], b = after[screen]
    if (!a || !b) { out.push({ screen, kind: a ? 'screen gone' : 'screen added' }); continue }
    for (const key of Object.keys(a)) if (!(key in b)) out.push({ screen, kind: 'gone', key, n: a[key].n })
    for (const key of Object.keys(b)) {
      if (!(key in a)) { out.push({ screen, kind: 'added', key, n: b[key].n }); continue }
      const fields = Object.keys({ ...a[key], ...b[key] }).filter(f => f !== 'n' && !same(a[key][f], b[key][f], tolerance))
      if (fields.length) out.push({ screen, kind: 'changed', key, n: b[key].n, changes: fields.map(f => ({ field: f, from: a[key][f], to: b[key][f] })) })
    }
  }
  return out
}

/** The findings and notes (report.md's lines) that one run has and the other has not, by screen. */
export function diffFindings(before, after) {
  const line = f => (f.note ? 'note: ' : '') + f.check + (f.el ? ': ' + f.el : '')
  const lines = results => Object.fromEntries(results.map(r => [r.screen, new Set((r.out || []).map(line))]))
  const a = lines(before), b = lines(after), out = []
  for (const screen of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    for (const l of a[screen] || []) if (!b[screen]?.has(l)) out.push({ screen, kind: 'gone', line: l })
    for (const l of b[screen] || []) if (!a[screen]?.has(l)) out.push({ screen, kind: 'added', line: l })
  }
  return out
}

/** compare.md: every change, grouped by screen. */
export function compareMarkdown({ sizes = [], colours = [], findings = [] }) {
  const by = list => list.reduce((m, d) => ((m[d.screen] ||= []).push(d), m), {})
  const item = d => d.kind.startsWith('screen') ? `- ${d.kind}`
    : `- ${d.kind} \`${d.key}\`${d.n ? ' (' + d.n + ')' : ''}${d.changes ? ': ' + d.changes.map(c => `${c.field} ${c.from} → ${c.to}`).join('; ') : ''}`
  let md = `# Screen compare\n\n${sizes.length} size, ${colours.length} colour and ${findings.length} finding change(s).\n\n`
  for (const [title, list, fmt] of [['Sizes', sizes, item], ['Colours', colours, item], ['Findings and notes', findings, d => `- ${d.kind}: ${d.line}`]]) {
    md += `## ${title}\n\n`
    const groups = by(list)
    if (!Object.keys(groups).length) md += 'No change.\n\n'
    for (const [screen, ds] of Object.entries(groups)) md += `### ${screen}\n\n${ds.map(fmt).join('\n')}\n\n`
  }
  return md
}
