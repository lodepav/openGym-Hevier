// The fork's UI is on only in the fork's own builds (hevier/tools/emulator.sh sets VITE_HEVIER=1).
// Unset — as in `npm test` — the app is upstream's, so upstream's suite keeps testing upstream's UI.
export const HEVIER = import.meta.env.VITE_HEVIER === '1'
