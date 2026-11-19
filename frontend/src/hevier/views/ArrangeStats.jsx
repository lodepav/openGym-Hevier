// Arrange Statistics (hevier/DECISIONS.md D142), as OpenBite's Arrange Trends: two lists, Tiles and
// Cards, each row a handle that moves it (drag it, or tap it for Move up and Move down, so no drag is
// needed) and a switch that hides it or adds it back. Saved as it changes, in S.hvStatsLayout
// (lib/stats-layout.js). An item whose module or part is off is not listed, as its switch would do
// nothing. Reset puts both lists back in their first order, with Undo.
import { useRef } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import { Switch } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { useDragReorder } from '../components/useDragReorder.js'
import { TILES, CARDS, arrange, moveAmong, toggle, defaults, moduleOn } from '../lib/stats-layout.js'
import { BackTo } from './Statistics.jsx'

const NAMES = {
  tiles: { time: 'Exercise time', weight: 'Body weight', sets: 'Sets per muscle', hours: 'Training time', month: 'Workouts this month', rpe: 'Average RPE' },
  cards: { time: 'Exercise time', weight: 'Body weight', sets: 'Sets per muscle', weekly: 'Weekly chart' },
}
const LISTS = [['tiles', 'Tiles', TILES], ['cards', 'Cards', CARDS]]
const DRAGGED = 8   // px a press on the handle moves before it is a drag, not a tap

const saved = () => { const l = useStore.getState().S.hvStatsLayout; return l && typeof l === 'object' ? l : {} }
const save = (which, layout) => useStore.getState().update(s => { s.hvStatsLayout = { ...saved(), [which]: layout } })

function ArrangeList({ which, title, ids }) {
  const S = useStore(s => s.S)
  const layout = arrange(ids, S.hvStatsLayout?.[which])
  const listed = layout.order.filter(id => moduleOn(S, id))
  // Each write reads the stored layout again: a Move up picked from an open menu acts on what is there now.
  const now = () => arrange(ids, saved()[which])
  const reorder = useDragReorder(listed.length, (from, to) => save(which, moveAmong(now(), listed, from, to)))
  const press = useRef({ y: 0, moved: false })
  const name = id => t(NAMES[which][id])
  const last = listed.length - 1
  const menu = (i, id) => menuSheet({ title: t('Move {0}', name(id)), items: [
    { icon: 'arrowUp', label: t('Move up'), disabled: i === 0, onClick: () => save(which, moveAmong(now(), listed, i, i - 1)) },
    { icon: 'arrowDown', label: t('Move down'), disabled: i === last, onClick: () => save(which, moveAmong(now(), listed, i, i + 1)) },
  ] })
  return <section>
    <h2 className="sec">{t(title)}</h2>
    <div ref={reorder.listRef} className={'list hv-arrlist' + (reorder.drag ? ' is-reordering' : '')}>
      {listed.map((id, i) => {
        const h = reorder.handle(i)
        return <div key={id} data-reorder-row className="item hv-arr" style={reorder.rowStyle(i)}>
          <button type="button" className="hv-grip" aria-label={t('Move {0}', name(id))} {...h}
            onPointerDown={e => { press.current = { y: e.clientY, moved: false }; h.onPointerDown(e) }}
            onPointerMove={e => { if (Math.abs(e.clientY - press.current.y) > DRAGGED) press.current.moved = true; h.onPointerMove(e) }}
            // A drag ends with a click on the handle too; only a tap (or Enter) opens the menu.
            onClick={e => { e.stopPropagation(); if (!press.current.moved) menu(i, id); press.current.moved = false }}>
            <Icon name="grip" /></button>
          <span className="grow hv-arr-n">{name(id)}</span>
          <Switch aria-label={name(id)} checked={!layout.hidden.includes(id)} onChange={() => save(which, toggle(now(), id))} />
        </div>
      })}
    </div>
  </section>
}

export default function ArrangeStats() {
  const reset = () => {
    const before = useStore.getState().S.hvStatsLayout
    useStore.getState().update(s => { s.hvStatsLayout = defaults() })
    // The toast is the app's, so Undo still works once this page is closed.
    useUI.getState().toast(t('Layout reset'), { action: t('Undo'), onAction: () => useStore.getState().update(s => { s.hvStatsLayout = before || defaults() }) })
  }
  return <div className="narrow hv-arrange">
    <BackTo label={t('Statistics')} to="/stats" title={t('Arrange Statistics')}>
      <button type="button" className="hv-link" onClick={reset}>{t('Reset')}</button>
    </BackTo>
    <p className="small dim hv-arr-hint">{t('Drag or tap the handle to move. Switch one off to hide it, on to add it back.')}</p>
    {LISTS.map(([which, title, ids]) => <ArrangeList key={which} which={which} title={title} ids={ids} />)}
  </div>
}
