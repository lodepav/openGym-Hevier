// Two Settings root values (the ninth critique, 2026-11-22): what Integrations has connected, and
// when Data & backup last made a backup.

/** "Hevy · Health Connect · Strap": the ones on, in that order, `health` the phone's health store
 *  by name ('Health Connect', 'Apple Health'); null with none. */
export function connectedLine({ hevy, health, strap }, tr = s => s) {
  return [hevy && 'Hevy', health && tr(health), strap && tr('Strap')].filter(Boolean).join(' · ') || null
}

/** A daily auto-backup says so (a manual one's date would read older than the copies it makes);
 *  else the newer of the last exported backup (S.hvBackupAt) and the last WebDAV one; null before any. */
export function backupLine({ at, webdavAt, auto }, tr = s => s, ago = String) {
  if (auto) return tr('Auto-backup on')
  const last = Math.max(Number(at) || 0, Number(webdavAt) || 0)
  return last > 0 ? tr('Last backup {0}', ago(last)) : null
}
