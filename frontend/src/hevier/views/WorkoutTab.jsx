// Hevy's Workout tab (hevier/DECISIONS.md D13; reference/SCREENS.md §1), shown on /workout when no
// session is open: Quick Start, a Today card from openGym's schedule or rotation, then the
// routines with Start Routine, in folders (lib/routine-folders.js), each dragged by its handle.
// Starting goes through upstream's startFlow, and the schedule stays on upstream's Plan screen.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { effectiveRoutines, effectiveRoutineIds } from '../../lib/history.js'
import { todayISO, uid, exCount } from '../../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { pinState } from '../../lib/queue.js'
import { copyRoutine, deleteRoutine } from '../../lib/routines.js'
import { DEFAULT_GLYPH } from '../../lib/glyphs.js'
import { startFlow, starterPlanSheet, menuSheet } from '../../sheets.jsx'
import { deleteRoutineWithUndo } from '../../views/Plan.jsx'
import Icon from '../../components/Icon.jsx'
import { useDragReorder } from '../components/useDragReorder.js'
import { nameSheet } from '../components/NameSheet.jsx'
import { previewPath } from './RoutinePreview.jsx'
import {
  folderGroups, folderNames, reorderInGroup, reorderFolders, moveToFolder, renameFolder, removeFolder,
  cleanFolderName, readEmptyFolders, writeEmptyFolders, stillEmpty, folderOf, FOLDER_MAX,
} from '../lib/routine-folders.js'

// Which folders are folded shut: a view choice of this device, like Home's layout (D12).
const CLOSED_KEY = 'hevier_folders_closed'
const readClosed = () => { try { const v = JSON.parse(localStorage.getItem(CLOSED_KEY)); return Array.isArray(v) ? v : [] } catch { return [] } }
const writeClosed = v => { try { localStorage.setItem(CLOSED_KEY, JSON.stringify(v)) } catch { /* device-local only */ } }
const MINE = '\u0000mine'   // My Routines' key in the folded list: no folder name can be it

// One folder's routines, reordered by their handles among themselves.
function FolderList({ name, ids, card }) {
  const update = useStore(s => s.update)
  const reorder = useDragReorder(ids.length, (from, to) => update(s => { s.routines = reorderInGroup(s.routines, name, from, to) }))
  return <div ref={reorder.listRef} className={'hv-rlist' + (reorder.drag ? ' is-reordering' : '')}>
    {ids.map((id, i) => <div key={id} data-reorder-row style={reorder.rowStyle(i)}>{card(id, ids.length > 1 ? reorder.handle(i) : null)}</div>)}
  </div>
}

export default function WorkoutTab() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const todayIds = effectiveRoutineIds(S, todayISO())
  const today = effectiveRoutines(S, todayISO())
  const todayName = today.map(r => r.name).join(' + ')
  const moved = S.dayPlan[todayISO()] !== undefined && pinState(S, S.dayPlan[todayISO()]) !== 'done'
  const doneToday = S.workouts.some(w => w.d === todayISO() && today.some(r => (w.routineIds || [w.routineId]).includes(r.id)))

  // The same new routine Plan makes, opened straight in the editor.
  const newRoutine = folder => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [], ...(typeof folder === 'string' ? { folder } : {}) }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }
  // Plan's swipe actions, from Hevy's ⋯: duplicate right below with an Undo, delete with an Undo.
  const duplicate = r => {
    const copy = copyRoutine(r, t('Copy'))
    update(s => {
      const at = s.routines.findIndex(x => x.id === r.id)
      s.routines.splice(at < 0 ? s.routines.length : at + 1, 0, copy)
    })
    useUI.getState().toast(t('Copied as “{0}”.', copy.name), { action: t('Undo'), onAction: () => {
      update(s => { if (s.routines.some(x => x.id === copy.id)) deleteRoutine(s, copy.id) })
    } })
  }
  // Folders: the name on each routine, plus the empty ones this device keeps.
  const [emptyRaw, setEmptyRaw] = useState(readEmptyFolders)
  const empty = stillEmpty(S.routines, emptyRaw)
  const setEmpty = names => { setEmptyRaw(names); writeEmptyFolders(names) }
  const groups = folderGroups(S.routines, empty)
  const [closed, setClosedRaw] = useState(readClosed)
  const toggle = key => { const next = closed.includes(key) ? closed.filter(k => k !== key) : [...closed, key]; setClosedRaw(next); writeClosed(next) }
  const newFolder = then => nameSheet({
    title: t('New folder'), placeholder: t('Folder name'), saveLabel: t('Create'), max: FOLDER_MAX,
    onSave: v => { const name = cleanFolderName(v); if (!name) return; setEmpty([...empty, name]); then?.(name) },
  })
  const moveTo = (r, name) => update(s => { s.routines = moveToFolder(s.routines, r.id, name) })
  const moveSheet = r => menuSheet({
    title: t('Move to folder'),
    items: [
      { icon: 'clipboard', label: t('My Routines'), on: !folderOf(r), onClick: () => moveTo(r, null) },
      ...folderNames(S.routines, empty).map(n => ({ icon: 'folder', label: n, on: folderOf(r) === n, onClick: () => moveTo(r, n) })),
      { icon: 'plus', label: t('New folder'), onClick: () => newFolder(n => moveTo(r, n)) },
    ],
  })
  const folderMore = name => menuSheet({
    title: name,
    items: [
      { icon: 'plus', label: t('New Routine'), sub: t('In this folder'), onClick: () => newRoutine(name) },
      { icon: 'pencil', label: t('Rename folder'), onClick: () => nameSheet({
        title: t('Rename folder'), value: name, saveLabel: t('Save'), max: FOLDER_MAX,
        onSave: v => {
          const next = cleanFolderName(v)
          if (!next) return
          update(s => { s.routines = renameFolder(s.routines, name, next) })
          setEmpty(empty.map(n => (n === name ? next : n)))
        },
      }) },
      { icon: 'trash', label: t('Delete folder'), sub: t('Its routines move to My Routines'), danger: true, onClick: () => {
        update(s => { s.routines = removeFolder(s.routines, name) })
        setEmpty(empty.filter(n => n !== name))
      } },
    ],
  })
  const more = r => menuSheet({
    title: r.name,
    items: [
      { icon: 'pencil', label: t('Edit routine'), onClick: () => nav('/plan/r/' + r.id) },
      { icon: 'folder', label: t('Move to folder'), sub: folderOf(r) || t('My Routines'), onClick: () => moveSheet(r) },
      { icon: 'copy', label: t('Duplicate'), onClick: () => duplicate(r) },
      { icon: 'trash', label: t('Delete routine'), danger: true, onClick: () => deleteRoutineWithUndo(r.id) },
    ],
  })
  const byId = new Map(S.routines.map(r => [r.id, r]))
  const card = (id, grip) => {
    const r = byId.get(id)
    return <div className="card hv-rcard">
      <div className="row between">
        {grip && <button type="button" className="hv-grip" aria-label={t('Move {0}', r.name)} title={t('Drag to reorder')} {...grip}><Icon name="grip" /></button>}
        <button type="button" className="hv-rname" onClick={() => nav(previewPath(r.id))}>{r.name}</button>
        <button type="button" className="iconbtn" aria-label={t('More')} onClick={() => more(r)}><Icon name="more" /></button>
      </div>
      <div className="hv-rpreview">{r.ex.length ? preview(r) : exCount(0)}</div>
      <button type="button" className="btn primary" disabled={!r.ex.length} onClick={() => startFlow([r.id])}>{t('Start Routine')}</button>
    </div>
  }
  const folders = groups.slice(1)
  const folderReorder = useDragReorder(folders.length, (from, to) => {
    const order = folders.map(g => g.name)
    const [held] = order.splice(from, 1)
    order.splice(to, 0, held)
    update(s => { s.routines = reorderFolders(s.routines, order) })
    // Empty folders keep their place among the others on this device.
    setEmpty(order.filter(n => empty.includes(n)))
  })
  const head = (g, grip) => {
    const key = g.name ?? MINE
    const open = !closed.includes(key)
    return <div className="hv-fhead">
      {grip && <button type="button" className="hv-grip" aria-label={t('Move {0}', g.name)} title={t('Drag to reorder')} {...grip}><Icon name="grip" /></button>}
      <button type="button" className="hv-ftoggle" aria-expanded={open} onClick={() => toggle(key)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} />
        <span>{g.name ?? t('My Routines')} ({g.ids.length})</span>
      </button>
      {g.name && <button type="button" className="iconbtn" aria-label={t('More')} onClick={() => folderMore(g.name)}><Icon name="more" /></button>}
    </div>
  }
  const body = g => (closed.includes(g.name ?? MINE) ? null
    : g.ids.length ? <FolderList name={g.name} ids={g.ids} card={card} />
      : <div className="hv-fempty">{g.name ? t('Empty folder. Use ⋯ → Move to folder on a routine.') : t('No routines outside a folder.')}</div>)
  // Each name keeps its own casing class (lib/i18n-core.js exerciseNameClass), as upstream's lists do.
  const preview = r => r.ex.map((e, i) => <span key={i} className={exerciseNameClass(EXIDX[e.id])}>
    {i ? ', ' : ''}{EXIDX[e.id] ? exerciseNameFor(EXIDX[e.id]) : e.n || e.id}</span>)

  return <div className="narrow hv-wtab">
    <div className="hdr"><h1>{t('Workout')}</h1></div>

    <h4 className="sec">{t('Quick Start')}</h4>
    <button type="button" className="btn hv-quick" onClick={() => startFlow([])}><Icon name="plus" />{t('Start Empty Workout')}</button>

    {today.length > 0 && <div className="card hv-today">
      <div className="grow">
        <div className="hv-sub">{t('Today')}{moved ? ' · ' + t('rescheduled') : ''}{doneToday ? ' · ' + t('done') : ''}</div>
        <div className="hv-today-n">{todayName}</div>
      </div>
      <button type="button" className="btn primary pill" onClick={() => startFlow(todayIds)}>{t('Start')}</button>
    </div>}

    <div className="row between hv-rhead"><h4 className="sec">{t('Routines')}</h4>
      <button type="button" className="iconbtn" aria-label={t('New folder')} title={t('New folder')} onClick={() => newFolder()}><Icon name="folder" /></button>
    </div>
    <div className="hv-rbtns">
      <button type="button" className="btn" onClick={() => newRoutine()}><Icon name="clipboard" />{t('New Routine')}</button>
      <button type="button" className="btn" onClick={starterPlanSheet}><Icon name="magnifier" />{t('Explore')}</button>
      <button type="button" className="btn" onClick={() => nav('/plan')}><Icon name="calendar" />{t('Schedule')}</button>
    </div>

    {(S.routines.length > 0 || folders.length > 0) && <>
      <section className="hv-folder">{head(groups[0])}{body(groups[0])}</section>
      <div ref={folderReorder.listRef} className={'hv-folders' + (folderReorder.drag ? ' is-reordering' : '')}>
        {folders.map((g, i) => <section key={g.name} data-reorder-row className="hv-folder" style={folderReorder.rowStyle(i)}>
          {head(g, folders.length > 1 ? folderReorder.handle(i) : null)}{body(g)}
        </section>)}
      </div>
    </>}
    {!S.routines.length && <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Make one, or grab the starter plan to get going.')}</div>}
  </div>
}
