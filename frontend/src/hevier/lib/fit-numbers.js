// Large text (Android's font size at 200%) makes a set's number wider than its field: 102.5 read
// "102". Shrinks such a field's text until the number fits; one that fits is left alone.
let pen
// A grey value not logged yet is the field's placeholder, which scrollWidth does not count.
function neededWidth(el) {
  if (el.value || !el.placeholder) return el.scrollWidth
  pen = pen || document.createElement('canvas').getContext?.('2d')
  if (!pen) return 0
  const cs = getComputedStyle(el)
  pen.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  return pen.measureText(el.placeholder).width
}

export function fitNumbers(root) {
  for (const el of root?.querySelectorAll?.('input.hv-num') || []) {
    el.style.fontSize = ''
    let size = parseFloat(getComputedStyle(el).fontSize)
    // The WebView scales what is set here once more, so one pass can leave it too wide.
    for (let k = 0; k < 3 && size > 0; k++) {
      const need = neededWidth(el)
      if (!(need > el.clientWidth + 1)) break
      size *= el.clientWidth / need
      el.style.fontSize = size + 'px'
    }
  }
}
