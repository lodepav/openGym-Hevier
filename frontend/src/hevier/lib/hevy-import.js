// The fork's step in upstream's Hevy import (hevier/DECISIONS.md D29, seam S19). Upstream's importers
// ask `importExercise(title, source)` before their own match; an answer is an exercise id, or a key
// that also carries a brand and one-limb sets, which `importDone` turns back into the id, the
// entry's D28 brand (`hvBrand`) and upstream's per-side sets once the parse is finished.
//
// In order: (1) "(brand: X)" anywhere in a title is the user's own convention for a D28 brand,
// from any app, and so is a bare "(1:1)", "(2:1)" or "(x2)" for a cable's D43 setup (else the
// review's choice, `S.hvImportCable`; none is 1:1); (2) the user's own choice from the review (D33, `S.hvImportMap`), any app; (3) the
// fix table below, Hevy's English titles only; (4) a Hevy "Single/One Arm/Leg" title whose rest is
// a machine or cable exercise: that exercise, per side; (5) upstream's match, untouched. Every
// title asked about is noted, and `importDone` hands the list on as `hvTitles` for the review.
import { EXIDX, canonicalExId } from '../../lib/exercises.js'
import { importId, priorCustom, matchExercise, matchHevyTitle, bpFromName } from '../../lib/import-csv.js'
import { isWarmupRow, syncSideAggregate } from '../../lib/workout-model.js'
import { volumeFactor } from '../../lib/dumbbells.js'
import { MACHINE_EQ, BRAND_MAX } from './gym-labels.js'

// Hevy's English title (lower case) → catalogue id, `side` for a one-limb title. Each row was
// checked against the catalogue's artwork; each is also a fix for upstream's lib/hevy-id-map.js
// (hevier/upstream/hevy-map-fixes.md), and goes from here once upstream has it.
export const FIXES = {
  // Each id is the catalogue entry with the animation Hevy's own thumbnail shows (its file name
  // starts with that id), as offered upstream; the last three titles are the user's own exercises.
  // upstream picks the wrong exercise
  'seated leg curl (machine)': '0599',          // not the lying leg curl
  'single leg extensions': { id: '7108', side: true },   // not the floor knee extension
  'single arm cable row': { id: '7564', side: true },    // a horizontal row, not a high row
  'reverse grip lat pulldown (cable)': '0208',  // a cable, not the machine
  'lat pulldown (machine)': '0579',             // not the reverse grip
  'skullcrusher (dumbbell)': '0351',            // not the barbell
  'romanian deadlift (smith machine)': '1597',  // not the barbell; no Smith RDL in the catalogue
  'triceps dip': '0814',                        // body weight, not the lever machine
  'triceps dip (weighted)': '1755',
  'back extension (hyperextension)': '1860',    // the bench, not the lever machine
  'back extension (weighted hyperextension)': '5035',
  'seated overhead press (dumbbell)': '0290',   // not the barbell
  'overhead press (barbell)': '1165',           // standing, not seated
  'shoulder press (machine plates)': '0587',    // upstream's pick is a landmine press
  'seated shoulder press (machine)': '1454',
  'seated cable row - v grip (cable)': '2661',  // not the wide grip
  'seated cable row - bar grip': '0180',
  'triceps extension (dumbbell)': '0430',       // not the lever machine
  'hanging knee raise': '9819',                 // knees, not straight legs
  'ez bar biceps curl': '0447',                 // without an arm blaster
  'plank': '0463',                              // not weighted
  'crunch': '0274',                             // not weighted
  'air bike': '3893',                           // the fan bike, not the crunch of that name
  'walking': '2258',                            // not the walking lunge
  // upstream leaves these unmatched
  'seated cable row - bar wide grip': '0218',
  'seated cable row - bar wide grip (cable)': '0218',
  'iso-lateral high row (machine)': '0581',
  'iso-lateral low row': '4214',
  'band pullaparts': '4568',
  'triceps rope pushdown': '0200',
  'triceps pressdown': '1605',
  'straight arm lat pulldown (cable)': '0238',
  'lying neck curls': '10780',
  'single arm tricep extension (dumbbell)': '0362',
  'pull up (close neutral grip)': '0651',
  'single leg standing calf raise': '5052',
  'calf extension (machine)': '2315',
  'iso-lateral chest press (machine)': '0576',
  'triceps extension (cable)': '0149',
  'bulgarian split squat (smith machine)': '0768',
  'standing leg curls': '4347',               // the machine, not the body-weight curl
  'nordic hamstrings curls': '7746',
  'deficit push up': '1486',                  // push ups with handles: the hands raised, the chest sinks lower
  'behind the back curl (cable)': '4838',     // the cable unilateral curl
}

const BRAND = /\(\s*brand\s*:\s*([^)]*)\)/i
const LIMB = /\b(single|one)[\s-]+(arm|leg)\b/i
const clean = s => String(s || '').replace(/\s+/g, ' ').trim()

/** An imported weight to the hundredth, not upstream's tenth (D40): Hevy's 20.41 kg stays 20.41,
 *  and 45 lb read into a kg profile is 20.41 kg, not 20.4. */
export const importWeight = w => Math.round(w * 100) / 100

/** A title without its "(brand: X)", and X ('' for none). */
export function splitBrand(title) {
  const m = String(title || '').match(BRAND)
  if (!m) return { name: clean(title), brand: '' }
  return { name: clean(String(title).replace(BRAND, ' ')), brand: clean(m[1]).slice(0, BRAND_MAX) }
}

const CABLE = /\(\s*(1\s*:\s*1|2\s*:\s*1|[x×]\s*2)\s*\)/i

/** A title (brand already cut) without its cable setup tag, and the setup ('' for none). */
export function splitCable(name) {
  const m = String(name || '').match(CABLE)
  if (!m) return { name: clean(name), cable: '' }
  const c = m[1].replace(/\s+/g, '').toLowerCase()
  return { name: clean(String(name).replace(CABLE, ' ')), cable: c === '×2' ? 'x2' : c }
}

/** A title's parts: the name to match, the brand and the cable tag. */
const partsOf = title => { const { name, brand } = splitBrand(title); return { ...splitCable(name), brand } }

function fixOf(name) {
  // "Grip(Cable)" and "Grip (Cable)" are one title.
  const f = FIXES[clean(String(name || '').replace(/\s*\(/g, ' (')).toLowerCase()]
  if (!f) return null
  const { id, side = false } = typeof f === 'string' ? { id: f } : f
  return EXIDX[id] ? { id, side } : null
}

const matchOf = name => canonicalExId(fixOf(name)?.id || matchHevyTitle(name) || matchExercise(name))
/** Upstream's own match for a title, as its importers make it (null: a custom exercise). */
export const upstreamMatch = (name, source) =>
  canonicalExId((source === 'Hevy' ? matchHevyTitle(name) : null) || matchExercise(name)) || null
const isMachineId = id => !!id && MACHINE_EQ.has(EXIDX[id]?.eq)

/** The machine or cable exercise a one-limb title is done on, or null ("Single Leg Press (Machine)"). */
export function oneLimbOf(name) {
  if (!LIMB.test(name)) return null
  // "Single Leg Press" is a leg press: keep the limb first, then try without it ("Single Arm Cable Row").
  for (const rest of [name.replace(/\b(single|one)[\s-]+(?=leg\b)/i, ' '), name.replace(LIMB, ' ')]) {
    const id = matchOf(clean(rest))
    if (isMachineId(id)) return id
  }
  return null
}

const KEY = 'hv:'
const keyOf = ({ cable, ...v }) => KEY + JSON.stringify(cable ? { ...v, cable } : v)
/** What a key carries: { id, side, brand, n } (n: the name of a custom exercise to make), or null. */
export function readKey(id) {
  if (typeof id !== 'string' || !id.startsWith(KEY)) return null
  try { return JSON.parse(id.slice(KEY.length)) } catch { return null }
}

/** The review's key for a title: the app and the title without its brand and cable tag, lower case (D33). */
export const choiceKey = (title, source) => source + '|' + partsOf(title).name.toLowerCase()

/**
 * The user's choices, `{ map: S.hvImportMap, known: Set of exercise ids that exist, customEx }`, or null.
 * Kept until the next call, so one parse reads one set of choices.
 */
let ctx = null
export function useChoices(next) { ctx = next || null }
const choiceOf = (title, source) => {
  const v = ctx?.map?.[choiceKey(title, source)]
  if (v === 'custom') return v
  return v && (EXIDX[v] || ctx.known?.has(v)) ? v : null
}

/**
 * The fork's answer for an exercise title, or null to leave it to upstream. A plain catalogue id
 * when there is nothing else to carry, else a key for `importDone`.
 */
const memos = new WeakMap()
const noCtx = {}
const seen = new Map()
// A parse asks about all its titles in one go, with no await between: the first title of a later
// turn starts a new list, so a parse that never reached importDone (a failed file, one read as
// weigh-ins) leaves nothing in the next import's review.
let asking = false
export function importExercise(title, source) {
  const { name, cable } = partsOf(title)
  if (!asking) { seen.clear(); asking = true; queueMicrotask(() => { asking = false }) }
  seen.set(choiceKey(title, source), { title: name, source, cable })
  return resolved(title, source)
}
function resolved(title, source) {
  const c = ctx || noCtx
  if (!memos.has(c)) memos.set(c, new Map())
  const memo = memos.get(c)
  const k = source + '|' + title
  if (!memo.has(k)) memo.set(k, answer(title, source))
  return memo.get(k)
}

/**
 * What a title becomes: { id, custom, chosen }, `id` null for an exercise of the user's own that an
 * import makes. For the review's list.
 */
export function outcomeOf(title, source) {
  const chosen = !!choiceOf(title, source)
  const a = resolved(title, source)
  const k = readKey(a) || { id: a }
  const id = k.id ?? upstreamMatch(partsOf(title).name, source)
  return { id: id && !k.n ? id : null, chosen }
}

/** The cable setup a title is imported with: its tag, else the review's choice, else '' (1:1). */
export const cableFor = (title, source) => partsOf(title).cable || ctx?.cables?.[choiceKey(title, source)] || ''

function answer(title, source) {
  const { name, brand } = partsOf(title)
  const cable = cableFor(title, source)
  const hevy = source === 'Hevy'
  const own = choiceOf(title, source)
  if (own === 'custom') return keyOf({ id: importId('im', source + '|' + name.toLowerCase()), side: false, brand, cable, n: name.toLowerCase() })
  let id = null, side = false
  // An exercise of your own an earlier import made stays yours (upstream's priorCustom), unless the
  // review chose otherwise: a fix row added later would split its history across two ids (D29).
  const mine = own ? null : priorCustom(ctx?.customEx, importId('im', source + '|' + name.toLowerCase()), name)?.id
  const pick = own || mine
  const fix = pick ? { id: pick, side: LIMB.test(name) && isMachineId(pick) } : hevy ? fixOf(name) : null
  if (fix) ({ id, side } = fix)
  else if (hevy) { id = oneLimbOf(name); side = !!id }
  if (!id && !brand && !cable) return null
  id = id || matchOf(name)
  if (!side && !brand && !cable) return id
  // A brand on an exercise nobody matched: a custom exercise named without the brand, the id
  // upstream would give it, so a later import finds the same one.
  if (!id) return keyOf({ id: importId('im', source + '|' + name.toLowerCase()), side, brand, cable, n: name.toLowerCase() })
  return keyOf({ id, side, brand, cable })
}

const both = s => {
  const one = { w: s.w || 0, r: s.r || 0, done: !!s.done }
  if (s.rir != null) one.rir = s.rir
  if (s.rpe != null) one.rpe = s.rpe
  return syncSideAggregate({ ...s, sides: { L: { ...one }, R: { ...one } } })
}
// A Hevy row holds one side's reps: both sides get them. Only weight-and-reps rows; a timed or
// cardio row stays as it is.
const perSide = s => (s && s.r != null && s.min == null && s.sec == null && !s.sides ? both(s) : s)

const customOf = k => ({ id: k.id, n: k.n, custom: true, eq: 'custom', tg: '', desc: '', bp: bpFromName(k.n) || 'upper legs' })

const fresh = (parsed, made) => [...made.values()].filter(c => !parsed.customEx.some(x => x.id === c.id))

// Two stacks (×2) count both, as upstream counts a dumbbell logged per bell.
const workVol = entries => entries.reduce((a, e) => a + volumeFactor(e) * e.sets.reduce((b, s) => b + (isWarmupRow(s) ? 0 : (s.w || 0) * (s.r || 0)), 0), 0)

/** A parse result with the fork's keys turned back into ids, brands and per-side sets. */
export function importDone(parsed) {
  const hvTitles = [...seen.values()]
  seen.clear()
  if (!parsed || parsed.error) return parsed
  return { ...byName(parsed, done(parsed)), hvTitles }
}

// Upstream's Hevy API import matches by Hevy's template id alone, never by name, so a title its
// CSV import finds by name (Belt Squat (Machine) → lever belt squat) became one of your own
// exercises (2026-10-17). A custom exercise upstream made in this parse gets that name match.
// Yours stay yours: one an earlier import made, and one the review was told to keep (D33), never
// pass through here. A CSV's customs were already asked by name, so it changes nothing there.
function byName(input, out) {
  if (input.source !== 'Hevy') return out
  const to = new Map()
  for (const c of input.customEx || []) {
    const id = upstreamMatch(c.n, 'Hevy')
    if (id && EXIDX[id]) to.set(c.id, id)
  }
  if (!to.size) return out
  const swap = e => (to.has(e.id) ? { ...e, id: to.get(e.id) } : e)
  const gone = new Set([...to.keys()])
  const names = new Set((input.customEx || []).filter(c => gone.has(c.id)).map(c => c.n))
  const res = { ...out, customEx: out.customEx.filter(c => !gone.has(c.id)) }
  res.unmatchedNames = (out.unmatchedNames || []).filter(n => !names.has(String(n).toLowerCase()))
  if (out.kind === 'routines') res.routines = out.routines.map(r => ({ ...r, ex: r.ex.map(swap) }))
  else res.workouts = out.workouts.map(w => ({ ...w, entries: w.entries.map(swap) }))
  const used = new Set(out.kind === 'routines' ? res.routines.flatMap(r => r.ex.map(e => e.id)) : res.workouts.flatMap(w => w.entries.map(e => e.id)))
  res.matched = [...used].filter(id => EXIDX[id]).length
  res.created = res.customEx.length
  return res
}

function done(parsed) {
  const made = new Map()
  const take = k => { if (k.n && !EXIDX[k.id] && !made.has(k.id)) made.set(k.id, customOf(k)) }
  if (parsed.kind === 'routines') {
    const routines = parsed.routines.map(r => ({
      ...r,
      ex: r.ex.map(e => {
        const k = readKey(e.id)
        if (!k) return e
        take(k)
        const out = { ...e, id: k.id }
        if (k.side && out.mode === 'reps') out.side = true
        return out
      }),
    }))
    return { ...parsed, routines, customEx: [...parsed.customEx, ...fresh(parsed, made)] }
  }
  if (parsed.kind !== 'workouts') return parsed
  const workouts = parsed.workouts.map(w => {
    if (!w.entries.some(e => readKey(e.id))) return w
    const entries = w.entries.map(e => {
      const k = readKey(e.id)
      if (!k) return e
      take(k)
      const out = { ...e, id: k.id, sets: k.side ? e.sets.map(perSide) : e.sets }
      if (k.brand) out.hvBrand = k.brand
      // A cable's setup (D43); two stacks are logged per stack, as a dumbbell per bell.
      if (k.cable) out.hvCable = k.cable
      if (k.cable === 'x2' && !k.side) out.target = { ...(out.target || {}), dbLoad: 'each' }
      return out
    })
    return { ...w, entries, vol: workVol(entries) }
  })
  const used = new Set(workouts.flatMap(w => w.entries.map(e => e.id)))
  const added = fresh(parsed, made)
  const customEx = [...parsed.customEx.filter(c => used.has(c.id)), ...added]
  return {
    ...parsed, workouts, customEx,
    matched: [...used].filter(id => EXIDX[id]).length,
    created: customEx.length,
    unmatchedNames: [...new Set([...(parsed.unmatchedNames || []), ...added.map(c => c.n)])].sort(),
  }
}
