// Hevy's Measures (hevier/DECISIONS.md D14; reference/SCREENS.md §11), opened from Profile: body
// weight with upstream's own log, goal and weigh-in list, then upstream's body measurements and
// progress photos pages.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { lastBW } from '../../lib/history.js'
import { bwSheet, goalSheet, weighInsSheet } from '../../sheets.jsx'
import LineChart from '../../components/LineChart.jsx'
import { Button } from '../../components/ui.jsx'
import { BackTo, LinkRow } from './Statistics.jsx'

const DAYS_SHOWN = 90

export default function Measures() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const last = lastBW(S)
  const since = Date.now() - DAYS_SHOWN * 86400000
  const pts = S.bodyweight.map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d })).filter(p => p.t > since)
  const lastM = (S.measurements || []).at(-1)
  return <div className="narrow hv-measures">
    <BackTo label={t('Profile')} to="/profile" />
    <div className="hdr"><div><h1>{t('Measures')}</h1></div></div>
    <div className="card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="muted small">{t('Body weight')}</div>
          <div className="big">{last ? <>{fmtNum(last.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></> : '–'}</div>
          {last && <div className="small dim">{fmtDate(last.d, true)}</div>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {pts.length > 0 && <div className="chart"><LineChart points={pts} h={150} unit={S.unit} goal={S.targetW} /></div>}
      {S.bodyweight.length > 0 && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={weighInsSheet}>{t('All weigh-ins')}</Button>
      </div>}
    </div>
    <LinkRow icon="ruler" title={t('Body measurements')}
      sub={lastM ? t('Last check-in {0}', fmtDate(lastM.d, true)) : t('Waist, arms, body fat and anything else you measure, each with its own curve.')}
      onClick={() => nav('/measurements')} />
    <LinkRow icon="camera" title={t('Progress photos')} sub={t('Every photo you kept with a workout, lined up by date. Plus a before/after slider.')} onClick={() => nav('/progress-photos')} />
  </div>
}
