// Hevy's share sheet for a finished workout (hevier/DECISIONS.md D87): the cards side by side to
// swipe through (Summary · Exercises · Muscles · Records), on black or over a photo the user picks,
// then Save image (the gallery) or Share (the share sheet: social apps, messengers). The picture
// saved or shared is the card in view, exactly as previewed. A month's report (D23) shares the
// same way, with its own cards.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { Button, Segmented } from '../../components/ui.jsx'
import { shareCards, monthCards } from '../lib/share-cards.js'
import { cardImage, loadPhoto, saveCardImage, shareCardImage } from '../lib/share-cards-run.js'

const toast = msg => useUI.getState().toast(msg)

// `cardsOf(S)` makes the cards; `heading` titles the sheet, `file` names the pictures, `title` is
// the share sheet's subject.
function ShareSheet({ cardsOf, heading, file: fileName, title }) {
  const S = useStore(s => s.S)
  const cards = useMemo(() => cardsOf(S), [S.workouts, S.unit, S.hvVolume, S.hvMuscleSets, S.body, S.weekStart, cardsOf])
  const [bg, setBg] = useState('black')
  const [photo, setPhoto] = useState(null)
  const [imgs, setImgs] = useState([])    // [{ blob, url }] per card
  const [at, setAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const file = useRef(null)
  const strip = useRef(null)
  const urls = useRef([])

  useEffect(() => {
    let alive = true
    const over = bg === 'photo' ? photo : null
    Promise.all(cards.map(c => cardImage(c, { photo: over }).catch(() => null))).then(blobs => {
      if (!alive) return
      const next = blobs.map(b => (b ? { blob: b, url: URL.createObjectURL(b) } : null))
      urls.current.forEach(u => URL.revokeObjectURL(u))
      urls.current = next.filter(Boolean).map(x => x.url)
      setImgs(next)
    })
    return () => { alive = false }
  }, [cards, bg, photo])
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), [])

  const pick = async ev => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    const bmp = await loadPhoto(f)
    if (!bmp) { toast(t('Could not read that picture')); return }
    setPhoto(bmp)
    setBg('photo')
  }
  const choose = v => {
    if (v === 'photo' && !photo) { file.current?.click(); return }
    setBg(v)
  }
  const onScroll = () => {
    const el = strip.current
    if (el) setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }
  const cur = imgs[at]
  const name = `go-hevier-${fileName}-${cards[at]?.kind || 'card'}.png`
  const save = async () => {
    setBusy(true)
    const how = await saveCardImage(cur.blob, name)
    setBusy(false)
    if (how === 'gallery') toast(t('Saved to Pictures/Go Hevier'))
    else if (how === 'downloaded') toast(t('Image saved'))
  }
  const share = async () => {
    setBusy(true)
    await shareCardImage(cur.blob, name, title || 'Go Hevier')
    setBusy(false)
  }
  const label = { summary: t('Summary'), exercises: t('Exercises'), muscles: t('Muscles'), records: t('Records'), calendar: t('Calendar') }

  return <div className="hv-share">
    <h3>{heading}</h3>
    <div className="hv-share-strip" ref={strip} onScroll={onScroll}>
      {cards.map((c, i) => <div key={c.kind} className="hv-share-card">
        {imgs[i]?.url
          ? <img src={imgs[i].url} alt={label[c.kind]} />
          : <div className="share-card-ph" aria-hidden="true" />}
      </div>)}
    </div>
    <div className="hv-share-dots" aria-label={label[cards[at]?.kind]}>
      {cards.map((c, i) => <span key={c.kind} className={i === at ? 'on' : ''} />)}
    </div>
    <Segmented value={bg} onChange={choose} options={[
      { value: 'black', label: t('Black') },
      { value: 'photo', label: t('Your photo') },
    ]} />
    {bg === 'photo' && <button type="button" className="hv-share-change" onClick={() => file.current?.click()}>{t('Change photo')}</button>}
    <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
    <div className="hv-share-acts">
      <Button icon="download" disabled={!cur?.blob || busy} onClick={save}>{t('Save image')}</Button>
      <Button variant="primary" icon="share" disabled={!cur?.blob || busy} onClick={share}>{t('Share')}</Button>
    </div>
  </div>
}

/** Opens the share sheet for a saved workout. */
export const shareWorkoutSheet = w => {
  const cardsOf = S => shareCards(S, w, { body: S.body })
  useUI.getState().openSheet(() => <ShareSheet cardsOf={cardsOf} heading={t('Share workout')} file={w.d || 'workout'} title={w.name} />)
}

/** Opens the share sheet for a month's report: `month` is monthCards' input but the store. */
export const shareMonthSheet = month => {
  const cardsOf = S => monthCards(S, { ...month, body: S.body })
  const file = `${month.y}-${String(month.mo + 1).padStart(2, '0')}-report`
  useUI.getState().openSheet(() => <ShareSheet cardsOf={cardsOf} heading={t('Share report')} file={file} title={month.title} />)
}
