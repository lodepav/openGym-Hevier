// The wiring around media-pack.js (D115): the HevierMedia plugin, the download's state for the
// question and the About section, and the check at launch. The rules are media-pack.js.
import { create } from 'zustand'
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { wantedMedia, mediaPlan } from './media-pack.js'

export const WANT = wantedMedia((import.meta.env || {}).VITE_HEVIER_MEDIA)
export const DECLINED_KEY = 'hevier_media_declined'

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/secret.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !WANT || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ P: registerPlugin('HevierMedia') }))
  return pluginP
}

/** state: 'idle' | 'running' | 'done' | 'error'; phase and fraction while running; status as last read. */
export const useMedia = create(() => ({ state: 'idle', phase: 'download', fraction: 0, error: null, status: null }))

export async function readStatus() {
  const p = await plugin()
  if (!p) return null
  try {
    const status = await p.P.status()
    useMedia.setState({ status })
    return status
  } catch { return null }
}

/** Whether the phone is on mobile data now (false when it cannot tell). */
export async function onMetered() {
  const p = await plugin()
  try { return !!p && !!(await p.P.network()).metered } catch { return false }
}

export const readDeclined = () => { try { return localStorage.getItem(DECLINED_KEY) || '' } catch { return '' } }
export const writeDeclined = v => { try { localStorage.setItem(DECLINED_KEY, v) } catch { /* private mode */ } }

let running = null
/** Downloads and installs the media this build wants; one run at a time. Resolves true once installed. */
export function startDownload() {
  if (running) return running
  // Running before the first await: the progress sheet, opened in the same tap, closes itself on
  // any other state.
  const before = useMedia.getState().state
  useMedia.setState({ state: 'running', phase: 'download', fraction: 0, error: null })
  running = (async () => {
    const p = await plugin()
    if (!p) { useMedia.setState({ state: before }); running = null; return false }
    const sub = await p.P.addListener('progress', e => useMedia.setState({ phase: e?.phase || 'download', fraction: Number(e?.fraction) || 0 }))
    try {
      await p.P.download(WANT)
      useMedia.setState({ state: 'done' })
      await readStatus()
      return true
    } catch (e) {
      const code = e?.code || e?.message || 'failed'
      useMedia.setState({ state: code === 'cancelled' ? 'idle' : 'error', error: code })
      return false
    } finally {
      sub?.remove?.()
      running = null
    }
  })()
  return running
}

export async function cancelDownload() {
  const p = await plugin()
  try { await p?.P.cancel() } catch { /* nothing running */ }
}

/** At launch: the question, when the media are missing or another version and it was not declined. */
let started = false
export function initMediaPack(store, ask) {
  if (!MOBILE || !WANT || started) return
  started = true
  setTimeout(async () => {
    const status = await readStatus()
    if (mediaPlan(WANT, status, readDeclined()) === 'ask' && !store.get()?.active) ask(status)
  }, 1500)
}
