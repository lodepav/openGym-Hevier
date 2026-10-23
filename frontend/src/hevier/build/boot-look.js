// The boot screen in the fork's look (hevier/DECISIONS.md D83): upstream's index.html paints its
// barbell in lime on near-black before any script runs, so the fork recolours it at build time,
// Hevy blue on AMOLED black (D17), without editing index.html. A style before upstream's, with a
// stronger selector, so upstream's own rules and animation are untouched.
export const BOOT_STYLE = 'html #boot{background:#000}html #boot .db{fill:#008cff}html #boot ellipse{fill:#008cff}'

/** Vite plugin, on only in the fork's build (seam S45 in vite.config.js). */
export const bootLook = on => ({
  name: 'hevier-boot-look',
  transformIndexHtml: html => (on ? { html, tags: [{ tag: 'style', children: BOOT_STYLE, injectTo: 'body-prepend' }] } : html),
})
