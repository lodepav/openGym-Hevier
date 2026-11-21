// What the Measures page's Body measurements and Progress photos rows say under their titles:
// the last value or the count, and its day (the critique, 2026-11-21).
import { t, tn } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { enabledMeasurementFields, lengthUnitOf, measurementUnit, measurementUnitLabel, measurementValue, toMeasurementDisplay } from '../../lib/measurements.js'
import { fmtDate } from './dates.js'

/** "Waist 82 cm · 3 Nov": the last check-in's first switched-on field with a value; null for none. */
export function measurementsLine(S) {
  const entry = (S.measurements || []).at(-1)
  if (!entry) return null
  const unit = lengthUnitOf(S)
  const field = enabledMeasurementFields(S).find(f => measurementValue(entry, f.key) != null)
  if (!field) return null
  const v = toMeasurementDisplay(measurementValue(entry, field.key), unit, field)
  const u = measurementUnitLabel(measurementUnit(unit, field))
  return (field.custom ? field.label : t(field.label)) + ' ' + fmtNum(v) + (u ? ' ' + u : '') + ' · ' + fmtDate(entry.d)
}

/** "12 photos · 1 Nov" from a newest-first photo list; null for none. */
export const photosLine = photos => (photos.length ? tn('{0} photo', '{0} photos', photos.length) + ' · ' + fmtDate(photos[0].d) : null)
