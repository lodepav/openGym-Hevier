// Hevy's Measures (hevier/DECISIONS.md D14; reference/SCREENS.md §11), opened from History: body
// weight with upstream's own log, goal and weigh-in list, then upstream's body measurements and
// progress photos pages.
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { fmtDate } from '../lib/dates.js'
import { lastBW } from '../../lib/history.js'
import { bwSheet, goalSheet, weighInsSheet } from '../../sheets.jsx'
import LineChart from '../../components/LineChart.jsx'
import { Button } from '../../components/ui.jsx'
import { BackTo, LinkRow } from './Statistics.jsx'
import { HISTORY_PATH } from './History.jsx'
import { useHcOnly } from '../lib/weigh-in-source.js'
import { partOn } from '../lib/module-parts.js'
import { measurementsLine, photosLine } from '../lib/measures-rows.js'
import { progressPhotosOf } from '../../views/ProgressPhotos.jsx'
import { goalGap } from '../lib/body-goal.js'

const DAYS_SHOWN = 90

export default function Measures() {
  const nav = useNavigate()
  const from = useLocation().state?.back
  const S = useStore(s => s.S)
  const weightOn = partOn(S, 'body', 'weight'), measOn = partOn(S, 'body', 'measurements'), photosOn = partOn(S, 'body', 'photos')
  const hc = useHcOnly(S)
  const last = lastBW(S)
  const since = Date.now() - DAYS_SHOWN * 86400000
  const pts = S.bodyweight.map(b => ({ t: b.t || new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d })).filter(p => p.t > since)
  const recent = S.bodyweight.slice(-5).reverse()
  // The chart said only its name; now the last weight and its change over the days it shows (the eighth critique, 2026-11-22).
  const ch = pts.length > 1 ? Math.round((pts.at(-1).y - pts[0].y) * 10) / 10 : null, by = ch == null ? '' : fmtNum(Math.abs(ch)) + ' ' + S.unit
  const chartName = pts.length ? [t('Body weight chart'), fmtNum(pts.at(-1).y) + ' ' + S.unit, ch == null ? ''
    : ch < 0 ? t('down {0} in {1} days', by, DAYS_SHOWN) : ch > 0 ? t('up {0} in {1} days', by, DAYS_SHOWN) : t('no change in {0} days', DAYS_SHOWN)].filter(Boolean).join(', ') : ''
  // With weigh-ins from Health Connect there is no Log: the empty well names the source, else it opens the weigh-in (the eighth critique).
  const none = S.bodyweight.length ? t('No weigh-ins in the last {0} days', DAYS_SHOWN)
    : hc ? t('No weigh-ins yet from Health Connect. Check that Go Hevier may read weight there and that your scale app writes it.') : t('No weigh-ins yet. Log your weight to start the curve.')
  // How far the last weigh-in is from the goal (the ninth critique, 2026-11-22).
  const gap = last && goalGap(last.w, S.targetW)
  const goalText = S.targetW ? fmtNum(S.targetW) + ' ' + S.unit : null
  return <div className="narrow hv-measures">
    {/* Back names the page it returns to: Statistics links here too (the fresh audit, 2026-11-21). */}
    {/* A cold open goes up to the page back names (the fifth audit, 2026-11-21). */}
    <BackTo label={t(from === 'Statistics' ? 'Statistics' : 'History')} to={from === 'Statistics' ? '/stats' : HISTORY_PATH} title={t('Measures')} />
    {/* Body's parts (D102): the weight, the measurements and the photos, each on its own switch. */}
    {weightOn && <><div className="card">
      {/* Goal and Log on the heading's line, the weight under them (the ninth critique, 2026-11-22). */}
      <div className="row between hv-ms-top">
        {/* A heading as the parts below are, drawn as before (the eighth round, 2026-11-22). */}
        <h2 className="muted small hv-ms-h">{t('Body weight')}</h2>
        <div className="row" style={{ gap: 8 }}>
          {/* The goal with its unit; with none, what a tap does (the ninth critique). */}
          <Button size="sm" icon="target" onClick={goalSheet} aria-label={goalText ? t('Goal') + ' ' + goalText : undefined}>{goalText || t('Set goal')}</Button>
          {!hc && <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>}
        </div>
      </div>
      {hc && <div className="small dim">{t('From Health Connect')}</div>}
      {last && <div className="big">{fmtNum(last.w)} <span className="muted hv-ms-unit">{S.unit}</span></div>}
      {last && <div className="small dim">{fmtDate(last.d, true)}</div>}
      {gap && <div className="small dim hv-ms-gap">{gap.reached ? t('Goal reached') : t(gap.up ? '{0} to gain' : '{0} to lose', fmtNum(gap.by) + ' ' + S.unit)}</div>}
      {pts.length > 0 ? <div className="chart" role="img" aria-label={chartName}><LineChart points={pts} h={150} unit={S.unit} goal={S.targetW} /></div>
        : hc ? <div className="hv-ms-empty">{none}</div>
        : <button type="button" className="hv-ms-empty hv-ms-empty-btn" onClick={() => bwSheet()}>{none}</button>}
    </div>
    {/* Hevy lists the latest entries under the chart; the whole log is upstream's sheet */}
    {recent.length > 0 && <>
      <h2 className="sec">{t('Recent weigh-ins')}</h2>
      {/* One button, not five that all open the same list (the fresh audit, 2026-11-21). */}
      <button type="button" className="hv-ms-list" onClick={weighInsSheet}
        aria-label={recent.map(b => fmtDate(b.d, true) + ' ' + fmtNum(b.w) + ' ' + S.unit).join(', ') + '. ' + t('All weigh-ins')}>{recent.map(b => <span key={b.d + (b.t || '')} className="hv-ms-row">
        <span>{fmtDate(b.d, true)}</span><b>{fmtNum(b.w)} {S.unit}</b>
      </span>)}</button>
      {S.bodyweight.length > recent.length && <Button variant="ghost" className="hv-ms-all" trailingIcon="chevronRight" onClick={weighInsSheet}>{t('All weigh-ins')}</Button>}
    </>}</>}
    {(measOn || photosOn) && <h2 className="sec">{!weightOn ? t('Measures') : measOn && photosOn ? t('Measurements and photos') : measOn ? t('Measurements') : t('Photos')}</h2>}
    {/* Empty, each says so, not a bare title (the seventh critique, 2026-11-22). */}
    {measOn && <LinkRow icon="ruler" title={t('Body measurements')}
      sub={measurementsLine(S) || t('None yet')}
      onClick={() => nav('/measurements')} />}
    {photosOn && <LinkRow icon="camera" title={t('Progress photos')} sub={photosLine(progressPhotosOf(S)) || t('None yet')} onClick={() => nav('/progress-photos')} />}
  </div>
}
