/**
 * Intaglio Plate chart theme tokens.
 * Pure-black surfaces, engraved hairlines, emerald accent, tabular numerals.
 */

export const COLORS = {
  accent: "#10b981",
  accentFill: "rgba(16, 185, 129, 0.12)",
  secondary: "#38bdf8",
  secondaryFill: "rgba(56, 189, 248, 0.10)",
  warning: "#fbbf24",
  danger: "#ef4444",
  muted: "#71717a",
  grid: "rgba(255, 255, 255, 0.06)",
  axis: "#a1a1aa",
  tick: "#71717a",
  tooltipBg: "#0d0d0d",
  tooltipBorder: "rgba(255, 255, 255, 0.13)",
  tooltipText: "#f4f4f5",
  labelMicro: "#a1a1aa",
} as const;

export const AXIS_STYLE = {
  fill: COLORS.axis,
  fontFamily: "var(--font-sans)",
  fontSize: 11,
} as const;

export const TICK_STYLE = {
  fill: COLORS.tick,
  fontFamily: "var(--font-sans)",
  fontSize: 10,
} as const;

export const GRID_STYLE = {
  stroke: COLORS.grid,
  strokeDasharray: "3 3",
} as const;

export const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: COLORS.tooltipBg,
  border: `1px solid ${COLORS.tooltipBorder}`,
  borderRadius: 5,
  boxShadow: "none",
  padding: "8px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: COLORS.tooltipText,
} as const;

export const TOOLTIP_ITEM_STYLE = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: COLORS.tooltipText,
} as const;

export const TOOLTIP_LABEL_STYLE = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.labelMicro,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
};

/** Common axis props for all charts */
export const commonAxisProps = {
  xAxis: {
    axisLine: false,
    tickLine: false,
    tick: TICK_STYLE,
    dy: 8,
  },
  yAxis: {
    axisLine: false,
    tickLine: false,
    tick: TICK_STYLE,
    dx: -4,
    width: 45,
  },
  grid: {
    vertical: false,
    ...GRID_STYLE,
  },
} as const;
