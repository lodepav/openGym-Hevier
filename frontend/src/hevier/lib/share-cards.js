// A finished workout as Hevy's share cards (hevier/DECISIONS.md D87): Summary, Exercises, Muscles,
// Records, each a 1080 × 1350 picture on black or over the user's own photo; and a month's report
// (D23) as Summary, Calendar, Muscles, Records and Top exercises. Two pure steps, so what a card
// says and where it goes are tested without a canvas:
//   shareCards       — the cards a workout has, and what each says (monthCards: a month's)
//   layoutShareCard  — where everything goes on one card, given a way to measure text
// share-draw.js paints a layout. Nothing is stored; the workout is read, never written.
import { EXIDX } from '../../lib/exercises.js'
import { levelsOf, loadOfWorkouts, MUSCLES } from '../../lib/muscles.js'
import { hasCompletedWork, isWarmupRow, isSideSet } from '../../lib/workout-model.js'
import { setUnits } from './hold-set.js'
import { fmtNum, fmtVol, exerciseNameText, weekOrder, DAYS } from '../../lib/format.js'
import { t, tn } from '../../lib/i18n-core.js'
import { wrapText } from '../../lib/workout-card.js'
import { speedUnitOf } from '../../lib/speed.js'
import { volumeMode, muscleMode, workSets, muscleSets } from './volume.js'
import { workoutRecords, recordValue, KINDS } from './records.js'
import { workoutTimeText, workoutWhenText } from './workout-when.js'
import { sanitizeHr } from './heart-rate.js'
import { hevySetText, hevySetLabel } from './set-text.js'
import { byExercise, change, monthWorkouts } from './month-report.js'
import { monthCells, dayKind } from './calendar.js'
import { durationWords } from './elapsed.js'

export const SHARE_W = 1080
export const SHARE_H = 1350
const PAD = 88
const FOOT = 96          // the "Go Hevier" line at the bottom
const ROW = 108          // one exercise or record row
const MAX_MUSCLES = 5   // more and the body map would shrink to fit them

const isWork = s => hasCompletedWork(s) && !isWarmupRow(s)
const nameOfEntry = e => (EXIDX[e.id] ? exerciseNameText(EXIDX[e.id]) : e.n || e.id)

// The set that reads as the exercise's best: the heaviest by estimated effort (weight and reps),
// else the most reps, the longest hold or cardio time; the first of equals.
const partsOf = s => (isSideSet(s) ? [s.sides.L, s.sides.R].filter(Boolean) : [s])
const scoreOf = s => Math.max(...partsOf(s).map(p => {
  const w = Number(p.w) || 0, r = Number(p.r) || 0
  return w > 0 ? w * (1 + r / 30) : (r || Number(p.sec) || Number(p.min) || 0) / 1e3
}))
function bestSet(e) {
  let best = null
  for (const s of e.sets || []) if (isWork(s) && (!best || scoreOf(s) > scoreOf(best))) best = s
  return best
}

/**
 * The cards a workout makes, in Hevy's order. `S` is the store's state (unit, volume mode, the log
 * the records are worked out from). Summary and Exercises always; Muscles only when a set reached a
 * muscle the body map shows; Records only when the workout set one (D51).
 */
export function shareCards(S, w, { body = 'male' } = {}) {
  const unit = S?.unit || 'kg'
  const entries = (w.entries || []).filter(e => (e.sets || []).some(isWork))
  const title = w.name || t('Workout')
  const when = workoutWhenText(w)
  const mode = volumeMode(S)
  const muscles = muscleSets(w.entries, muscleMode(S))
  const recs = workoutRecords(S, w)
  const hr = sanitizeHr(w.hr)
  const head = { title, when }

  const stats = [
    { label: t('Time'), value: workoutTimeText(w) },
    mode === 'weight' ? { label: t('Volume'), value: fmtVol(w.vol || 0, unit) } : { label: t('Sets'), value: fmtNum(workSets(w.entries)) },
    ...(recs.length ? [{ label: t('Records'), value: fmtNum(recs.length), trophy: true }] : []),
    ...(hr ? [{ label: t('Heart rate'), value: hr.avg + ' bpm' }] : []),
  ].slice(0, 3)
  const cards = [{
    kind: 'summary', ...head, stats,
    exercises: tn('{0} exercise', '{0} exercises', entries.length),
    line: mode === 'sets' ? muscles.slice(0, 4).map(m => `${t(m.muscle)} ${fmtNum(m.sets)}`).join(' · ') : '',
  }]

  const speed = speedUnitOf(S || {})
  cards.push({
    kind: 'exercises', ...head, heading: t('Workout'),
    rows: entries.map(e => {
      const best = bestSet(e)
      return {
        name: nameOfEntry(e),
        sets: tn('{0} set', '{0} sets', setUnits(e.sets, isWork).length),
        best: best ? hevySetText(hevySetLabel(e.id, best, e.target, speed), unit, n => n + ' ' + (n === 1 ? t('rep') : t('reps'))) : '',
      }
    }),
  })

  const levels = levelsOf(loadOfWorkouts([w]))
  if (MUSCLES.some(m => levels[m] > 0)) {
    const top = muscles.slice(0, MAX_MUSCLES)
    cards.push({
      kind: 'muscles', ...head, heading: t('Muscle Split'), levels, body,
      rows: top.map(m => ({ muscle: t(m.muscle), sets: m.sets, value: fmtNum(m.sets), part: m.sets / (top[0]?.sets || 1) })),
    })
  }

  if (recs.length) {
    cards.push({
      kind: 'records', ...head, heading: t('Records'),
      rows: recs.map(r => ({ name: nameOfEntry(w.entries[r.i] || {}), kind: t(KINDS[r.kind]), value: recordValue(r, unit, t) })),
    })
  }
  return cards
}

const nameOfId = id => (EXIDX[id] ? exerciseNameText(EXIDX[id]) : id)

/**
 * The cards a month's report makes (D23's page): Summary (its totals against the month before and
 * the weeks trained), Calendar (its days, the trained ones filled in their kind's colour), then
 * Muscles, Records and Top exercises when the month has any. `report` is monthReport's for month
 * (`y`, `mo`), `workouts` the counted log it was read from (D57), `byDay` every workout by its day
 * (the calendar shows every day, as the page's does), `ws` the week's first day. `title` heads every
 * card, `when` under it ("so far" for this month), `before` names the month before.
 */
export function monthCards(S, { y, mo, report: r, workouts = [], byDay = {}, ws = 1, title, when = '', before = '', body = 'male' }) {
  const unit = S?.unit || 'kg'
  const head = { title, when }
  const stats = [
    { label: t('Workouts'), value: fmtNum(r.workouts), delta: change(r.workouts, r.prev.workouts) },
    { label: t('Duration'), value: durationWords(r.duration), delta: change(r.duration, r.prev.duration, durationWords) },
    volumeMode(S) === 'sets'
      ? { label: t('Sets'), value: fmtNum(r.sets), delta: change(r.sets, r.prev.sets) }
      : { label: t('Volume'), value: fmtVol(r.volume, unit), delta: change(Math.round(r.volume), Math.round(r.prev.volume), v => fmtVol(v, unit)) },
  ]
  const cards = [{
    kind: 'summary', ...head, stats,
    exercises: t('{0} of {1} weeks trained', r.weeks.trained, r.weeks.total),
    line: before ? t('Against {0}', before) : '',
  }]
  cards.push({
    kind: 'calendar', ...head, heading: tn('{0} workout', '{0} workouts', r.workouts),
    days: weekOrder(ws).map(d => t(DAYS[d])),
    cells: monthCells(y, mo, ws).map(iso => iso && { day: Number(iso.slice(8)), kind: dayKind(byDay[iso]) }),
  })
  const levels = levelsOf(loadOfWorkouts(monthWorkouts(workouts, y, mo)))
  if (r.muscles.length && MUSCLES.some(m => levels[m] > 0)) {
    const top = r.muscles.slice(0, MAX_MUSCLES)
    cards.push({
      kind: 'muscles', ...head, heading: t('Muscle Split'), levels, body,
      rows: top.map(m => ({ muscle: t(m.muscle), sets: m.sets, value: fmtNum(m.sets), part: m.sets / (top[0]?.sets || 1) })),
    })
  }
  if (r.records.length) {
    // One row per exercise, as the page lists them: its first kind of record and how many more.
    cards.push({
      kind: 'records', ...head, heading: t('Records'),
      rows: byExercise(r.records).map(x => ({
        name: nameOfId(x.id), value: recordValue(x.recs[0], unit, t),
        kind: t(KINDS[x.recs[0].kind]) + (x.recs.length > 1 ? ' · +' + (x.recs.length - 1) : ''),
      })),
    })
  }
  if (r.top.length) {
    cards.push({
      kind: 'exercises', ...head, heading: t('Top exercises'),
      rows: r.top.map(x => ({ name: nameOfId(x.id), sets: tn('{0} set', '{0} sets', x.sets), best: x.best > 0 ? fmtNum(x.best) + ' ' + unit : '' })),
    })
  }
  return cards
}

/**
 * Where everything goes on one card. `measure(text, weight, size)` is a width in pixels (the
 * canvas's in the app, a fake in the tests). `photo`: the card is drawn over a picture, so its
 * content sits at the bottom over a shade and the top is left to the picture; on black it is
 * centred. `map` is `{ aspect }` (one body view's height over its width) for the Muscles card.
 * Returns { width, height, shadeFrom, items }; rows that do not fit end in an "and N more" line.
 */
export function layoutShareCard(card, { measure, photo = false, map = null }) {
  const items = []
  const inner = SHARE_W - PAD * 2
  let y = PAD
  const text = (str, size, weight, color, x = PAD, extra) => {
    items.push({ kind: 'text', text: str, x, y: y + size, size, weight, color, ...extra })
    y += Math.round(size * 1.3)
  }
  const fit = (str, width, size, weight) => wrapText(str, width, s => measure(s, weight, size), 1)[0] || ''

  // The head: accent bar, title, when.
  items.push({ kind: 'bar', x: PAD, y, w: 96, h: 10 })
  y += 10 + 40
  for (const line of wrapText(card.title, inner, s => measure(s, 700, 68), 2)) text(line, 68, 700, 'label')
  if (card.when) { y += 4; text(card.when, 36, 400, 'label2') }
  y += 40

  const room = () => SHARE_H - FOOT - PAD - y   // height left above the footer

  if (card.kind === 'summary') {
    const gap = 20
    const n = card.stats.length
    const tileW = (inner - gap * (n - 1)) / n
    // A month's tiles carry their change against the month before under the value.
    const tileH = card.stats.some(st => st.delta) ? 222 : 170
    card.stats.forEach((stat, i) => {
      const x = PAD + i * (tileW + gap)
      items.push({ kind: 'tile', x, y, w: tileW, h: tileH })
      if (stat.delta) items.push({ kind: 'text', text: fit(stat.delta.text, tileW - 52, 30, 600), x: x + 28, y: y + 186, size: 30, weight: 600, color: stat.delta.up ? 'up' : 'down' })
      items.push({ kind: 'text', text: stat.label, x: x + 28, y: y + 58, size: 32, weight: 400, color: 'label2' })
      const vx = stat.trophy ? x + 28 + 56 : x + 28
      if (stat.trophy) items.push({ kind: 'trophy', x: x + 24, y: y + 82, size: 52 })
      // A long value ("1h 5m", "12,345 kg") gets smaller to fit its tile rather than cut.
      let size = 60
      while (size > 32 && measure(stat.value, 700, size) > tileW - (vx - x) - 24) size -= 2
      items.push({ kind: 'text', text: fit(stat.value, tileW - (vx - x) - 24, size, 700), x: vx, y: y + 130, size, weight: 700, color: 'label' })
    })
    y += tileH + 36
    text(card.exercises, 38, 600, 'label')
    if (card.line) for (const line of wrapText(card.line, inner, s => measure(s, 400, 36), 3)) text(line, 36, 400, 'label2')
  } else if (card.kind === 'exercises' || card.kind === 'records') {
    text(card.heading, 40, 700, 'label')
    y += 12
    const fits = Math.max(1, Math.floor((room() - 60) / ROW))
    const shown = card.rows.length > fits + 1 ? fits : card.rows.length
    for (const row of card.rows.slice(0, shown)) {
      const left = card.kind === 'records' ? PAD + 64 : PAD
      if (card.kind === 'records') items.push({ kind: 'trophy', x: PAD, y: y + 6, size: 44 })
      const right = card.kind === 'records' ? row.value : row.sets
      const rw = measure(right, 600, 34)
      items.push({ kind: 'text', text: fit(row.name, SHARE_W - PAD - left - rw - 32, 40, 600), x: left, y: y + 40, size: 40, weight: 600, color: 'label' })
      items.push({ kind: 'text', text: right, x: SHARE_W - PAD, y: y + 40, size: 34, weight: 600, color: card.kind === 'records' ? 'acc' : 'label2', align: 'right' })
      const sub = card.kind === 'records' ? row.kind : row.best
      if (sub) items.push({ kind: 'text', text: fit(sub, SHARE_W - PAD - left, 32, 400), x: left, y: y + 84, size: 32, weight: 400, color: 'label2' })
      y += ROW
    }
    if (shown < card.rows.length) text(t('and {0} more', card.rows.length - shown), 34, 400, 'label2')
  } else if (card.kind === 'calendar') {
    // The month's grid, weekday letters on top; a trained day a disc in its kind's colour.
    text(card.heading, 40, 700, 'label')
    y += 12
    const colW = inner / 7
    const mid = i => PAD + colW * i + colW / 2
    card.days.forEach((d, i) => items.push({ kind: 'text', text: d, x: mid(i), y: y + 32, size: 30, weight: 600, color: 'label2', align: 'center' }))
    y += 64
    const rows = Math.ceil(card.cells.length / 7)
    const rowH = Math.min(colW, (room() - 8) / rows)
    const radius = Math.max(12, Math.min(colW, rowH) / 2 - 8)
    card.cells.forEach((c, i) => {
      if (!c) return
      const cx = mid(i % 7), cy = y + rowH * Math.floor(i / 7) + rowH / 2
      if (c.kind) items.push({ kind: 'dot', x: cx, y: cy, r: radius, color: c.kind })
      // A number on green or orange is black, as the Calendar page writes it (D17).
      items.push({ kind: 'text', text: String(c.day), x: cx, y: cy + 12, size: 34, weight: c.kind ? 700 : 400,
        color: !c.kind ? 'label2' : c.kind === 'strength' ? 'label' : 'onLight', align: 'center' })
    })
    y += rowH * rows
  } else if (card.kind === 'muscles') {
    // The body front and back side by side, then a bar per muscle with its sets.
    const rows = card.rows.length
    const barsH = rows * 72
    const mapH = Math.max(0, Math.min(560, room() - barsH - 40))
    if (map && mapH > 200) {
      const viewW = Math.min((inner - 40) / 2, mapH / map.aspect)
      const viewH = viewW * map.aspect
      const x0 = PAD + (inner - viewW * 2 - 40) / 2
      items.push({ kind: 'map', view: 'front', x: x0, y, w: viewW, h: viewH })
      items.push({ kind: 'map', view: 'back', x: x0 + viewW + 40, y, w: viewW, h: viewH })
      y += viewH + 40
    }
    const labelW = 300
    const shown = Math.min(rows, Math.max(0, Math.floor((room() + 20) / 72)))
    for (const row of card.rows.slice(0, shown)) {
      items.push({ kind: 'text', text: fit(row.muscle, labelW - 16, 34, 600), x: PAD, y: y + 36, size: 34, weight: 600, color: 'label' })
      const trackX = PAD + labelW, trackW = inner - labelW - 90
      items.push({ kind: 'meter', x: trackX, y: y + 14, w: trackW, h: 24, part: row.part })
      items.push({ kind: 'text', text: row.value, x: SHARE_W - PAD, y: y + 36, size: 34, weight: 700, color: 'label', align: 'right' })
      y += 72
    }
  }

  items.push({ kind: 'text', text: 'Go Hevier', x: SHARE_W - PAD, y: SHARE_H - PAD + 8, size: 34, weight: 700, color: 'label2', align: 'right', foot: true })

  // On black the content is centred above the footer; over a photo it goes to the bottom, with a
  // shade under it that keeps it readable and leaves the top to the picture.
  const free = Math.max(0, SHARE_H - FOOT - PAD - y)
  const dy = photo ? free : Math.round(free / 2)
  for (const it of items) if (!it.foot) it.y += dy
  const shadeFrom = photo ? Math.max(0, dy - 160) : 0
  return { width: SHARE_W, height: SHARE_H, photo, shadeFrom, items }
}
