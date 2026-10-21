// D77 at run time: when the app is opened, a newer Go Hevier asks once, with Install and Not now.
// Install is About's own path (upstream's lib/update.js): the release's checksum, the download
// straight to disk, the system installer, which refuses a file that does not match.
import { useState } from 'react'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import { useUI } from '../../store/useUI.js'
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { checkForUpdate, downloadAndInstall, fetchChecksum } from '../../lib/update.js'
import { shouldOffer, readSeen, writeSeen } from '../lib/update-notice.js'

function Progress({ bind }) {
  const [text, setText] = useState(t('Starting download…'))
  const [pct, setPct] = useState(0)
  bind((received, total) => {
    if (total > 0) { const p = Math.min(100, Math.round(received / total * 100)); setPct(p); setText(t('{0} %', p)) }
    else setText(t('{0} MB', (received / 1_000_000).toFixed(1)))
  })
  return <div className="hv-upd">
    <h3>{t('Downloading update…')}</h3>
    <div className="hv-upd-bar"><div style={{ width: pct + '%' }} /></div>
    <div className="muted small">{text}</div>
  </div>
}

async function install(info) {
  let close = null, set = null
  useUI.getState().openSheet(c => { close = c; return <Progress bind={fn => { set = fn }} /> }, { locked: true })
  try {
    let hash = null
    try { hash = await fetchChecksum(info.hashUrl) } catch { /* reported below */ }
    if (!/^[0-9a-f]{64}$/i.test(hash || '')) throw new Error(t('Checksum not available, so not installing'))
    await downloadAndInstall(info.apkUrl, hash, (r, n) => set?.(r, n))
    close?.()
  } catch (e) {
    close?.()
    useUI.getState().toast?.(t('Update failed: {0}', e.message))
  }
}

function offer(info) {
  // Asked is answered: Not now and a tap outside wait for the next version; About still offers this one.
  writeSeen(info.latestVersion)
  menuSheet({
    title: t('Go Hevier {0} is available', info.latestVersion),
    subtitle: t('It downloads here and Android’s installer opens. Your data stays as it is.'),
    items: [
      { icon: 'download', label: t('Install'), onClick: () => install(info) },
      { icon: 'xmark', label: t('Not now'), sub: t('Settings → About still has it.'), onClick: () => {} },
    ],
  })
}

/** At launch and on every return to the app: a newer release, not yet offered, with no workout open. */
let started = false
export function initUpdateNotice(store) {
  if (!MOBILE || started) return
  started = true
  const check = async () => {
    if (document.hidden || !(await isAndroid())) return
    const info = await checkForUpdate().catch(() => null)
    if (shouldOffer(info, readSeen(), !!store.get()?.active)) offer(info)
  }
  setTimeout(check, 4000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(check, 1000) })
}
