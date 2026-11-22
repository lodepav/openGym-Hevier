import { useLayoutEffect, useState } from 'react'
import { isLargeText } from '../lib/large-text.js'

// A 16 px probe as the page's text zooms it: a container query's em ignores the WebView's text zoom (Calendar.jsx namesFit).
const measure = () => {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;visibility:hidden;font-size:16px'
  document.body.appendChild(probe)
  const px = parseFloat(getComputedStyle(probe).fontSize)
  probe.remove()
  return isLargeText(px)
}

/** Whether the phone's text is large (lib/large-text.js), measured again on resize. */
export function useLargeText() {
  const [big, setBig] = useState(false)
  useLayoutEffect(() => {
    const fit = () => setBig(measure())
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return big
}
