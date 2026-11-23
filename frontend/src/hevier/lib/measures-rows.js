// What the Measures page's Body measurements and Progress photos rows say under their titles:
// the last value or the count, and its day (the critique, 2026-11-21).
import { t, tn } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { enabledMeasurementFields, lengthUnitOf, measurementUnit, measurementUnitLabel, measurementValue, toMeasurementDisplay } from '../../lib/measurements.js'
import { fmtDate } from './dates.js'

/** "Waist 82 cm · 3 Nov": the last check-in with a switched-on field's value, its first such field; null for none. */
export function measurementsLine(S) {
  const unit = lengthUnitOf(S)
  const fields = enabledMeasurementFields(S)
  const fieldOf = e => fields.find(f => measurementValue(e, f.key) != null)
  // A check-in may hold only a note, or only fields since switched off.
  const entry = [...(S.measurements || [])].reverse().find(fieldOf)
  if (!entry) return null
  const field = fieldOf(entry)
  const v = toMeasurementDisplay(measurementValue(entry, field.key), unit, field)
  const u = measurementUnitLabel(measurementUnit(unit, field))
  return (field.custom ? field.label : t(field.label)) + ' ' + fmtNum(v) + (u ? ' ' + u : '') + ' · ' + fmtDate(entry.d)
}

/** "12 photos · 1 Nov" from a newest-first photo list; null for none. */
export const photosLine = photos => (photos.length ? tn('{0} photo', '{0} photos', photos.length) + ' · ' + fmtDate(photos[0].d) : null)
