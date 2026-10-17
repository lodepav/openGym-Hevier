// The PWA's name and icons: the fork's, Hevy blue (hevier/PLAN.md §3 step 5). index.html and
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
