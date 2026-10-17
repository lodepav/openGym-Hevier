// The import summaries' "Check exercise matches" row and its list (hevier/DECISIONS.md D33,
// seam S23). A choice is kept in S.hvImportMap and the file is read again at once.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, exerciseNameFor } from '../../lib/i18n.js'
import { EXIDX } from '../../lib/exercises.js'
import { menuSheet, exercisePicker } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { titlesOf, reviewList, choose, rerun } from '../lib/import-review.js'

const nameOf = (S, id) => (EXIDX[id] ? exerciseNameFor(EXIDX[id]) : (S.customEx || []).find(c => c.id === id)?.n || id)

export function ReviewRow({ parsed }) {
  const S = useStore(s => s.S)
  const titles = titlesOf(parsed)
  if (!titles.length) return null
  const own = reviewList(titles, S).filter(x => !x.id).length
  const open = () => useUI.getState().openSheet(close => <ReviewSheet parsed={parsed} close={close} />)
  return <button type="button" className="row between hv-review-row" onClick={open}
    style={{ width: '100%', padding: '10px 2px', borderTop: '1px solid var(--sep)', gap: 12, textAlign: 'start' }}>
    <div>
      <div className="tt" style={{ fontSize: 15 }}>{t('Check exercise matches')}</div>
      <div className="small dim">{t('{0} exercises · {1} added as your own', titles.length, own)}</div>
    </div>
    <Icon name="chevronRight" />
  </button>
}

function ReviewSheet({ parsed, close }) {
  const S = useStore(s => s.S)
  const [, bump] = useState(0)
  const list = reviewList(titlesOf(parsed), S)
  const set = (key, value) => {
    useStore.getState().update(s => choose(s, key, value))
    rerun(parsed, useStore.getState().S)
    bump(n => n + 1)
  }
  const pick = x => menuSheet({
    title: x.title,
    sections: [{ items: [
      { icon: 'magnifier', label: t('Pick from the library'), onClick: () => {
        const picker = exercisePicker(ex => { picker?.close?.(); set(x.key, ex.id) }, { title: x.title, like: x.id || undefined })
      } },
      { icon: 'person', label: t('Keep as your own exercise'), on: x.chosen && !x.id, onClick: () => set(x.key, 'custom') },
      ...(x.chosen ? [{ icon: 'undo', label: t('Use the automatic match'), onClick: () => set(x.key, null) }] : []),
    ] }],
  })
  return <>
    <h3>{t('Check exercise matches')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Tap one to change what it becomes. Your choice is remembered for the next import.')}</div>
    <div className="list" style={{ gap: 0 }}>
      {list.map(x => <button type="button" key={x.key} className="row between hv-review-item" onClick={() => pick(x)}
        style={{ width: '100%', padding: '10px 2px', borderTop: '1px solid var(--sep)', gap: 12, textAlign: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="tt capitalize" style={{ fontSize: 15 }}>{x.title}</div>
          <div className="small" style={{ color: x.id ? 'var(--label-2)' : 'var(--yellow)' }}>
            {x.id ? '→ ' + nameOf(S, x.id) : t('Your own exercise')}{x.chosen ? ' · ' + t('your choice') : ''}
          </div>
        </div>
        <Icon name="chevronRight" />
      </button>)}
    </div>
    <div style={{ height: 12 }} />
    <button type="button" className="btn primary" style={{ width: '100%' }} onClick={close}>{t('Done')}</button>
  </>
}
