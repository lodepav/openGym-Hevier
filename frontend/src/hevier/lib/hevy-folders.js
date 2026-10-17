// Hevy's routine folders brought over by the API import (hevier/DECISIONS.md D30, seam S20). A
// folder becomes D13's `folder` field on the routine. A re-imported routine follows Hevy only while
// its folder is still the one the last import gave it (`hvHevyFolder`), so a folder changed in
// openGym is kept.
import { fetchHevyPages } from '../../lib/import-hevy.js'
import { cleanFolderName, folderOf } from './routine-folders.js'

/** Hevy's folders, [{ id, title, index }]. */
export const fetchHevyFolders = (key, pages = fetchHevyPages) =>
  pages('/v1/routine_folders', key, { resultKey: 'routine_folders', pageSize: 10 })

/**
 * The parsed routines (upstream's `parseHevyRoutines`, `hvFolderId` kept by S20) with their
 * folder's name and place: `hvFolder` (null: none) and `hvFolderAt` (-1: none). Mutates `parsed`.
 */
export function nameFolders(parsed, folders) {
  const byId = new Map((folders || []).filter(f => f && f.id != null).map(f => [String(f.id), f]))
  for (const r of parsed?.routines || []) {
    const f = r.hvFolderId != null ? byId.get(String(r.hvFolderId)) : null
    r.hvFolder = f ? cleanFolderName(f.title) : null
    r.hvFolderAt = f && Number.isFinite(Number(f.index)) ? Number(f.index) : -1
    delete r.hvFolderId
  }
  return parsed
}

/**
 * The S20 step after upstream's import: fetches the folders and names them on `data.routines`.
 * The routines still import when the folders can't be read.
 */
export async function importHevyFolders(key, data, pages) {
  if (!data?.routines?.routines?.length) return
  let folders = []
  try { folders = await fetchHevyFolders(key, pages) } catch { folders = [] }
  nameFolders(data.routines, folders)
}

/**
 * After upstream's `mergeHevyRoutines(S, parsed)` returned `res`: writes the folders onto the
 * routines. The last `res.added` routines of `S.routines` are the new ones (upstream appends
 * them), and they are grouped in Hevy's folder order. Mutates the store draft `S`.
 */
export function applyHevyFolders(S, parsed, res) {
  const list = S.routines || []
  const given = new Map((parsed?.routines || []).filter(r => r.hevyId).map(r => [r.hevyId, r]))
  const added = Math.max(0, Math.min(res?.added || 0, list.length))
  const fresh = new Set(list.slice(list.length - added))
  for (const x of list) {
    const r = x.hevyId ? given.get(x.hevyId) : null
    if (!r || !('hvFolder' in r)) continue
    const hevy = r.hvFolder || null
    const last = typeof x.hvHevyFolder === 'string' ? x.hvHevyFolder || null : null
    if (fresh.has(x) || folderOf(x) === last) {
      if (hevy) x.folder = hevy
      else delete x.folder
    }
    x.hvHevyFolder = hevy || ''
  }
  if (added > 1) {
    const at = x => given.get(x.hevyId)?.hvFolderAt ?? -1
    const tail = list.slice(list.length - added).map((x, i) => [x, i])
    tail.sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1])
    tail.forEach(([x], i) => { list[list.length - added + i] = x })
  }
}
