"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  COLORS,
  TICK_STYLE,
  GRID_STYLE,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
} from "./chart-theme";

type DataPoint = Record<string, string | number | boolean>;

interface BarConfig {
  key: string;
  color?: string;
  radius?: [number, number, number, number];
}

// cavetail: recharts' Formatter type is overly strict; cast at the boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => string;

interface BarChartProps {
  data: DataPoint[];
  xKey: string;
  bars: BarConfig[];
  height?: number;
  xFormatter?: (v: string | number) => string;
  yFormatter?: (v: string | number) => string;
  tooltipFormatter?: TooltipFormatter;
  referenceLine?: { value: number; color?: string; label?: string };
  verticalReferenceLine?: { value: string; color?: string; label?: string };
  /**
   * Per-point opacity. Receives the data row and the bar key; return a number in [0, 1]
   * to dim that specific cell (e.g. for forecast/tentative regions).
   */
  cellOpacity?: (row: DataPoint, barKey: string) => number;
}

const BarChart = ({
  data,
  xKey,
  bars,
  height = 240,
  xFormatter,
  yFormatter,
  tooltipFormatter,
  referenceLine,
  verticalReferenceLine,
  cellOpacity,
}: BarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 16 }}>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          dy={8}
          tickFormatter={xFormatter}
          padding={{ left: 8, right: 8 }}
          minTickGap={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          dx={-4}
          width={45}
          tickFormatter={yFormatter}
        />
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={tooltipFormatter}
        />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.value}
            stroke={referenceLine.color ?? COLORS.muted}
            strokeDasharray="4 4"
            label={referenceLine.label}
          />
        )}
        {verticalReferenceLine && (
          <ReferenceLine
            x={verticalReferenceLine.value}
            stroke={verticalReferenceLine.color ?? COLORS.muted}
            strokeDasharray="4 4"
            label={{
              value: verticalReferenceLine.label,
              position: "insideTop",
              fill: COLORS.tick,
              fontSize: 10,
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.06em",
              offset: 6,
            }}
          />
        )}
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            fill={b.color ?? COLORS.accent}
            radius={b.radius ?? [3, 3, 0, 0]}
            maxBarSize={32}
          >
            {cellOpacity &&
              data.map((row, i) => (
                <Cell key={`${b.key}-${i}`} fillOpacity={cellOpacity(row, b.key)} />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export { BarChart };
