"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
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

type BarConfig = {
  key: string;
  color?: string;
  radius?: [number, number, number, number];
};

// cavetail: recharts' Formatter type is overly strict; cast at the boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => string;

type Props = {
  data: DataPoint[];
  xKey: string;
  bars: BarConfig[];
  height?: number;
  xFormatter?: (v: string | number) => string;
  yFormatter?: (v: string | number) => string;
  tooltipFormatter?: TooltipFormatter;
  referenceLine?: { value: number; color?: string; label?: string };
};

export function BarChart({
  data,
  xKey,
  bars,
  height = 240,
  xFormatter,
  yFormatter,
  tooltipFormatter,
  referenceLine,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} {...GRID_STYLE} />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          dy={8}
          tickFormatter={xFormatter}
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
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            fill={b.color ?? COLORS.accent}
            radius={b.radius ?? [3, 3, 0, 0]}
            maxBarSize={32}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
