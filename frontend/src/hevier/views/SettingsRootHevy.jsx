// Hevy's Settings root over upstream's pages (hevier/DECISIONS.md D16; reference/SCREENS.md §10),
// through seams S11 and S12 in views/Settings.jsx: upstream's search, account card data and row
// previews, in titled groups; each row opens upstream's own page, less the rows that only steer
// upstream's workout layouts (hevier/lib/settings.js). Preferences also has the fork's Volume row
// (DECISIONS.md D18): sets per muscle or total weight, kept in S.hvVolume. The Volume row's sheet also
// holds Muscle sets (D42): a set for its main muscle only, or a secondary muscle in part too, kept
// in S.hvMuscleSets. Integrations gets the
// fork's heart-rate strap (D79) after Health & devices and export to Hevy (D34) after Training apps (S57).
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import { fmtAgo } from '../../lib/format.js'
import { useUI } from '../../store/useUI.js'
import { loadHealth, onHealthChange } from '../../lib/health-sync.js'
import { loadConfig as webdavConfig } from '../../lib/webdav.js'
import { restTimerText } from '../lib/elapsed.js'
import { timeSpoken } from '../lib/exercise-time.js'
import { useStore } from '../../store/useStore.js'
import { nav } from '../../lib/nav.js'
import { PAGES, pageVisible } from '../../views/settings-pages.js'
import { Section, Row, Switch } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { AvatarFace } from '../../components/Avatar.jsx'
import { menuSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { volumeMode, muscleMode } from '../lib/volume.js'
import { MOBILE } from '../../lib/mobile.js'
import AppIconRow from '../../components/AppIconRow.jsx'
import { SETTINGS_GROUPS, prunePage, relabelPage, hiddenSetting, appendToSection, GymsPage, warmupEffortOn } from '../lib/settings.js'
import { EFFORT, effortOf } from '../../lib/history.js'
import { aboutPage, versionLine } from '../lib/version.js'
import StrapSection from '../components/StrapSection.jsx'
import HevyExportSection from '../components/HevyExportSection.jsx'
import { MediaSection } from '../components/MediaSection.jsx'
import AccentRow from '../components/AccentRow.jsx'
import { HV_ACCENTS, hvAccentId } from '../lib/accents.js'
import { partOn, needOf } from '../lib/module-parts.js'
import { DeloadRows } from '../../components/DeloadCard.jsx'
import { isOn } from '../../lib/modules.js'
import { loadExport, onExportChange } from '../lib/hevy-export-sync.js'
import { loadStrap, onStrapChange } from '../lib/hr-strap-run.js'
import { connectedLine, backupLine, SEP } from '../lib/settings-values.js'
import ForgottenRows from '../../components/ForgottenRows.jsx'

// What the phone has connected, read from each one's file and followed as it changes; each named
// only while its module or part is on, as its section on Integrations is.
function useConnected(ctx) {
  const S = useStore(s => s.S)
  const [c, setC] = useState({})
  useEffect(() => {
    if (!MOBILE) return
    let live = true
    const read = () => Promise.all([loadExport(), loadHealth(), loadStrap()]).then(([x, h, strap]) => {
      if (live) setC({ hevy: !!x?.on, health: !!(h && (h.on || h.readWeight || h.readHr || h.readBody || h.readVitals || h.readSport)), strap: !!strap })
    }).catch(() => {})
    read()
    const offs = [onExportChange(read), onHealthChange(read), onStrapChange(read)]
    return () => { live = false; offs.forEach(off => off()) }
  }, [])
  return connectedLine({ hevy: c.hevy && partOn(S, 'integrations', 'hevy'), health: c.health && isOn(S, 'health') && (ctx?.ios ? 'Apple Health' : 'Health Connect'),
    strap: c.strap && partOn(S, 'health', 'strap') }, t)
}

function SettingsRootHevy({ ctx, preview, open, acct, faceName }) {
  const restSec = useStore(s => s.S.restSec)
  const body = useStore(s => s.S.body)
  const gyms = useStore(s => s.S.equipProfiles)
  const accent = useStore(s => hvAccentId(s.S))
  const ownAccent = useStore(s => s.S.accent === 'custom')
  const mode = useStore(s => volumeMode(s.S))
  const VOLUME = { sets: t('Sets per muscle'), weight: t('Total weight') }
  const mMode = useStore(s => muscleMode(s.S))
  const connected = useConnected(ctx)
  const backupAt = useStore(s => s.S.hvBackupAt)
  const autoBackup = useStore(s => MOBILE && !!s.S.autoBackup)
  // WebDAV's own last backup is kept on the device (lib/webdav.js).
  const backup = backupLine({ at: backupAt, webdavAt: webdavConfig()?.lastOk, auto: autoBackup }, t, fmtAgo)
  const MUSCLE = { main: t('Main muscle only'), share: t('Secondary muscles too') }
  // D18's volume and D42's muscle count are one question, so one row and one sheet.
  // Upstream's menu shows the choice with a tick TalkBack does not read: the label says it (the audit, 2026-11-21).
  const chosen = (label, on) => (on ? <>{label}<span className="hv-sr">, {t('selected')}</span></> : label)
  const pickVolume = () => menuSheet({
    title: t('Volume'),
    sections: [
      { items: Object.entries(VOLUME).map(([v, label]) => ({ label: chosen(label, mode === v), on: mode === v,
        onClick: () => useStore.getState().update(s => { s.hvVolume = v }) })) },
      { title: t('Muscle sets'), items: Object.entries(MUSCLE).map(([v, label]) => ({ label: chosen(label, mMode === v), on: mMode === v,
        onClick: () => useStore.getState().update(s => { s.hvMuscleSets = v }) })) },
    ],
  })
  // The sheet's own words, so the value says what "main" refers to (the tenth critique, 2026-11-22).
  const volumeValue = mode === 'weight' ? VOLUME.weight : VOLUME.sets + SEP + (mMode === 'share' ? t('secondary too') : t('main only'))
  // Upstream's Workout preview also names the layout, which the fork does not offer (D1): the
  // rest timer alone, in upstream's words. Look's preview names upstream's theme (pinned, D17) and
  // accent (the fork's own row, D123), so that row names the fork's accent and the body diagram instead.
  // About's version is in the footer under the groups (D52), so not beside it too (the eighth critique, 2026-11-22).
  // Data & backup: when the last backup was made (S.hvBackupAt, BackupWatch below), "Not backed up yet" before one;
  // Integrations: what is connected (the ninth critique, 2026-11-22).
  // The rest's clock is spoken as a duration, not "one thirty" (the tenth audit, 2026-11-22); parts join with SEP so "· Mon" never starts a line.
  const value = id => (id === 'workout' ? (restSec > 0 ? <span role="img" aria-label={t('{0} rest', timeSpoken(restSec))}>{t('{0} rest', restTimerText(restSec, 0, ''))}</span> : t('No rest timer'))
    // A kept upstream preset is none of the fork's accents nor the user's own colour, so goes unnamed.
    : id === 'look' ? [accent ? t(HV_ACCENTS.find(a => a.id === accent).label) : ownAccent ? t('Your own') : null,
      t(body === 'female' ? 'Female body' : 'Male body')].filter(Boolean).join(SEP)
    : id === 'about' ? null
    : id === 'data' ? backup
    : id === 'integrations' ? connected
    // Upstream's "Fixed Week · Mon" capitalises Week mid-label (C1); its other languages are left as they are.
    : id === 'plan' ? preview.plan?.()?.replace(/^Fixed Week\b/, 'Fixed week').replaceAll(' · ', SEP) || null
    // D62: the gyms, not upstream's filter switch.
    : id === 'equipment' ? (gyms || []).map(g => g?.name).filter(Boolean).join(SEP) || t('No gyms')
    : preview[id]?.() || null)
  // The Workout group's first row is not called Workout too; its page keeps upstream's title.
  // "Gyms": with its gyms named beside it, the longer title wrapped on a phone (the critique, 2026-11-20).
  const title = id => t(id === 'workout' ? 'During a workout' : id === 'equipment' ? 'Gyms' : PAGES[id].title)
  const row = id => <Row key={id} icon={PAGES[id].icon} iconTint={PAGES[id].tint} title={title(id)}
    value={value(id)} accessory="chevron" onClick={() => open(id)} className="sp-root-row" />
  const own = {
    'hv:volume': () => <Row key={'hv:volume'} icon="chart" iconTint="var(--blue)" title={t('Volume')} value={volumeValue} accessory="chevron" onClick={pickVolume} className="sp-root-row" />,
  }
  return SETTINGS_GROUPS.map(g => {
    const ids = g.ids.filter(id => id.startsWith('hv:') || pageVisible(id, ctx))
    if (!ids.length && !g.account) return null
    return <Section key={g.title} title={t(g.title)} className="hv-sgroup">
      {/* Upstream's account card (views/Settings.jsx SettingsRoot), as a row of its group. */}
      {g.account && <button className="lrow tap sp-acct" onClick={() => open('account')}>
        <AvatarFace name={faceName} />
        <span className="lrow-m"><span className="lrow-t">{acct.title}</span><span className="lrow-s">{acct.sub}</span></span>
        <Icon name="chevronRight" className="lrow-c" />
      </button>}
      {ids.map(id => own[id] ? own[id]() : row(id))}
    </Section>
  }).concat(
    // Both versions under the groups (D52); upstream's own line after it is hidden (hevier.css).
    <div key="hv-version" className="dim small sp-version hv-version">{versionLine(t)}</div>)
}

// D84: the plate line under a set, off by default, among upstream's Logging rows.
// With Plates and warm-ups off it is disabled and says so, its stored choice kept (needOf).
function PlateLineRow() {
  const S = useStore(s => s.S)
  const need = needOf(S, 'hvPlateLine')
  const update = useStore(s => s.update)
  return <Row icon="plate" iconTint="var(--orange)" title={t('Plates to load')} className={need.on ? '' : 'dis'}
    subtitle={need.on ? t('A line under a set: the plates on each side of the bar.') : t('Needs {0}', t(need.title))}>
    <Switch checked={S.hvPlateLine === true} disabled={!need.on} onChange={v => update(s => { s.hvPlateLine = v })} aria-label={t('Plates to load')} />
  </Row>
}

// D120: an effort cell on warm-up rows, on by default, offered only while effort is RIR or RPE.
function WarmupEffortRow() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  if (!EFFORT[effortOf(S)]) return null
  return <Row icon="gauge" iconTint="var(--purple)" title={t('Effort on warm-ups')}
    subtitle={t('An effort to rate on each warm-up set, as on work sets.')}>
    <Switch checked={warmupEffortOn(S)} onChange={v => update(s => { s.hvWarmupEffort = v })} aria-label={t('Effort on warm-ups')} />
  </Row>
}

// Records when a backup was exported from Data & backup (S.hvBackupAt): upstream's export toasts
// "Backup exported" once the file is saved or shared, and not when the share sheet is dismissed.
// shortcut: reads upstream's toast, so a renamed toast, an export from another page, or a zip that toasts
// "N files could not be included" instead goes unrecorded; a seam in
// views/Settings.jsx doExport/doExportZip calling a hook would be exact, upgrade if the toast changes.
export function BackupWatch() {
  useEffect(() => useUI.subscribe((ui, before) => {
    if (ui.toastMsg && ui.toastMsg !== before.toastMsg && ui.toastMsg === t('Backup exported'))
      useStore.getState().update(s => { s.hvBackupAt = Date.now() })
  }), [])
  return null
}

/** Seams S11 and S12's hand-off. */
// Rows upstream draws as a component of their own, left out of every page: the app icon picker (D100, D17).
const HIDDEN_TYPES = [AppIconRow, DeloadRows]   // and upstream's deload weeks (D109)
// Forgotten workouts without "End by itself when I leave the gym", which needs upstream's gym reminder (D47).
const TYPE_PROPS = new Map([[ForgottenRows, { mobile: false }]])

export function installSettings() {
  hooks.settings = {
    root: props => <SettingsRootHevy {...props} />,
    // Back the way you came, named by the tab whose ⚙ opened it (D136; the fifth audit, 2026-11-21), else up to Today.
    back: () => {
      const came = (window.history.state?.idx || 0) > 0, from = came && window.history.state?.usr?.back
      const label = from === 'History' ? t('History') : from === 'Lifts' ? t('Lifts') : t('Today')
      // The title in the bar's middle column, as on sub-pages: one sticky layer (the seventh critique, 2026-11-22).
      return <><button className="sp-back" aria-label={label}
        onClick={() => (came ? nav(-1) : nav('/home', { replace: true }))}>
        <Icon name="chevronLeft" /><span>{label}</span></button>
        <h1 className="sp-title">{t('Settings')}</h1></>
    },
    page: (id, tree) => {
      if (id === 'equipment') return <GymsPage card={tree} tr={t} />
      const out = relabelPage(id, prunePage(id, tree, t, HIDDEN_TYPES, TYPE_PROPS), t)
      if (id === 'about') return <>{aboutPage(out, t)}<MediaSection key="hv-media" /></>
      if (id === 'data') return <><BackupWatch key="hv-backup-watch" />{out}</>
      // D123: the fork's accents first, where upstream's hidden Accent color row was.
      if (id === 'look') return <><AccentRow key="hv-accent" />{out}</>
      if (id === 'workout') return appendToSection(appendToSection(out, t('Logging'), <PlateLineRow key="hv-plate-line" />),
        t('Logging'), <WarmupEffortRow key="hv-warmup-effort" />)
      return out
    },
    hides: hiddenSetting,
  }
  // Integrations (S57): D79's heart-rate strap after Health & devices, where the watches are, and
  // D34's export to Hevy after Training apps, beside Hevy's import. Phones only.
  hooks.integrationsAfter = cat => !MOBILE ? null
    // Health's (D97): the strap goes with upstream's Health module.
    : cat === 'health' ? (partOn(useStore.getState().S, 'health', 'strap') ? <StrapSection key="hv-hr-strap" /> : null)
    : cat === 'training' ? (partOn(useStore.getState().S, 'integrations', 'hevy') ? <HevyExportSection key="hv-hevy-export" /> : null)
    : null
}
