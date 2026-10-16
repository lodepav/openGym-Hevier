// Hevy's routine folders over openGym's routine list (hevier/DECISIONS.md D13). A routine's folder
// is its `folder` field, a name; no field is "My Routines". The field lives on the routine, so it
// syncs and is backed up with it (lib/sync-merge.js merges a routine field by field), and
// upstream, which never reads it, shows the same routines in the same order.
//
// The folders' order is the order their first routine has in `S.routines`, so there is nothing
// else to store or sync: moving a folder moves its routines as a block. A folder with no routine
// yet exists only on this device (`hevier_folders`), until a routine goes into it.
//
// Every function takes the routines and returns a new list; routines it changes are copies.

export const FOLDERS_KEY = 'hevier_folders'
export const FOLDER_MAX = 40

export const folderOf = r => (typeof r?.folder === 'string' && r.folder.trim() ? r.folder : null)

/** A typed folder name, trimmed and capped, or null when there is nothing left. */
export function cleanFolderName(name) {
  const v = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, FOLDER_MAX)
  return v || null
}

/**
 * The groups the Workout tab shows: "My Routines" (`name: null`) first, then each folder in the
 * order of its first routine, then the empty folders this device keeps. `ids` in list order.
 */
export function folderGroups(routines, empty = []) {
  const groups = [{ name: null, ids: [] }]
  const at = new Map([[null, groups[0]]])
  for (const r of routines || []) {
    const name = folderOf(r)
    if (!at.has(name)) { const g = { name, ids: [] }; at.set(name, g); groups.push(g) }
    at.get(name).ids.push(r.id)
  }
  for (const name of empty) if (name && !at.has(name)) { const g = { name, ids: [] }; at.set(name, g); groups.push(g) }
  return groups
}

/** Folder names in their shown order (no "My Routines"). */
export const folderNames = (routines, empty = []) => folderGroups(routines, empty).slice(1).map(g => g.name)

const withFolder = (r, name) => {
  const next = { ...r }
  if (name) next.folder = name; else delete next.folder
  return next
}

/** Moves routine `from` to `to` within one group, where `from`/`to` index the group. The other
 *  routines keep their places in the list: the group's own slots are refilled in the new order. */
export function reorderInGroup(routines, name, from, to) {
  const slots = []
  routines.forEach((r, i) => { if (folderOf(r) === name) slots.push(i) })
  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return routines
  const members = slots.map(i => routines[i])
  const [held] = members.splice(from, 1)
  members.splice(to, 0, held)
  const next = [...routines]
  slots.forEach((slot, k) => { next[slot] = members[k] })
  return next
}

/** The folders in a new order (`order`, names): My Routines first, then each folder's routines
 *  as a block, each in its own order. */
export function reorderFolders(routines, order) {
  const groups = folderGroups(routines)
  const byName = new Map(groups.map(g => [g.name, g]))
  const names = [null, ...order.filter(n => byName.has(n)), ...groups.slice(1).map(g => g.name).filter(n => !order.includes(n))]
  const byId = new Map(routines.map(r => [r.id, r]))
  return names.flatMap(n => byName.get(n).ids.map(id => byId.get(id)))
}

/** Puts routine `id` into folder `name` (null: My Routines), after that folder's last routine —
 *  or at the end of the list when the folder has none yet. */
export function moveToFolder(routines, id, name) {
  const from = routines.findIndex(r => r.id === id)
  if (from < 0 || folderOf(routines[from]) === (name || null)) return routines
  const moved = withFolder(routines[from], name || null)
  const rest = routines.filter((_, i) => i !== from)
  let at = -1
  rest.forEach((r, i) => { if (folderOf(r) === (name || null)) at = i })
  // My Routines with nothing in it yet goes first, where its group is shown.
  const insert = at >= 0 ? at + 1 : name ? rest.length : 0
  rest.splice(insert, 0, moved)
  return rest
}

/** Every routine in folder `from` goes into `to`; a name already in use joins the two. */
export function renameFolder(routines, from, to) {
  const name = cleanFolderName(to)
  if (!name || name === from) return routines
  return routines.map(r => (folderOf(r) === from ? withFolder(r, name) : r))
}

/** Deleting a folder keeps its routines: they go back to My Routines, in place. */
export function removeFolder(routines, name) {
  return routines.map(r => (folderOf(r) === name ? withFolder(r, null) : r))
}

// The empty folders this device keeps, until a routine goes into each. Never required: a
// private window or a full storage leaves only the folders routines carry.
export function readEmptyFolders() {
  try {
    const v = JSON.parse(localStorage.getItem(FOLDERS_KEY))
    return Array.isArray(v) ? v.map(cleanFolderName).filter(Boolean) : []
  } catch { return [] }
}
export function writeEmptyFolders(names) {
  try { localStorage.setItem(FOLDERS_KEY, JSON.stringify([...new Set(names)])) } catch { /* device-local only */ }
}
/** The empty folders still worth keeping: a folder a routine now carries is no longer empty. */
export const stillEmpty = (routines, names) => names.filter(n => !(routines || []).some(r => folderOf(r) === n))
