// The fork's step in upstream's Hevy import (hevier/DECISIONS.md D29, seam S19). Upstream's importers
// ask `importExercise(title, source)` before their own match; an answer is an exercise id, or a key
// that also carries a brand, a cable setup and one-limb sets, which `importDone` turns back into the
// id, the entry's D28 brand (`hvBrand`), its D43 setup (`hvCable`) and upstream's per-side sets once
// the parse is finished.
//
// A title is first cut into its parts (`partsOf`): "(brand: X)" anywhere is the user's own
// convention for a brand, from any app; in a Hevy title so is a second bracket after the
// equipment's, the older way; and a bare "(1:1)", "(2:1)" or "(x2)" is a cable's setup. What is left
// is matched by the steps in `STEPS`, the first answer winning, else by upstream.
import { EXIDX, canonicalExId } from '../../lib/exercises.js'
import { importId, priorCustom, matchExercise, matchHevyTitle, bpFromName } from '../../lib/import-csv.js'
import { isWarmupRow, syncSideAggregate } from '../../lib/workout-model.js'
import { volumeFactor } from '../../lib/dumbbells.js'
import { MACHINE_EQ, BRAND_MAX } from './gym-labels.js'
import { isOneLimb } from './one-limb.js'
import { unescapeWorkout } from './note-text.js'

// Hevy's English title (lower case) → catalogue id, `side` for a one-limb title. Each row was
// checked against the catalogue's artwork; each is also a fix for upstream's lib/hevy-id-map.js
// (hevier/upstream/hevy-map-fixes.md), and goes from here once upstream has it.
export const FIXES = {
  // Each id is the catalogue entry with the animation Hevy's own thumbnail shows (its file name
  // starts with that id), as offered upstream (hevier/upstream/hevy-map-fixes.md lists the four
  // titles that are the user's own and stay here).
  // upstream picks the wrong exercise
  'seated leg curl (machine)': '0599',          // not the lying leg curl
  'single leg extensions': { id: '7108', side: true },   // not the floor knee extension
  'single arm cable row': { id: '7564', side: true },    // a horizontal row, not a high row
  'single arm cable row (cable)': { id: '7564', side: true },
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
  'iso-lateral high row (machine)': { id: '0581', side: true },   // the user rows it one arm at a time
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
  'behind the back curl (cable)': { id: '4838', side: true },   // the cable unilateral curl, one arm at a time
  // Hevy's own picture, chosen by the user from their history's review; offered in #672,
  // but for the one-arm triceps extension, a custom exercise in the user's Hevy, not a Hevy title
  'bent over row (dumbbell)': '0293',         // both arms, not one
  'butterfly (pec deck)': '1030',
  'chest dip (weighted)': '1755',             // no weighted chest dip in the catalogue: Hevy's, shared with Triceps Dip (Weighted)
  'calf press (machine)': '0738',             // the 45° sled's calf press
  'chest press (band)': '3780',               // standing
  'face pull': '7744',
  'lat pulldown (cable)': '0150',
  'lat pulldown - close grip (cable)': '6392',
  'preacher curl (dumbbell)': '0402',
  'rear delt reverse fly (dumbbell)': '0380',
  'single arm curl (cable)': { id: '0190', side: true },
  'single arm triceps extension (cable)': { id: '0149', side: true },
  'sissy squat (weighted)': '0851',
  'standing calf raise (smith)': '1164',
  'triceps pushdown': '0201',
  'upright row (barbell)': '0121',
  // Hevy's own picture, the user's choice: upstream left the title out as a wrong
  // match, so it imported as your own; #672 maps it the same way
  'rear delt reverse fly (cable)': '0225',   // standing, high cables crossing
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

// Hevy's own titles have one bracket at most, the equipment (none in its title map has two), so a
// second one, last, is the user's own: a brand as it was written before "(brand: X)", which Hevy's
// CSV still carries for sets logged before the exercise was renamed.
const LAST = /\(([^()]*)\)\s*$/
export function bareBrand(name) {
  const m = String(name || '').match(LAST)
  if (!m || (name.match(/\([^()]*\)/g) || []).length < 2) return null
  return { name: clean(name.slice(0, m.index)), brand: clean(m[1]).slice(0, BRAND_MAX) }
}

// A last bracket that is one of your own brands (D28's labels, `choices.brands`, compared without
// case, spaces or punctuation) is that brand, even when it is the title's only bracket, from any
// app: "Face Pull (LifeFitness)". It takes your brand's own spelling.
export const brandNorm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
function knownBrand(name, brands) {
  const m = brands && String(name || '').match(LAST)
  const own = m && brands.get(brandNorm(m[1]))
  return own ? { name: clean(name.slice(0, m.index)), brand: own } : null
}

/** A title's parts: the name to match, the brand and the cable tag. */
function partsOf(title, source, choices) {
  const { name, brand } = splitBrand(title)
  const c = splitCable(name)
  const bare = !brand ? (source === 'Hevy' && bareBrand(c.name)) || knownBrand(c.name, choices?.brands) : null
  return bare ? { ...c, ...bare } : { ...c, brand }
}

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
/** The id upstream gives a custom exercise it makes from a title, so a later import finds it again. */
const customId = (source, name) => importId('im', source + '|' + name.toLowerCase())

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
/** What a key carries: { id, side, brand, cable, n } (n: the name of a custom exercise to make), or null. */
export function readKey(id) {
  if (typeof id !== 'string' || !id.startsWith(KEY)) return null
  try { return JSON.parse(id.slice(KEY.length)) } catch { return null }
}

/*
 * `choices` is the user's say over an import, `{ map: S.hvImportMap, cables: S.hvImportCable,
 * known: Set of the custom exercise ids, customEx, brands }` (import-review.js's `choicesFor`), or
 * null for none. Every function below that reads it takes it as its last argument.
 */

/** The brand and cable setup a title carries ('' for none), as the import reads them: D29's
 *  "(brand: X)", a Hevy title's second bracket or one of your own brands; D43's "(x2)". */
export function titleLabel(title, source, choices) {
  const { brand, cable } = partsOf(title, source, choices)
  return { brand: brand || '', cable: cable || '' }
}

/** The review's key for a title: the app and the title without its brand and cable tag, lower case (D33). */
export const choiceKey = (title, source, choices) => source + '|' + partsOf(title, source, choices).name.toLowerCase()
/** The cable review's key: the review's, and the brand when there is one, so a brand's setup is its own (D43). */
export function cableKey(title, source, choices) {
  const { brand } = partsOf(title, source, choices)
  return choiceKey(title, source, choices) + (brand ? '|' + brand.toLowerCase() : '')
}

/** The review's choice for a title: an exercise that still exists, 'custom', or null. */
function choiceOf(title, source, choices) {
  const v = choices?.map?.[choiceKey(title, source, choices)]
  if (v === 'custom') return v
  return v && (EXIDX[v] || choices.known?.has(v)) ? v : null
}

/** The cable setup a title is imported with: its tag, else the review's choice (its brand's, else
 *  the title's without a brand, as it was kept before), else '' (1:1). */
export const cableFor = (title, source, choices) =>
  partsOf(title, source, choices).cable || choices?.cables?.[cableKey(title, source, choices)]
    || choices?.cables?.[choiceKey(title, source, choices)] || ''

// An exercise picked for a one-limb title is done one side at a time when it is a machine or cable.
// So is one whose catalogue name says one arm or leg (D75).
const picked = (id, name) => (id ? { id, side: (LIMB.test(name) && isMachineId(id)) || isOneLimb(EXIDX[id]) } : null)

/** How a title is matched, in order, the first answer winning: each step gives { id, side } or null. */
const STEPS = [
  // The user's own choice from the review (D33), any app.
  t => picked(t.own, t.name),
  // An exercise of your own an earlier import made stays yours (upstream's priorCustom): a fix row
  // added later would split its history across two ids (D29).
  t => picked(priorCustom(t.choices?.customEx, customId(t.source, t.name), t.name)?.id, t.name),
  // The fix table, Hevy's English titles only.
  t => (t.hevy ? fixOf(t.name) : null),
  // A Hevy "Single/One Arm/Leg" title whose rest is a machine or cable exercise: that one, per side.
  t => { const id = t.hevy && oneLimbOf(t.name); return id ? { id, side: true } : null },
]

function answer(title, source, choices) {
  const { name, brand } = partsOf(title, source, choices)
  const cable = cableFor(title, source, choices)
  const own = choiceOf(title, source, choices)
  if (own === 'custom') return keyOf({ id: customId(source, name), side: false, brand, cable, n: name.toLowerCase() })
  const t = { name, source, hevy: source === 'Hevy', own, choices }
  let found = null
  for (const step of STEPS) if ((found = step(t))) break
  let { id = null, side = false } = found || {}
  // A one-limb catalogue exercise, free weights too (D75): each Hevy row holds one side's reps.
  const limb = !id && !side && !brand && !cable ? matchOf(name) : null
  if (limb && isOneLimb(EXIDX[limb])) return keyOf({ id: limb, side: true, brand, cable })
  if (!id && !brand && !cable) return null
  id = id || matchOf(name)
  if (!side && id && isOneLimb(EXIDX[id])) side = true
  if (!side && !brand && !cable) return id
  // A brand on an exercise nobody matched: a custom exercise named without the brand, the id
  // upstream would give it, so a later import finds the same one.
  if (!id) return keyOf({ id: customId(source, name), side, brand, cable, n: name.toLowerCase() })
  return keyOf({ id, side, brand, cable })
}

// One parse asks about many titles with the same choices: the answers are kept per choices object.
const memos = new WeakMap()
const NONE = {}
/**
 * The fork's answer for an exercise title, or null to leave it to upstream: a plain catalogue id
 * when there is nothing else to carry, else a key for `importDone`.
 */
export function matchTitle(title, source, choices = null) {
  const c = choices || NONE
  if (!memos.has(c)) memos.set(c, new Map())
  const memo = memos.get(c)
  const k = source + '|' + title
  if (!memo.has(k)) memo.set(k, answer(title, source, choices))
  return memo.get(k)
}

/**
 * What a title becomes: { id, chosen }, `id` null for an exercise of the user's own that an
 * import makes. For the review's list.
 */
export function outcomeOf(title, source, choices) {
  const chosen = !!choiceOf(title, source, choices)
  const a = matchTitle(title, source, choices)
  const k = readKey(a) || { id: a }
  const id = k.id ?? upstreamMatch(partsOf(title, source, choices).name, source)
  return { id: id && !k.n ? id : null, chosen }
}

/**
 * Upstream's two hooks (seam S19), reading the user's choices from `getChoices()` for each title.
 * The titles a parse asks about are collected, and `importDone` hands them on as `hvTitles` for
 * the review.
 */
export function importHooks(getChoices) {
  let titles = new Map()
  // A parse asks about all its titles in one go, with no await between: the first title of a later
  // turn starts a new list, so a parse that never reached importDone (a failed file, one read as
  // weigh-ins) leaves nothing in the next import's review.
  let asking = false
  return {
    importExercise(title, source) {
      if (!asking) { titles = new Map(); asking = true; queueMicrotask(() => { asking = false }) }
      titles.set(source + '|' + title, { title, source })
      return matchTitle(title, source, getChoices())
    },
    importDone(parsed) {
      const asked = [...titles.values()]
      titles = new Map()
      const choices = getChoices()
      const learnt = withFileBrands(asked, choices)
      return finishImport(learnt === choices ? parsed : rebrand(parsed, asked, choices, learnt), labelled(asked, learnt))
    },
  }
}

/** The titles a parse asked about, as the review lists them: name, brand and cable tag, once each. */
function labelled(asked, choices) {
  const out = new Map()
  for (const { title, source } of asked) {
    const { name, cable, brand } = partsOf(title, source, choices)
    out.set(cableKey(title, source, choices), { title: name, source, cable, brand })
  }
  return [...out.values()]
}

/**
 * The choices with the brands the file itself names (its "(brand: X)" and Hevy second brackets)
 * added to your own, so a title with that brand as its only bracket is read as that brand in the
 * same import, as it is in the next one: "Face Pull (LifeFitness)" beside "Lat Pulldown (Cable)
 * (LifeFitness)" on a fresh install. The same choices when the file names none that is new.
 */
function withFileBrands(asked, choices) {
  const brands = new Map(choices?.brands || [])
  let added = false
  for (const { title, source } of asked) {
    const { brand } = partsOf(title, source, choices)
    const k = brandNorm(brand)
    if (k.length >= 2 && !brands.has(k)) { brands.set(k, brand); added = true }
  }
  return added ? { ...(choices || {}), brands } : choices
}

/**
 * A parse with the titles the file's own brands answer differently moved to the new answer: an
 * exercise of your own upstream or the fork made for "Face Pull (LifeFitness)" becomes the face
 * pull with that brand. Only a title whose answer was its own (a custom exercise it made, or a key)
 * moves, found by the id the parse gave it; one that matched a catalogue exercise stays.
 */
function rebrand(parsed, asked, before, after) {
  if (!parsed || parsed.error || (parsed.kind !== 'workouts' && parsed.kind !== 'routines')) return parsed
  const made = new Set((parsed.customEx || []).filter(c => !before?.known?.has(c.id)).map(c => c.id))
  const to = new Map()
  const names = new Set()
  for (const { title, source } of asked) {
    const was = matchTitle(title, source, before)
    const now = matchTitle(title, source, after)
    if (was === now) continue
    const old = was || customId(source, title)
    if (was ? !readKey(was) : !made.has(old)) continue
    to.set(old, now)
    names.add(title.toLowerCase())
  }
  if (!to.size) return parsed
  const swap = e => (to.has(e.id) ? { ...e, id: to.get(e.id) } : e)
  const out = {
    ...parsed,
    customEx: parsed.customEx.filter(c => !to.has(c.id)),
    unmatchedNames: (parsed.unmatchedNames || []).filter(n => !names.has(String(n).toLowerCase())),
  }
  if (parsed.kind === 'routines') out.routines = parsed.routines.map(r => ({ ...r, ex: r.ex.map(swap) }))
  else out.workouts = parsed.workouts.map(w => ({ ...w, entries: w.entries.map(swap) }))
  return out
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

/** A parse result with the fork's keys turned back into ids, brands and per-side sets, and the titles it asked about. */
function finishImport(parsed, hvTitles) {
  if (!parsed || parsed.error) return parsed
  const out = { ...byName(parsed, done(parsed)), hvTitles }
  // Hevy's CSV writes a note's line breaks as `\n` (D54).
  if (out.kind === 'workouts' && out.source === 'Hevy') out.workouts = out.workouts.map(unescapeWorkout)
  return out
}

// Upstream's Hevy API import matches by Hevy's template id alone, never by name, so a title its
// CSV import finds by name (Belt Squat (Machine) → lever belt squat) became one of your own
// exercises. A custom exercise upstream made in this parse gets that name match.
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
        // Hevy's rep target is one side's; upstream's per-side reps are both sides' (D75).
        if (k.side && out.mode === 'reps') {
          out.side = true
          for (const f of ['reps', 'repsMin', 'repsMax']) if (out[f] > 0) out[f] *= 2
        }
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
