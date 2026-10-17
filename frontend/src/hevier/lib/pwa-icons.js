// The PWA's name and icons: the fork's, "Go Hevier" (D39) in Hevy blue. index.html and
// public/ are upstream's, so the page is pointed at the fork's copies in public/hevier/ (written
// by hevier/tools/recolour-icons.py) once it loads. Browsers read the manifest and the
// touch icon when the app is installed, not when the page is parsed, so swapping the links at
// boot is enough. The service worker's notification icons stay upstream's.
const LINKS = {
  manifest: 'hevier/manifest.json',
  'apple-touch-icon': 'hevier/icon-180.png',
  icon: 'hevier/icon-180.png',
}

/** Points the document's manifest and icon links at the fork's. Returns how many it changed. */
export function applyForkIcons(doc = document) {
  let n = 0
  for (const [rel, href] of Object.entries(LINKS)) {
    for (const link of doc.querySelectorAll(`link[rel="${rel}"]`)) {
      if (link.getAttribute('href') === href) continue
      link.setAttribute('href', href)
      n++
    }
  }
  return n
}

/** The fork's name (D39): the Android launcher's comes from its own strings.xml, the PWA's from its manifest. */
export const APP_NAME = 'Go Hevier'

/** Names the page as the fork: the browser tab and iOS's home-screen title. Returns how many it changed. */
export function applyForkName(doc = document) {
  let n = 0
  if (doc.title !== APP_NAME) { doc.title = APP_NAME; n++ }
  for (const meta of doc.querySelectorAll('meta[name="apple-mobile-web-app-title"]')) {
    if (meta.getAttribute('content') === APP_NAME) continue
    meta.setAttribute('content', APP_NAME)
    n++
  }
  return n
}
