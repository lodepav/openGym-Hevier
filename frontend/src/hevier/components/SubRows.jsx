// A set's drops and rest-pause bursts (or one side's), indented under it as Hevy's `D` rows. `edit`
// changes the set row, `show` and `store` turn a stored weight into the exercise's unit and back.
import { t } from '../../lib/i18n.js'
import { dropsOf, clustersOf } from '../../lib/workout-model.js'
import Icon from '../../components/Icon.jsx'
import { NumberField } from '../../components/ui.jsx'
import { withoutDrop, withDropField, withoutBurst, withBurstReps } from '../lib/set-rows.js'

export default function SubRows({ src, side, show, store, edit }) {
  return <>
    {dropsOf(src).map((d, di) => <div key={'d' + di} className="hv-row hv-sub-row" style={{ '--nc': 2 }}>
      <span className="hv-set"><span className="hv-d">D</span></span><span />
      <NumberField decimal className="hv-num" value={show(d.w) ?? ''} aria-label={t('Drop {0}', di + 1)}
        onChange={v => edit(row => withDropField(row, di, 'w', store(v), side))} />
      <NumberField decimal={false} className="hv-num" value={d.r ?? ''} aria-label={t('Reps')}
        onChange={v => edit(row => withDropField(row, di, 'r', v, side))} />
      <button type="button" className="iconbtn hv-x" aria-label={t('Remove drop')} onClick={() => edit(row => withoutDrop(row, di))}>
        <Icon name="xmark" /></button>
    </div>)}
    {clustersOf(src).map((c, ci) => <div key={'c' + ci} className="hv-row hv-sub-row" style={{ '--nc': 2 }}>
      <span className="hv-set"><span className="hv-d">+</span></span><span className="hv-prev">{c.restSec}s</span><span />
      <NumberField decimal={false} className="hv-num" value={c.r ?? ''} aria-label={t('Burst {0}', ci + 1)}
        onChange={v => edit(row => withBurstReps(row, ci, v, side))} />
      <button type="button" className="iconbtn hv-x" aria-label={t('Remove burst')} onClick={() => edit(row => withoutBurst(row, ci))}>
        <Icon name="xmark" /></button>
    </div>)}
  </>
}
