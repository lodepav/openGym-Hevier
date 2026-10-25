// The share cards' canvas and their way out (hevier/DECISIONS.md D87): share-cards.js decides
// what each card says and where; this paints it, on black or over the user's photo, and saves
// the picture to the gallery (HevierGalleryPlugin.java, seam S46) or hands it to the share sheet.
import { mapColors, viewAspect, CARD_FONT } from '../../lib/workout-card.js'
import { MUSCLES, INERT } from '../../lib/muscles.js'
import { MOBILE, isAndroid, shareExportBlob } from '../../lib/mobile.js'
import { toBase64 } from '../../lib/media-store-fs.js'
import { layoutShareCard } from './share-cards.js'

const ACC = '#008cff'   // Hevy blue (D17)
// A calendar day's kind (calendar.js) in the Calendar page's colours, and a change up or down.
const KIND = { strength: ACC, cardio: '#2fbf5b', deload: '#ff9f0a', up: '#2fbf5b', down: '#ff453a', onLight: '#000' }
const COLORS = {
  black: { label: '#fff', label2: '#9a9aa0', acc: ACC, tile: '#1c1c1e', track: '#2c2c2e', ...KIND },
  photo: { label: '#fff', label2: 'rgba(255,255,255,0.8)', acc: ACC, tile: 'rgba(0,0,0,0.45)', track: 'rgba(255,255,255,0.2)', ...KIND },
}

/** The picked picture, decoded and turned upright; null when it cannot be read. */
export async function loadPhoto(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { return null }
}

/** One card as a PNG blob, or null when the canvas fails. `photo` is an ImageBitmap or null. */
export async function cardImage(card, { photo = null } = {}) {
  const geometry = card.kind === 'muscles' ? (await import('../../lib/body-paths.js')).default : null
  const shape = geometry && (geometry[card.body] || geometry.male)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const measure = (text, weight, size) => { ctx.font = `${weight} ${size}px ${CARD_FONT}`; return ctx.measureText(text).width }
  const aspect = shape ? viewAspect(shape.front) : 0
  const layout = layoutShareCard(card, { measure, photo: !!photo, map: shape ? { aspect } : null })
  canvas.width = layout.width
  canvas.height = layout.height
  draw(ctx, layout, photo, shape ? { body: shape, levels: card.levels } : null)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function draw(ctx, layout, photo, map) {
  const { width, height, items } = layout
  const colors = photo ? COLORS.photo : COLORS.black
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  if (photo) {
    // Cover: the picture fills the card, cropped to its middle.
    const k = Math.max(width / photo.width, height / photo.height)
    const w = photo.width * k, h = photo.height * k
    ctx.drawImage(photo, (width - w) / 2, (height - h) / 2, w, h)
    const g = ctx.createLinearGradient(0, layout.shadeFrom, 0, height)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(Math.min(0.99, 260 / Math.max(1, height - layout.shadeFrom)), 'rgba(0,0,0,0.72)')
    g.addColorStop(1, 'rgba(0,0,0,0.88)')
    ctx.fillStyle = g
    ctx.fillRect(0, layout.shadeFrom, width, height - layout.shadeFrom)
  }
  const shades = mapColors({ label: '#ffffff', surface: '#000000', acc: ACC })
  ctx.textBaseline = 'alphabetic'
  for (const it of items) {
    if (it.kind === 'bar') {
      ctx.fillStyle = colors.acc
      roundRect(ctx, it.x, it.y, it.w, it.h, it.h / 2)
      ctx.fill()
    } else if (it.kind === 'tile') {
      ctx.fillStyle = colors.tile
      roundRect(ctx, it.x, it.y, it.w, it.h, 28)
      ctx.fill()
    } else if (it.kind === 'meter') {
      ctx.fillStyle = colors.track
      roundRect(ctx, it.x, it.y, it.w, it.h, it.h / 2)
      ctx.fill()
      ctx.fillStyle = colors.acc
      roundRect(ctx, it.x, it.y, Math.max(it.h, it.w * it.part), it.h, it.h / 2)
      ctx.fill()
    } else if (it.kind === 'dot') {
      ctx.fillStyle = colors[it.color] || colors.acc
      ctx.beginPath()
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2)
      ctx.fill()
    } else if (it.kind === 'map') {
      const view = map?.body?.[it.view]
      if (view) drawView(ctx, view, it, map.levels, shades)
    } else if (it.kind === 'trophy') {
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.scale(it.size / 24, it.size / 24)
      ctx.strokeStyle = colors.acc
      ctx.lineWidth = 1.7
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const d of TROPHY) ctx.stroke(new Path2D(d))
      ctx.restore()
    } else {
      ctx.direction = 'ltr'
      ctx.textAlign = it.align === 'right' || it.align === 'center' ? it.align : 'left'
      ctx.fillStyle = colors[it.color] || colors.label
      ctx.font = `${it.weight} ${it.size}px ${CARD_FONT}`
      ctx.fillText(it.text, it.x, it.y)
    }
  }
}

// The trophy of components/Icon.jsx on its 24×24 grid, as upstream's card draws it.
const TROPHY = [
  'M7.6 4h8.8v4.6a4.4 4.4 0 0 1-8.8 0Z',
  'M7.6 5.6H4.9v1.5a3 3 0 0 0 2.9 3M16.4 5.6h2.7v1.5a3 3 0 0 1-2.9 3M12 13v3.4M8.6 20.4h6.8l-.7-4H9.3Z',
]

function drawView(ctx, view, box, levels, shades) {
  const [minX, minY, vw, vh] = String(view.vb).split(/\s+/).map(Number)
  ctx.save()
  ctx.translate(box.x, box.y)
  ctx.scale(box.w / vw, box.h / vh)
  ctx.translate(-minX, -minY)
  ctx.fillStyle = shades.sil
  for (const slug of INERT) for (const d of view.p[slug] || []) ctx.fill(new Path2D(d))
  for (const slug of MUSCLES) {
    ctx.fillStyle = shades.levels[levels?.[slug] || 0]
    for (const d of view.p[slug] || []) ctx.fill(new Path2D(d))
  }
  ctx.restore()
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const download = (blob, name) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

let galleryP = null
// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in secret.js).
const gallery = () => (galleryP ||= import('@capacitor/core').then(({ registerPlugin }) => ({ G: registerPlugin('HevierGallery') })))

/**
 * Saves the picture: into the gallery on Android 10 and later ('gallery'); on an older phone, or if
 * that fails, through the share sheet, where "Save to device" or Drive take it ('shared'); in a
 * browser as a download ('downloaded'). Null when the share sheet was dismissed.
 */
export async function saveCardImage(blob, name) {
  if (MOBILE && (await isAndroid())) {
    try {
      const { G } = await gallery()
      await G.save({ data: toBase64(new Uint8Array(await blob.arrayBuffer())), name })
      return 'gallery'
    } catch { /* Android 9 or older, or no room: the share sheet below */ }
  }
  if (MOBILE) { try { await shareExportBlob(blob, name); return 'shared' } catch { return null } }
  download(blob, name)
  return 'downloaded'
}

/** Hands the picture to the share sheet: the phone's, a browser's that shares files, else a download. */
export async function shareCardImage(blob, name, title) {
  if (MOBILE) { try { await shareExportBlob(blob, name) } catch { /* dismissed */ } return 'shared' }
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }) } catch { /* dismissed */ }
    return 'shared'
  }
  download(blob, name)
  return 'downloaded'
}
