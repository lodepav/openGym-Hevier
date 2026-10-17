// The Hevy import sheet's extra rows (hevier/DECISIONS.md D31, seam S21): the body measurements
// with their switch, the workouts an import links to their routines, and a line when Hevy's weight
// unit is not the profile's. Drawn like upstream's rows above them.
import { t } from '../../lib/i18n.js'
import { Switch } from '../../components/ui.jsx'
import { freshMeasures, linkable } from '../lib/hevy-more.js'

export function HevyMoreRows({ data, st, want, setWant }) {
  const all = data?.hvMeasures || []
  const fresh = freshMeasures(st, all).length
  const links = linkable(st, data?.workouts?.workouts)
  return <>
    {all.length > 0 && <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', gap: 12 }}>
      <div>
        <div className="tt" style={{ fontSize: 15 }}>{t('Import body measurements')}</div>
        <div className="small dim">{t('{0} new · {1} days already here', fresh, all.length - fresh)}</div>
      </div>
      <Switch checked={want} onChange={setWant} />
    </div>}
    {links > 0 && <div className="small dim" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)' }}>
      {t('Workouts to link to their routine: {0}', links)}
    </div>}
    {data?.hvUnit && data.hvUnit !== st.unit && <div className="small" style={{ color: 'var(--yellow)', padding: '10px 2px', borderTop: '1px solid var(--sep)' }}>
      {t('Your Hevy account shows weights in {0}, this app in {1}: they come in as {1}.', data.hvUnit, st.unit)}
    </div>}
  </>
}

/** The toast's part for what the fork merged, or ''. */
export const moreToast = ({ measures, linked }) => [
  measures ? t('Body measurements imported: {0}', measures) : '',
  linked ? t('Workouts linked to their routine: {0}', linked) : '',
].filter(Boolean).join(' · ')
