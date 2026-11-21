// The effort pill's number in the colour of its band (upstream's EFFORT_BANDS). Purple (RIR 0) and red
// (0.5) read at 3.5–4.1:1 on their own 18 % tint over the open or done row; a quarter white lifts
// them to 4.9:1 or more and keeps the hue. The other bands already pass and stay as they are.
const LIGHTEN = new Set(['var(--purple)', 'var(--red)'])

/** The text colour for a band colour `color`; the colour itself when it reads well. */
export const effortInk = color => (LIGHTEN.has(color) ? `color-mix(in srgb, ${color} 75%, #fff)` : color)
