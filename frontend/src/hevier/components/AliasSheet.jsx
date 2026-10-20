// An exercise's other names (D73): each one found by the search, and a switch to show one in place
// of the exercise's own name. With every switch off, the names show only on the exercise's details.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { Switch } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { aliasesOf, shownAlias, addAlias, removeAlias, showAlias, ALIAS_MAX } from '../lib/ex-aliases.js'

function AliasSheet({ ex }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [v, setV] = useState('')
  const names = aliasesOf(S, ex.id)
  const shown = shownAlias(S, ex.id)
  const add = () => { if (!v.trim()) return; update(s => { addAlias(s, ex.id, v) }); setV('') }
  return <div className="hv-aliases">
    <h3>{t('Other names')}</h3>
    <p className="sect-f">{t('The search finds the exercise by each of them. Switch one on to show it in place of “{0}”.', ex.n)}</p>
    {names.length > 0 && <div className="list">
      {names.map(n => <div key={n} className="item">
        <span className="hv-alias-name">{n}</span>
        <Switch checked={n === shown} aria-label={t('Show “{0}” as its name', n)}
          onChange={on => update(s => { showAlias(s, ex.id, on ? n : null) })} />
        <button type="button" className="iconbtn" aria-label={t('Remove “{0}”', n)}
          onClick={() => update(s => { removeAlias(s, ex.id, n) })}><Icon name="trash" /></button>
      </div>)}
    </div>}
    <form className="hv-alias-add" onSubmit={e => { e.preventDefault(); add() }}>
      <input className="input" value={v} maxLength={ALIAS_MAX} placeholder={t('Another name')}
        aria-label={t('Another name')} onChange={e => setV(e.target.value)} />
      <button type="submit" className="btn primary" disabled={!v.trim()}>{t('Add')}</button>
    </form>
  </div>
}

export const aliasSheet = ex => useUI.getState().openSheet(() => <AliasSheet ex={ex} />)
