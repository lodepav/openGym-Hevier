// Seam S73 in sheets.jsx EffortPicker (the tenth critique, 2026-11-22): the Exact field, unset, says
// "Not set" where upstream's "–" sat between − and + and read as a third minus. Off in upstream's
// build (HEVIER), so its own tests see "–" as before.
import { HEVIER } from '../flag.js'
import { t } from '../../lib/i18n.js'

/** The Exact field's placeholder. */
export const effortBlank = (on = HEVIER) => (on ? t('Not set') : '–')
