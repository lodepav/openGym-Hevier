// The Routines page on /routines, opened from Today (hevier/DECISIONS.md D130, after D13 and D126):
// the routines in folders that fold (lib/routine-folders.js), each a row with its next planned day
// or when it was last done (lib/routine-when.js), the next one marked with its Start in the accent
// colour; a tap on a row opens its next session's page, a long press or ⋯ its menu. + Routine,
// + Folder, Rotation (upstream's Plan screen), Empty workout and Explore sit at the end.
// Starting goes through upstream's startFlow.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { todayISO, uid, exCount } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { routineWhen } from '../lib/routine-when.js'
import { DEMO } from '../../lib/demo.js'
import { deleteRoutine } from '../../lib/routines.js'
import { copyRoutineHere } from '../lib/routine-copy.js'
import { DEFAULT_GLYPH } from '../../lib/glyphs.js'
import { startFlow as upstreamStart, starterPlanSheet, menuSheet, confirmSheet } from '../../sheets.jsx'
import { deleteRoutineWithUndo } from '../../views/Plan.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar, { useBack } from '../components/PageBar.jsx'
import { useDragReorder } from '../components/useDragReorder.js'
import { nameSheet } from '../components/NameSheet.jsx'
import { previewPath } from './RoutinePreview.jsx'
import { discardActive } from '../components/HevyTabBar.jsx'
import {
  folderGroups, folderNames, reorderInGroup, reorderFolders, moveToFolder, renameFolder, deleteFolder, restoreFolder,
  cleanFolderName, readEmptyFolders, writeEmptyFolders, readClosedFolders, writeClosedFolders, stillEmpty, folderOf, FOLDER_MAX,
} from '../lib/routine-folders.js'

// Which folders are folded shut: a view choice of this device, like Home's layout (D12).
// Starting with a session open would replace it: Hevy asks first, and the open one is discarded
// the way the resume bar's Discard does it. Today's Start and Empty workout start the same way.
export function startFlow(ids) {
  const A = useStore.getState().S.active
  if (!A) return upstreamStart(ids)
  confirmSheet({
    title: t('Workout in progress'), message: t('Starting a new workout discards the one you have open.'),
    confirmText: t('Discard and start'), danger: true,
    onConfirm: () => {
      discardActive()
      upstreamStart(ids)
    },
  })
}
const MINE = '\u0000mine'   // My Routines' key in the folded list: no folder name can be it

// One folder's routines, reordered among themselves by their handles: a long press opens the menu (D130).
function FolderList({ name, ids, row }) {
  const update = useStore(s => s.update)
  const reorder = useDragReorder(ids.length, (from, to) => update(s => { s.routines = reorderInGroup(s.routines, name, from, to) }))
  return <div ref={reorder.listRef} className={'hv-rlist' + (reorder.drag ? ' is-reordering' : '')}>
    {ids.map((id, i) => <div key={id} data-reorder-row style={reorder.rowStyle(i)}>{row(id, ids.length > 1 ? reorder.handle(i) : null)}</div>)}
  </div>
}

const HOLD_MS = 450   // a press held this long opens the row's menu
const SLOP = 8        // px a finger may wander while it is held

// A long press on a row opens its menu; the click it ends with does not also open the row.
function useLongPress() {
  const p = useRef(null)
  const cancel = () => { if (p.current?.timer) clearTimeout(p.current.timer); if (p.current && !p.current.fired) p.current = null }
  return run => ({
    onPointerDown: e => {
      if (e.button != null && e.button !== 0) return
      cancel()
      p.current = { x: e.clientX, y: e.clientY, timer: setTimeout(() => { p.current.fired = true; p.current.timer = 0; navigator.vibrate?.(10); run() }, HOLD_MS) }
    },
    onPointerMove: e => { if (p.current?.timer && Math.hypot(e.clientX - p.current.x, e.clientY - p.current.y) > SLOP) cancel() },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: e => e.preventDefault(),
    onClickCapture: e => { if (p.current?.fired) { p.current = null; e.preventDefault(); e.stopPropagation() } },
  })
}

export default function WorkoutTab() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const hold = useLongPress()
  const { next, text: when } = routineWhen(S, todayISO())
  const [q, setQ] = useState('')
  const found = q.trim() && S.routines.filter(r => r.name.toLowerCase().includes(q.trim().toLowerCase()))

  // The same new routine Plan makes, opened straight in the editor.
  const newRoutine = folder => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [], ...(typeof folder === 'string' ? { folder } : {}) }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }
  // Plan's swipe actions, from Hevy's ⋯: duplicate right below with an Undo, delete with an Undo.
  const duplicate = r => {
    const copy = copyRoutineHere(r, t('Copy'))
    update(s => {
      const at = s.routines.findIndex(x => x.id === r.id)
      s.routines.splice(at < 0 ? s.routines.length : at + 1, 0, copy)
    })
    useUI.getState().toast(t('Copied as “{0}”.', copy.name), { action: t('Undo'), onAction: () => {
      update(s => { if (s.routines.some(x => x.id === copy.id)) deleteRoutine(s, copy.id) })
    } })
  }
  // Folders: the name on each routine, plus the empty ones kept in S.
  const empty = stillEmpty(S.routines, readEmptyFolders(S))
  const setEmpty = names => update(s => { writeEmptyFolders(s, names) })
  const groups = folderGroups(S.routines, empty)
  const closed = readClosedFolders(S)
  const toggle = key => update(s => {
    const was = readClosedFolders(s)
    writeClosedFolders(s, was.includes(key) ? was.filter(k => k !== key) : [...was, key])
  })
  const newFolder = then => nameSheet({
    title: t('New Folder'), placeholder: t('Folder name'), saveLabel: t('Create'), max: FOLDER_MAX,
    onSave: v => { const name = cleanFolderName(v); if (!name) return; setEmpty([...empty, name]); then?.(name) },
  })
  const moveTo = (r, name) => update(s => { s.routines = moveToFolder(s.routines, r.id, name) })
  const moveSheet = r => menuSheet({
    title: t('Move to folder'),
    items: [
      { icon: 'clipboard', label: t('My Routines'), on: !folderOf(r), onClick: () => moveTo(r, null) },
      ...folderNames(S.routines, empty).map(n => ({ icon: 'folder', label: n, on: folderOf(r) === n, onClick: () => moveTo(r, n) })),
      { icon: 'plus', label: t('New Folder'), onClick: () => newFolder(n => moveTo(r, n)) },
    ],
  })
  const folderMore = name => menuSheet({
    title: name,
    items: [
      { icon: 'plus', label: t('New Routine'), sub: t('In this folder'), onClick: () => newRoutine(name) },
      { icon: 'pencil', label: t('Rename Folder'), onClick: () => nameSheet({
        title: t('Rename Folder'), value: name, saveLabel: t('Save'), max: FOLDER_MAX,
        onSave: v => {
          const next = cleanFolderName(v)
          if (!next) return
          update(s => { s.routines = renameFolder(s.routines, name, next) })
          setEmpty(empty.map(n => (n === name ? next : n)))
        },
      }) },
      // With an Undo, as a routine's delete has (Plan.jsx deleteRoutineWithUndo).
      { icon: 'trash', label: t('Delete Folder'), sub: t('Its routines move to My Routines'), danger: true, onClick: () => {
        let snap = null
        update(s => { snap = deleteFolder(s, name) })
        useUI.getState().toast(t('“{0}” gone.', name), { action: t('Undo'), onAction: () => update(s => { restoreFolder(s, snap) }) })
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
  const row = (id, grip) => {
    const r = byId.get(id)
    const isNext = next.includes(id)
    return <div className={'hv-rrow' + (isNext ? ' next' : '')} {...hold(() => more(r))}>
      {grip && <button type="button" className="hv-grip" aria-label={t('Move {0}', r.name)} title={t('Drag to reorder')} {...grip}><Icon name="grip" /></button>}
      <button type="button" className="hv-rname" onClick={() => nav(previewPath(r.id))}>
        <span className="hv-rname-n">{r.name}</span>
        <span className="hv-rname-s">{isNext && <><b className="hv-rnext">{t('Next')}</b>{' · '}</>}
          {[when.get(id), exCount(r.ex.length)].filter(Boolean).join(' · ')}</span>
      </button>
      <button type="button" className={'btn pill hv-rstart' + (isNext ? ' primary' : '')} aria-label={t('Start') + ', ' + r.name}
        disabled={!r.ex.length} onClick={() => startFlow([r.id])}>{t('Start')}</button>
      <button type="button" className="iconbtn" aria-label={t('More') + ', ' + r.name} onClick={() => more(r)}><Icon name="more" /></button>
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
  const head = (g, grip, press) => {
    const key = g.name ?? MINE
    const open = !closed.includes(key)
    return <div className="hv-fhead" {...press}>
      {grip && <button type="button" className="hv-grip" aria-label={t('Move {0}', g.name)} title={t('Drag to reorder')} {...grip}><Icon name="grip" /></button>}
      <button type="button" className="hv-ftoggle" aria-expanded={open} onClick={() => toggle(key)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} />
        <span>{g.name ?? t('My Routines')} ({g.ids.length})</span>
      </button>
      {g.name && <button type="button" className="iconbtn" aria-label={t('More') + ', ' + g.name} onClick={() => folderMore(g.name)}><Icon name="more" /></button>}
    </div>
  }
  const body = g => (closed.includes(g.name ?? MINE) ? null
    : g.ids.length ? <FolderList name={g.name} ids={g.ids} row={row} />
      : <div className="hv-fempty">{g.name ? t('Empty folder. Add a routine with its ⋯ → New Routine, or a routine’s ⋯ → Move to folder.') : t('No routines outside a folder.')}</div>)

  const back = useBack('/home')
  return <div className="narrow hv-wtab">
    <PageBar title={t('Routines')} onBack={back} backLabel={t('Today')} />

    {S.routines.length > 0 && <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search routines')} aria-label={t('Search routines')} value={q} onChange={e => setQ(e.target.value)} />
      {q && <button type="button" className="clear" onClick={() => setQ('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>}
    {/* A search lists the matches alone: no folders, so none is folded shut, and no handles. */}
    {found && (found.length ? <div className="hv-rlist">{found.map(r => <div key={r.id}>{row(r.id, null)}</div>)}</div>
      : <div className="hv-fempty">{t('No routine matches.')}</div>)}
    {!found && (S.routines.length > 0 || folders.length > 0) && <>
      <section className="hv-folder">{head(groups[0])}{body(groups[0])}</section>
      <div ref={folderReorder.listRef} className={'hv-folders' + (folderReorder.drag ? ' is-reordering' : '')}>
        {folders.map((g, i) => <section key={g.name} data-reorder-row className="hv-folder" style={folderReorder.rowStyle(i)}>
          {head(g, folders.length > 1 ? folderReorder.handle(i) : null, folderReorder.press(i))}{body(g)}
        </section>)}
      </div>
    </>}
    {/* The rarely used entries sit at the end (D130): Empty workout is also on Today, Explore is the starter plans. */}
    <div className="hv-chips hv-rend">
      <button type="button" className="hv-chip" onClick={() => newRoutine()}>{t('+ Routine')}</button>
      <button type="button" className="hv-chip" onClick={() => newFolder()}>{t('+ Folder')}</button>
      <button type="button" className="hv-chip" onClick={() => nav('/plan')}>{t('Rotation')}</button>
      <button type="button" className="hv-chip" onClick={() => startFlow([])}>{t('Empty workout')}</button>
      <button type="button" className="hv-chip" onClick={starterPlanSheet}>{t('Explore')}</button>
    </div>
    {!S.routines.length && <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Make one, or grab the starter plan to get going.')}
      {!DEMO && <><br /><button type="button" className="hv-link hv-empty-import" onClick={() => nav('/settings/integrations')}>{t('Import from Hevy')}</button></>}</div>}
  </div>
}
