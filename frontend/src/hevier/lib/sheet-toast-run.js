// A toast still showing when a sheet opens belonged to the page under it: it goes, Undo and all,
// so it covers nothing on the sheet (the Finish sheet's warning) and offers no undo of a page the
// sheet hides. A toast raised while the sheet is open stays (hevier.css lifts it over the foot).
import { useUI } from '../../store/useUI.js'

let started = false
export function initSheetToast() {
  if (started) return
  started = true
  useUI.subscribe((s, prev) => {
    if (s.toastMsg && s.sheets.length > prev.sheets.length) s.dismissToast()
  })
}
