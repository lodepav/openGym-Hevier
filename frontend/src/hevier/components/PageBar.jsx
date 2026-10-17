// Hevy's one page bar: a plain ‹ on the left, a small centred title, plain actions on the right,
// sticky under a hairline. Every fork page names itself with it, the tab roots too (no back).
import { useNavigate } from 'react-router-dom'
import { t } from '../../lib/i18n.js'
import Icon from '../../components/Icon.jsx'

export default function PageBar({ title, onBack, backLabel, start, children, className = '' }) {
  return <div className={('hv-pagebar ' + className).trim()}>
    <div className="hv-pb-side">
      {onBack && <button type="button" className="iconbtn hv-pb-back" aria-label={backLabel || t('Back')} onClick={onBack}><Icon name="chevronLeft" /></button>}
      {start}
    </div>
    <div className="hv-title">{title}</div>
    <div className="hv-pb-side end">{children}</div>
  </div>
}

/** Back the way you came, else up to `to`. */
export function useBack(to) {
  const nav = useNavigate()
  return () => (window.history.state?.idx > 0 ? nav(-1) : nav(to, { replace: true }))
}
