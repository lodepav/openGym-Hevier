// The boot screen in the fork's look (hevier/DECISIONS.md D83, D123): upstream's index.html paints
// its barbell in lime on near-black before any script runs, so the fork recolours it at build time,
// the accent on AMOLED black, without editing index.html. A style before upstream's, with a
// stronger selector, so upstream's own rules and animation are untouched. The same plugin loads
// Nunito (D123): its @font-face and a preload, so the font is fetched while the boot screen shows.
export const FONT_URL = './hevier/fonts/Nunito.ttf'
export const BOOT_GREEN = '#34d08a'
export const FONT_FACE = `@font-face{font-family:Nunito;src:url(${FONT_URL}) format('truetype');font-weight:200 1000;font-display:block}`

// `html body #boot` outranks BOOT_STYLE's `html #boot`, so the saved accent wins wherever its style lands.
const fills = (c, sel = 'html #boot') =>
  `${sel} .db{fill:${c}}${sel} ellipse{fill:${c}}`
  // upstream 1.4.3's boot watchdog: the Reload button on a boot that never finished, the fork's primary button
  + `${sel}.fail button{background:${c};color:#000}`

export const BOOT_STYLE = FONT_FACE + 'html #boot{background:#000}' + fills(BOOT_GREEN)

// Plain old syntax, like upstream's boot watchdog: it runs before the bundle. The accent's own
// helper writes `hevier_accent`; anything but #rrggbb keeps the green.
export const BOOT_SCRIPT = "try{var a=localStorage.getItem('hevier_accent');"
  + "if(typeof a==='string'&&/^#[0-9a-fA-F]{6}$/.test(a)){var s=document.createElement('style');"
  + "s.textContent='" + fills("'+a+'", 'html body #boot') + "';document.head.appendChild(s)}}catch(e){}"

/** Vite plugin, on only in the fork's build (seam S45 in vite.config.js). */
export const bootLook = on => ({
  name: 'hevier-boot-look',
  transformIndexHtml: html => (on ? {
    html,
    tags: [
      { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/ttf', crossorigin: true, href: FONT_URL }, injectTo: 'head' },
      { tag: 'style', children: BOOT_STYLE, injectTo: 'body-prepend' },
      { tag: 'script', children: BOOT_SCRIPT, injectTo: 'body-prepend' },
    ],
  } : html),
})
