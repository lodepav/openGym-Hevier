// Upstream's dates with "Sep" for September in the fork: Intl's en-GB writes "Sept", the one short
// month of four letters beside "Aug" and "Oct" (the owner, 2026-11-17). Upstream's own pages keep theirs.
import { fmtDate as upstreamDate, fmtDaysAgo as upstreamDaysAgo } from '../../lib/format.js'

/** `text` with Intl's "Sept" written "Sep"; anything else unchanged. */
export const sep = text => String(text).replace(/\bSept\b/g, 'Sep')

export const fmtDate = (...args) => sep(upstreamDate(...args))
export const fmtDaysAgo = (...args) => sep(upstreamDaysAgo(...args))
