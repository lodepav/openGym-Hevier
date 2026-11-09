// The exercise pictures as a download (D115): the question at launch, the download's progress, and
// the section on Settings → About. The state is lib/media-pack-run.js; the rules lib/media-pack.js.
import { useEffect } from 'react'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import { useUI } from '../../store/useUI.js'
import { Section, Row } from '../../components/ui.jsx'
import { mbText } from '../lib/media-pack.js'
import { WANT, useMedia, readStatus, onMetered, startDownload, cancelDownload, writeDeclined } from '../lib/media-pack-run.js'

const pctOf = f => Math.min(100, Math.max(0, Math.round(f * 100)))
const progressText = m => m.phase === 'unpack' ? t('Unpacking… {0} %', pctOf(m.fraction)) : t('{0} %', pctOf(m.fraction))

function Progress({ close }) {
  const m = useMedia()
  useEffect(() => { if (m.state !== 'running') close() }, [m.state, close])
  return <div className="hv-upd">
    <h3>{t('Downloading exercise pictures…')}</h3>
    <div className="hv-upd-bar"><div style={{ width: pctOf(m.fraction) + '%' }} /></div>
    <div className="muted small">{progressText(m)}</div>
    <p className="muted small">{t('You can close this: it carries on while the app is open.')}</p>
    <button type="button" className="btn" onClick={() => { cancelDownload(); close() }}>{t('Cancel')}</button>
  </div>
}

const failText = code => code === 'space'
  ? t('Not enough free space: the pictures need about {0}.', mbText(WANT.bytes * 2))
  : code === 'checksum' ? t('The download was damaged. Try again from Settings → About.')
  : t('The download failed. Try again from Settings → About.')

/** Downloads, with the progress sheet; a toast says how it ended. */
export async function download() {
  useUI.getState().openSheet(close => <Progress close={close} />)
  const ok = await startDownload()
  const m = useMedia.getState()
  if (ok) useUI.getState().toast?.(t('Exercise pictures are ready.'))
  else if (m.state === 'error') useUI.getState().toast?.(failText(m.error))
}

/** The question, once per version: asked is answered, so Not now, a tap outside or a failed
 *  download all wait for the next version (as UpdateNotice does). About still offers it. */
export async function askMedia(status) {
  writeDeclined(WANT.version)
  const metered = await onMetered()
  const size = mbText(WANT.bytes)
  menuSheet({
    title: t('Download the exercise pictures?'),
    subtitle: [
      status?.version ? t('This version has new exercise pictures, {0}.', size) : t('The pictures and animations of every exercise, {0}.', size),
      t('They download once and stay through updates.'),
      metered ? t('You are on mobile data.') : null,
    ].filter(Boolean).join(' '),
    items: [
      { icon: 'download', label: t('Download'), onClick: () => download() },
      { icon: 'xmark', label: t('Not now'), sub: t('Settings → About still has it.'), onClick: () => {} },
    ],
  })
}

/** Settings → About: what is on the phone, and the download. Only in a build without the pictures. */
export function MediaSection() {
  const m = useMedia()
  useEffect(() => { readStatus() }, [])
  const s = m.status
  if (!WANT || !s || s.bundled) return null
  const current = s.version === WANT.version
  return <Section title={t('Exercise pictures')}
    footer={t('Kept in the app’s own storage, so an update does not download them again.')}>
    {m.state === 'running'
      ? <Row icon="download" title={t('Downloading exercise pictures…')} value={progressText(m)}
          accessory="chevron" onClick={() => useUI.getState().openSheet(close => <Progress close={close} />)} />
      : current
        ? <Row icon="check" title={t('Downloaded')} value={mbText(s.bytes || WANT.bytes)} />
        : <Row icon="download" title={s.version ? t('Download the new pictures') : t('Download')} value={mbText(WANT.bytes)}
            accessory="chevron" onClick={() => askMedia(s)} />}
  </Section>
}
