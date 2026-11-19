// Statistics, opened from History (hevier/DECISIONS.md D14, D142): the phase filter over the whole
// page, number tiles two to a row, then cards (exercise time, body weight, sets per muscle, the weekly
// chart), in the order and with the ones switched off that Arrange Statistics keeps (lib/stats-layout.js),
// then links to upstream's own statistics, structural balance and Arrange. A tile is the number now, its
// card the more behind it, never the same number again. A tile opens what its card opens; a tile or
// card whose module or data is missing is not drawn.
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum, todayISO, weekStartOf } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { countedS } from '../../lib/counted-log.js'
import Icon from '../../components/Icon.jsx'
import LineChart from '../../components/LineChart.jsx'
import PageBar, { useBack } from '../components/PageBar.jsx'
import { usePhasedS } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import WeeklyChart from '../components/WeeklyChart.jsx'
import MuscleSetsCard from '../components/MuscleSetsCard.jsx'
import { elapsedWords } from '../lib/elapsed.js'
import { partOn } from '../lib/module-parts.js'
import { TILES, CARDS, shown, moduleOn } from '../lib/stats-layout.js'
import { weekExerciseTime, longestExercises, bodyWeightNow, bodyWeightPoints, thisWeek, workoutsThisMonth, weekRpe, trainingTime } from '../lib/stats-tiles.js'
import { HISTORY_PATH } from './History.jsx'

/** The page bar of a fork page under a tab: ‹ back to `to` (named `label`) and the page's title. */
export function BackTo({ label, to, title, children }) {
  return <PageBar title={title} onBack={useBack(to)} backLabel={label}>{children}</PageBar>
}

export function LinkRow({ icon, title, sub, onClick }) {
  return <button type="button" className="card hv-linkrow" onClick={onClick}>
    <Icon name={icon} />
    <span className="hv-linkrow-t"><b>{title}</b>{sub && <span className="hv-sub">{sub}</span>}</span>
    <Icon name="chevronRight" />
  </button>
}

const cardId = id => 'hv-stat-' + id
// A tile with no page of its own scrolls to its card; happy-dom has no scrollIntoView.
const scrollTo = id => () => document.getElementById(cardId(id))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })

function Tile({ id, title, value, sub, spoken, onClick }) {
  const inner = <><span className="hv-stile-t">{title}</span><b>{value}</b><span className="hv-stile-s">{sub}</span></>
  return onClick
    ? <button type="button" className="hv-stile" data-tile={id} aria-label={spoken} onClick={onClick}>{inner}</button>
    : <div className="hv-stile" data-tile={id} role="group" aria-label={spoken}>{inner}</div>
}

function CardHead({ title, link, label, onClick }) {
  return <div className="hv-scard-h"><h2>{title}</h2>
    <button type="button" className="hv-link" aria-label={label} onClick={onClick}>{link}<Icon name="chevronRight" /></button></div>
}

/** Every tile and card the data allows, by id: `{ tile, card }` (either missing when not drawn). A
 *  tile's `scroll` names the card on this page it goes to. */
function items(S, today, nav) {
  const ws = weekStartOf(S)
  const out = {}
  if (moduleOn(S, 'time')) {
    const v = trainingTime(weekExerciseTime(S.workouts, today, ws))
    const longest = longestExercises(S.workouts, today)
    out.time = {
      // This week's timed exercises added up (stats-tiles.js); the card is each exercise's average over 90 days.
      // Both wait for set times in the last 90 days, so a log without them shows no empty 0 min.
      tile: longest.length ? { title: t('Exercise time'), value: v, sub: t('this week'), spoken: t('Exercise time, {0} this week', v), onClick: () => nav('/exercise-time') } : null,
      card: longest.length ? () => <div className="card hv-scard">
        <CardHead title={t('Exercise time')} link={t('All')} label={t('All exercise times')} onClick={() => nav('/exercise-time')} />
        {longest.map(r => {
          const ex = exOr(r.id)
          return <div key={r.id} className="hv-scard-row"><span className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span><b>{elapsedWords(Math.round(r.avg / 1000))}</b></div>
        })}
        <div className="small dim">{t('Average a session, last 90 days')}</div>
      </div> : null,
    }
  }
  // Weigh-ins are not workouts, so the phase filter leaves them as they are.
  const bw = moduleOn(S, 'weight') ? bodyWeightNow(S.bodyweight) : null
  if (bw) {
    const u = S.unit, ch = bw.change, by = ch == null ? '' : fmtNum(Math.abs(ch)) + ' ' + u
    const way = ch == null ? '' : ch < 0 ? t('down {0} in 4 weeks', by) : ch > 0 ? t('up {0} in 4 weeks', by) : t('no change in 4 weeks')
    const pts = bodyWeightPoints(S.bodyweight, today)
    out.weight = {
      tile: { title: t('Body weight'), value: fmtNum(bw.w),
        sub: ch == null ? u : u + ' · ' + (ch < 0 ? '↓ ' : ch > 0 ? '↑ ' : '') + t('{0} in 4 weeks', fmtNum(Math.abs(ch))),
        spoken: t('Body weight, {0}', fmtNum(bw.w) + ' ' + u) + (way ? ', ' + way : ''), onClick: () => nav('/measures') },
      card: () => <div className="card hv-scard">
        <CardHead title={t('Body weight')} link={t('Measurements')} label={t('Measurements')} onClick={() => nav('/measures')} />
        {pts.length ? <div className="chart"><LineChart points={pts} h={90} unit={u} goal={S.targetW} /></div>
          : <div className="muted small">{t('No weigh-ins in the last {0} weeks', 12)}</div>}
      </div>,
    }
  }
  const week = thisWeek(S.workouts, today, ws)
  out.sets = {
    tile: { title: t('Sets per muscle'), value: fmtNum(week.sets), sub: t('sets this week'), spoken: t('Sets per muscle, {0} sets this week', week.sets),
      scroll: 'sets' },
    card: () => <MuscleSetsCard S={S} today={today} />,
  }
  const hours = trainingTime(week.ms)
  out.hours = {
    tile: { title: t('Training time'), value: hours, sub: t('this week'), spoken: t('Training time, {0} this week', hours),
      scroll: 'weekly' },
  }
  out.weekly = { card: () => <div className="card hv-weekchart"><WeeklyChart /></div> }
  const month = workoutsThisMonth(S.workouts, today)
  out.month = { tile: { title: t('Workouts this month'), value: month, sub: t('workouts'), spoken: t('Workouts this month, {0}', month),
    onClick: partOn(S, 'hvStats', 'calendar') ? () => nav('/calendar') : null } }
  if (moduleOn(S, 'rpe')) {
    const { rpe } = weekRpe(S.workouts, today, ws)
    out.rpe = { tile: { title: t('Average RPE'), value: rpe == null ? '–' : fmtNum(rpe), sub: rpe == null ? t('too few rated sets this week') : t('this week'),
      spoken: rpe == null ? t('Average RPE, too few rated sets this week') : t('Average RPE, {0} this week', fmtNum(rpe)), onClick: () => nav('/stats/all') } }
  }
  return out
}

export default function Statistics() {
  const nav = useNavigate()
  const { search } = useLocation()
  // Exercises kept out of progression are kept out of these numbers too (D57).
  const S = usePhasedS(countedS(useStore(s => s.S)))
  const today = todayISO()
  // Upstream links into its own statistics with ?focus=… (Plan's weekly muscle volume row).
  if (/[?&]focus=/.test(search)) return <Navigate to={'/stats/all' + search} replace />
  const layout = S.hvStatsLayout || {}
  const all = items(S, today, nav)
  const cards = shown(CARDS, layout.cards).filter(id => all[id]?.card)
  const tiles = shown(TILES, layout.tiles).filter(id => all[id]?.tile)
  // A tile whose card is on the page scrolls to it; with its card switched off it opens nothing.
  const tileOf = ({ scroll, ...tile }) => (scroll ? { ...tile, onClick: cards.includes(scroll) ? scrollTo(scroll) : null } : tile)
  const ends = [['All statistics', '/stats/all'], S.workouts.length > 0 && ['Structural balance', '/structural-balance'],
    ['Arrange Statistics', '/stats/arrange']].filter(Boolean)
  return <div className="narrow hv-statpage">
    <BackTo label={t('History')} to={HISTORY_PATH} title={t('Statistics')} />
    <PhaseFilter />
    {tiles.length > 0 && <div className="hv-stiles">{tiles.map(id => <Tile key={id} id={id} {...tileOf(all[id].tile)} />)}</div>}
    {/* Called, not mounted as <Card />: a new function each render would remount it and lose its choices. */}
    {cards.map(id => <section key={id} id={cardId(id)} className="hv-ssec" data-card={id}>{all[id].card()}</section>)}
    {/* The page ends as Lifts does: flat accent links. */}
    <div className="hv-lifts-ends">
      {ends.map(([label, to]) => <button key={to} type="button" className="hv-link hv-lifts-link" onClick={() => nav(to)}>{t(label)}<Icon name="chevronRight" /></button>)}
    </div>
  </div>
}
