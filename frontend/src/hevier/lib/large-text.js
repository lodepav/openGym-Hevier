// Large text (the ninth critique, 2026-11-22): the phone's font size zooms the WebView's text
// (HevierTextZoomPlugin.java), and a few layouts change from 150 % up, where they no longer fit.

/** The text size from which those layouts change, as a factor of the platform's default. */
export const LARGE_TEXT = 1.5

/** Whether text set at `base` px measures `px`, so zoomed to LARGE_TEXT or more. Unmeasured, no. */
export const isLargeText = (px, base = 16) => px > 0 && base > 0 && px / base >= LARGE_TEXT
