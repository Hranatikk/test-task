export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

/** Minimum touch target per platform accessibility guidance. */
export const MIN_TOUCH_HEIGHT = 48;

/** Below this width, action rows stack vertically instead of side by side. */
export const NARROW_WIDTH_BREAKPOINT = 360;

/** Above this font scale, action rows stack vertically regardless of width. */
export const LARGE_FONT_SCALE_BREAKPOINT = 1.3;
