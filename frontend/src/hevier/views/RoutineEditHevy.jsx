// Hevy's "Edit Routine" over upstream's routine data (DECISIONS.md D15):
// a title, then one block per exercise — thumbnail · blue name · ⋮, notes, "Rest Timer: …" and a
// SET · KG · REPS table drawn from the exercise's prescription (lib/routine-table.js) — then
// + Add Exercise, and below it the routine-wide progression, deload and body map upstream's
// editor has. Every change saves as it is made, as upstream's editor does.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX, exOr } from '../../lib/exercises.js'
import { activeProfile, exAvailable } from '../../lib/equipment.js'
import { exerciseNameText, fmtNum, uid } from '../../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { supersetUnits, moveRoutineEntry, cleanupSg, defaultConfig, isBw, NOTE_MAX, pairAdjacent } from '../../lib/history.js'
import { supersetMeta, setSupersetMeta } from '../../lib/superset-meta.js'
import { fmtRest, REST_MAX } from '../../lib/duration.js'
import { copyRoutine, deleteRoutine, replaceSlotExercise } from '../../lib/routines.js'
import { planPrintHTML, printPlan } from '../../lib/plan-share.js'
import { MOBILE, printHtml } from '../../lib/mobile.js'
import { speedUnitOf, toSpeed, fromSpeed } from '../../lib/speed.js'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../../lib/progression.js'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../../lib/muscles.js'
import { workoutControls } from '../../lib/workout-controls.js'
import { glyphOf } from '../../lib/glyphs.js'
import {
  glyphPicker, exercisePicker, exConfigSheet, confirmSheet, supersetSheet, menuSheet, exerciseDetailSheet,
} from '../../sheets.jsx'
import { durationSheet } from '../../components/DurationWheel.jsx'
import { removeRoutineExercise, reorderRoutineUnit } from '../../views/RoutineEdit.jsx'
import { useDragReorder } from '../components/useDragReorder.js'
import { useSupersetTarget, exercisePickerSheet } from './ExercisePickerHevy.jsx'
import { BackupsSheet } from '../components/BackupsSheet.jsx'
import { keepBackups, cleanBackups } from '../lib/routine-backups.js'
import { Thumb } from '../../components/Media.jsx'
import BodyMap from '../../components/BodyMap.jsx'
import SwipeRow from '../../components/SwipeRow.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { restTimerText } from '../lib/elapsed.js'
import { NumberField, Row, SelectRow, Switch } from '../../components/ui.jsx'
import {
  routineRows, tableShape, setWorkField, setRange, addRow, removeRow, makeWarmup, makeWork, canWarmUp,
  canFail, setFailure, setMax, workCount,
} from '../lib/routine-table.js'

// Double and triple progression's "8 to 12", Hevy's REP RANGE picker as two fields.
function RangeSheet({ from, to, onDone, close }) {
  const [a, setA] = useState(from)
  const [b, setB] = useState(to)
  return <div className="hv-range">
    <h3>{t('Rep range')}</h3>
    <div className="hv-range-row">
      <label><span>{t('Reps from')}</span><NumberField decimal={false} className="input" value={a} onChange={setA} /></label>
      <span className="hv-range-to">{t('to')}</span>
      <label><span>{t('Reps up to')}</span><NumberField decimal={false} className="input" value={b} onChange={setB} /></label>
    </div>
    <button type="button" className="btn primary" onClick={() => { close(); onDone(a, b) }}>{t('Done')}</button>
  </div>
}

function RoutineExercise({ r, i, unitOf, S, grip, press }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const e = r.ex[i]
  const ex = exOr(e.id)
  const shape = tableShape(e, r)
  const rows = routineRows(e, r, S.unit)
  const bw = isBw(e)
  const speedUnit = speedUnitOf(S)
  const edit = fn => update(s => {
    const list = s.routines.find(x => x.id === r.id)?.ex
    if (list?.[i] && list[i].id === e.id) list[i] = fn(list[i])
  })
  const editList = fn => update(s => { const list = s.routines.find(x => x.id === r.id)?.ex; if (list) fn(list) })

  // Upstream's editor's own flows (views/RoutineEdit.jsx): the settings sheet, Replace, the link.
  const openSettings = () => exConfigSheet(ex, e, cfg => editList(x => {
    // D45: the sheet (upstream's v1.4.1) does not know the slot's backups; they stay.
    x[i] = keepBackups(x[i], { id: x[i].id, sg: x[i].sg, ...(x[i].sg ? { sgName: x[i].sgName, sgRest: x[i].sgRest } : {}), ...cfg })
    cleanupSg(x)
  }), () => removeRoutineExercise(r.id, i), r, null, replace)
  function replace() {
    const openedOn = e.id
    const commit = (pick, fn) => {
      picker.close()
      let done = false
      // D45: the slot keeps its backups, less the exercise now in it (upstream 1.4.2's rule).
      editList(x => { if (x[i] && x[i].id === openedOn) { x[i] = keepBackups(x[i], fn(x[i])); done = true } })
      if (done) toast(t('Replaced with “{0}”', exerciseNameText(pick)))
    }
    const picker = exercisePickerSheet((pick, quick) => {
      const live = useStore.getState().S
      const slot = live.routines.find(x => x.id === r.id)?.ex[i]
      if (!slot || slot.id !== openedOn) { picker.close(); return }
      if (quick && pick.id === openedOn) { picker.close(); return }
      if (quick) { commit(pick, current => replaceSlotExercise(current, pick.id, live, r.id)); return }
      const next = replaceSlotExercise(slot, pick.id, live, r.id)
      exConfigSheet(pick, next, cfg => commit(pick, current => ({ id: pick.id, sg: current.sg, ...cfg })), null, r, null, null, t('Replace'))
    }, { title: t('Replace exercise'), like: openedOn, backups: e.subs })
  }
  const linked = i > 0 && e.sg && r.ex[i - 1].sg === e.sg
  const toggleLink = () => editList(x => {
    const cur = x[i], prev = x[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(x)
  })
  const move = dir => {
    if (!moveRoutineEntry(r.ex, i, dir)) return
    editList(x => {
      const next = moveRoutineEntry(x, i, dir)
      if (next) { x.splice(0, x.length, ...next); cleanupSg(x) }
    })
  }
  const backupNames = cleanBackups(e.subs, e.id, id => !!EXIDX[id]).map(id => exerciseNameFor(EXIDX[id])).join(', ')
  const openMore = () => menuSheet({
    title: exerciseNameFor(ex),
    titleClass: exerciseNameClass(ex),
    sections: [
      { items: [
        { icon: 'chevronUp', label: t('Move up'), disabled: !moveRoutineEntry(r.ex, i, -1), onClick: () => move(-1) },
        { icon: 'chevronDown', label: t('Move down'), disabled: !moveRoutineEntry(r.ex, i, 1), onClick: () => move(1) },
        { icon: 'swap', label: t('Replace exercise'), onClick: replace },
        // D45: the slot's planned backups, offered first by a swap mid-workout.
        { icon: 'shuffle', label: t('Backups'), sub: backupNames || t('None'), onClick: () => useUI.getState().openSheet(close => <BackupsSheet rid={r.id} i={i} exId={e.id} close={close} />) },
        i > 0 && { icon: 'link', label: linked ? t('Remove from superset') : t('Make superset with previous'), onClick: toggleLink },
      ] },
      { items: [
        // D8 / D15: drop sets, rest-pause, back-off, pyramid, per side and progression live here.
        { icon: 'slider', label: t('Settings & progression'), sub: t('Drop sets, back-off, pyramid, per side, progression'), onClick: openSettings },
        { icon: 'info', label: t('How to do it'), onClick: () => exerciseDetailSheet(ex) },
      ] },
      { items: [{ icon: 'xmark', label: t('Remove exercise'), danger: true, onClick: () => removeRoutineExercise(r.id, i) }] },
    ],
  })

  const restText = restTimerText(e.restSec, S.restSec, t('Off'))
  const openRest = () => durationSheet({
    title: t('Rest for this exercise'), value: e.restSec > 0 ? e.restSec : 0, max: REST_MAX,
    off: t('Default ({0})', fmtRest(S.restSec)),
    footer: t('Rest after each set of this exercise. 0:00 means your default rest.'),
    onDone: v => edit(c => { const next = { ...c }; if (v > 0) next.restSec = v; else delete next.restSec; return next }),
  })
  const [note, setNote] = useState(e.note || '')
  useEffect(() => { setNote(e.note || '') }, [e.note])
  const saveNote = () => edit(c => {
    const next = { ...c }
    const v = note.trim().slice(0, NOTE_MAX)
    if (v) next.note = v; else delete next.note
    return next
  })

  // A row takes out with an Undo, which puts the exercise back as it was while nothing else has
  // changed it since.
  const remove = row => {
    const before = e
    const after = removeRow(e, row)
    if (after === e) { toast(t('Keep at least one set, champ')); return }
    edit(() => after)
    toast(t('Set removed'), { action: t('Undo'), onAction: () => edit(c => (JSON.stringify(c) === JSON.stringify(after) ? before : c)) })
  }
  const work = rows.filter(x => x.kind === 'work')
  const lastK = work.length - 1
  const openSetType = row => {
    const warm = row.kind === 'warm'
    const failing = !warm && row.failure
    menuSheet({
      title: t('Select set type'),
      sections: [
        { items: [
          shape.mode !== 'cardio' && { icon: 'sunrise', label: t('Warm-up set'), on: warm, disabled: !warm && !canWarmUp(e, row),
            onClick: () => { if (!warm) edit(c => makeWarmup(c, row)) } },
          { icon: 'dumbbell', label: t('Normal set'), on: !warm && !failing && !row.max,
            onClick: () => { if (warm) edit(makeWork); else if (failing) edit(c => setFailure(c, false)); else if (row.max) edit(c => setMax(c, row.k, false)) } },
          canFail(e) && { icon: 'gauge', label: t('Failure set'), sub: t('The last set only'), on: failing, disabled: warm || row.k !== lastK,
            onClick: () => edit(c => setFailure(c, !failing)) },
          shape.pyramid && !warm && { icon: 'bolt', label: t('As many reps as you can'), on: row.max, onClick: () => edit(c => setMax(c, row.k, !row.max)) },
        ] },
        { title: t('More'), items: [
          { icon: 'slider', label: t('Drop sets, rest-pause, back-off…'), sub: t('In this exercise’s settings'), onClick: openSettings },
        ] },
        { items: [
          { icon: 'xmark', label: t('Remove set'), danger: true, disabled: !warm && workCount(e) <= 1, onClick: () => remove(row) },
        ] },
      ],
    })
  }

  // The value columns, as the session will log them.
  const cols = shape.mode === 'cardio'
    ? [{ f: 'min', hd: t('MIN'), dec: false }, { f: 'speed', hd: speedUnit === 'mph' ? t('MPH') : t('KM/H'), dec: true,
      view: v => toSpeed(v, speedUnit), store: v => fromSpeed(v, speedUnit) }]
    : [{ f: 'w', hd: (bw ? '+' : '') + S.unit.toUpperCase(), dec: true },
      shape.mode === 'time' ? { f: 'sec', hd: t('SEC'), dec: false } : { f: 'r', hd: shape.ranged ? t('REP RANGE') : t('REPS'), dec: false }]
  const grid = { '--nc': cols.length }
  const cell = (row, c) => {
    if (row.kind === 'warm') return <span key={c.f} className="hv-rt-auto">{c.f === 'w' ? t('Auto') : '–'}</span>
    if (c.f === 'w' && row.fixed) return <span key={c.f} className="hv-rt-fixed" title={t('Back-off sets follow the first set')}>{fmtNum(row.w)}</span>
    if (c.f === 'r' && shape.ranged) return <button key={c.f} type="button" className="hv-rt-range"
      onClick={() => useUI.getState().openSheet(close => <RangeSheet from={row.repsMin} to={row.reps} close={close}
        onDone={(a, b) => edit(cfg => setRange(cfg, a, b))} />)}>{row.repsMin}–{row.reps}</button>
    if (c.f === 'r' && row.max) return <button key={c.f} type="button" className="hv-rt-range" onClick={() => openSetType(row)}>{t('Max')}</button>
    const key = c.f === 'r' ? 'reps' : c.f
    const v = row[key]
    // Hevy's grey dash for a weight not set yet (0); typing one fills it
    return <NumberField key={c.f} decimal={c.dec} className="hv-num" value={c.f === 'w' && !v ? '' : c.view && v != null ? c.view(v) : v ?? ''}
      placeholder={c.f === 'w' ? '–' : undefined}
      aria-label={c.hd + ' ' + t('Set {0}', row.k + 1)}
      onChange={nv => edit(cfg => setWorkField(cfg, r, row.k, c.f, c.store ? c.store(nv) : nv))} />
  }
  const swipe = workoutControls(S).swipeSets
  const mark = row => (row.kind === 'warm' ? <span className="hv-w">W</span> : row.failure ? <span className="hv-f">F</span> : row.k + 1)
  const line = row => <div className="hv-rt-row" style={grid}>
    <button type="button" className="hv-set" onClick={() => openSetType(row)}
      aria-label={row.kind === 'warm' ? t('Warm-up') : t('Set {0}', row.k + 1)}>{mark(row)}</button>
    {cols.map(c => cell(row, c))}
  </div>

  const meta = unitOf.get(i)?.length > 1 && unitOf.get(i)[0] === i ? supersetMeta(r.ex, unitOf.get(i)) : null
  const profile = activeProfile(S)
  const noEquip = profile && !exAvailable(S, ex)
  return <div className={'hv-ex' + (e.sg ? ' hv-in-ss' : '')}>
    {meta && <button type="button" className="hv-ss hv-ss-btn" onClick={() => supersetSheet(meta, m => editList(x => { setSupersetMeta(x, e.sg, m) }))}>
      <span className="hv-sspill"><Icon name="link" />{meta.name || t('Superset')}</span>
      {meta.rest > 0 && <span className="hv-sub">{t('{0} rest', fmtRest(meta.rest))}</span>}<Icon name="pencil" />
    </button>}
    <div className="hv-exhd" {...press}>
      {grip && <button type="button" className="hv-grip" aria-label={t('Move {0}', exerciseNameText(ex))} title={t('Drag to reorder')} {...grip}><Icon name="grip" /></button>}
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button>
      {noEquip && <span className="hv-warn" title={t('Needs {0}, which isn’t in your active profile', t(ex.eq))}><Icon name="warning" /></span>}
      <button type="button" className="iconbtn hv-more" aria-label={t('More')} onClick={openMore}><Icon name="more" /></button>
    </div>
    <input className="hv-notes hv-notes-in" value={note} maxLength={NOTE_MAX} placeholder={t('Add routine notes here')}
      onChange={ev => setNote(ev.target.value)} onBlur={saveNote} aria-label={t('Notes')} />
    <button type="button" className="hv-rest" onClick={openRest}><Icon name="timer" />{t('Rest Timer: {0}', restText)}</button>
    <div className="hv-rt-row hv-rt-head" style={grid} aria-hidden="true">
      <span>{t('SET')}</span>{cols.map(c => <span key={c.f}>{c.hd}</span>)}
    </div>
    {rows.map((row, n) => <div key={n}>
      {swipe ? <SwipeRow deleteLabel={t('Remove')} closeKey={rows.length + ':' + n}
        canDelete={row.kind === 'warm' || workCount(e) > 1} onDelete={() => remove(row)}
        onBlocked={() => toast(t('Keep at least one set, champ'))}>{line(row)}</SwipeRow> : line(row)}
    </div>)}
    <button type="button" className="hv-addset" onClick={() => edit(addRow)}><Icon name="plus" />{t('Add Set')}</button>
  </div>
}

export default function RoutineEditHevy() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const r = S.routines.find(x => x.id === id)
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/workout'))
  useEffect(() => { if (!r) nav('/workout', { replace: true }) }, [!!r])
  // One auto-backup on the way out covers the whole editing session, as upstream's editor does.
  useEffect(() => () => useStore.getState().autoBackupNow?.(), [])
  const [name, setName] = useState(r?.name || '')
  const setR = fn => update(s => { const x = s.routines.find(y => y.id === id); if (x) fn(x) })
  // The picker's "Add superset": a quick add goes to the end of the routine.
  const exOf = () => useStore.getState().S.routines.find(y => y.id === id)?.ex || []
  useSupersetTarget({
    items: exOf,
    end: () => exOf().length - 1,
    pair: (i, j) => setR(x => { x.ex = pairAdjacent(x.ex, i, j) }),
  })
  if (!r) return null

  const addExercise = () => exercisePicker((ex, quick) => {
    if (quick) {
      setR(x => x.ex.push({ id: ex.id, ...defaultConfig(ex.id) }))
      toast(t('“{0}” added to {1}', exerciseNameText(ex), r.name))
    } else exConfigSheet(ex, null, cfg => setR(x => { x.ex.push({ id: ex.id, ...cfg }) }), null, r)
  })
  const printRoutine = () => {
    const owner = useStore.getState().user?.name || ''
    if (MOBILE) printHtml(planPrintHTML(S, owner, { routineId: id }), r.name || t('Routine')).catch(() => { /* dismissed */ })
    else printPlan(S, owner, { routineId: id })
  }
  const openMore = () => menuSheet({
    title: r.name,
    sections: [
      { items: [
        { icon: glyphOf(r.emoji), label: t('Pick an icon'), onClick: () => glyphPicker(r.emoji, g => setR(x => { x.emoji = g })) },
        { icon: 'copy', label: t('Copy routine'), onClick: () => {
          const copy = copyRoutine(r, t('Copy'))
          update(s => { s.routines.push(copy) })
          nav('/plan/r/' + copy.id, { replace: true })
        } },
        r.ex.length > 0 && { icon: 'share', label: t('Print / Save as PDF'), onClick: printRoutine },
      ] },
      { items: [{ icon: 'trash', label: t('Delete routine'), danger: true, onClick: () => confirmSheet({
        title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
        onConfirm: () => { update(s => { deleteRoutine(s, id) }); back() },
      }) }] },
    ],
  })

  const units = supersetUnits(r.ex)
  const unitOf = new Map(units.flatMap(u => u.map(idx => [idx, u])))
  const load = r.ex.length ? loadOfRoutine(r) : null
  // A superset moves as one: a long press on any of its exercises' headers drags the whole unit.
  const reorder = useDragReorder(units.length, (from, to) => setR(x => { reorderRoutineUnit(x.ex, units[from][0], to) }))
  return <div className="hv-routine">
    <PageBar title={t('Edit Routine')} onBack={back}>
      <button type="button" className="iconbtn" aria-label={t('More')} onClick={openMore}><Icon name="more" /></button>
      <button type="button" className="btn primary pill hv-finish" onClick={back}>{t('Done')}</button>
    </PageBar>
    <input className="hv-rtitle" value={name} placeholder={t('Routine title')} aria-label={t('Routine title')}
      onChange={ev => { setName(ev.target.value); const v = ev.target.value.trim(); setR(x => { x.name = v || t('Routine') }) }} />

    {r.ex.length ? <div ref={reorder.listRef} className={'hv-units' + (reorder.drag ? ' is-reordering' : '')}>
      {units.map((u, n) => <section key={u.map(i => r.ex[i].id).join('-') + ':' + u[0]} data-reorder-row style={reorder.rowStyle(n)}
        className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
        {u.map(i => <RoutineExercise key={i + ':' + r.ex[i].id} r={r} i={i} unitOf={unitOf} S={S}
          grip={units.length > 1 ? reorder.handle(n) : null} press={reorder.press(n)} />)}
      </section>)}
    </div> : <div className="hv-empty">
      <Icon name="dumbbell" />
      <b>{t('Get started')}</b>
      <span>{t('Add an exercise to start your routine')}</span>
    </div>}
    <button type="button" className="btn primary hv-addex" onClick={addExercise}><Icon name="plus" />{t('Add Exercise')}</button>

    {/* Upstream's routine-wide settings (views/RoutineEdit.jsx): how its targets move, and
        whether its workouts count at all. */}
    <div className="sect-b hv-rsettings">
      <SelectRow icon="chartLine" title={t('Progression')} sheetTitle={t('Progression')}
        value={r.prog || 'linear'} onChange={v => setR(x => { x.prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))} />
      <Row icon="chartLineSlash" iconTint="var(--orange)" title={t('Deload routine')}
        subtitle={t('Its workouts do not count toward progression. They still show in history and statistics.')}>
        <Switch checked={r.excludeFromProgression === true} onChange={v => setR(x => {
          if (v) x.excludeFromProgression = true
          else delete x.excludeFromProgression
        })} />
      </Row>
    </div>
    <div className="small dim hv-rsettings-note">
      {r.excludeFromProgression
        ? t('A deload routine opens at the numbers set here, so the progression above does not apply to it.') + ' ' + t('The next regular target continues from the last included workout.')
        : t(POLICY_DESC[r.prog || 'linear'] || POLICY_DESC.linear) + ' ' + t('Applies to every exercise in this routine that does not set its own rule.')}
    </div>
    {load && <div className="card hv-rmap">
      <h2>{t('What this session hits')}</h2>
      <BodyMap load={load} body={S.body} />
      <div className="mchips">{rankOf(load).worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}</div>
    </div>}
    <div className="workout-end-spacer" />
  </div>
}
