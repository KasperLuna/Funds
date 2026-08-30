"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  COLORS,
  TICK_STYLE,
  GRID_STYLE,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
} from "./chart-theme";

type DataPoint = Record<string, string | number>;

// cavetail: recharts' Formatter type is overly strict; cast at the boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => string;

interface AreaChartProps {
  data: DataPoint[];
  xKey: string;
  series: Array<{
    key: string;
    color?: string;
    fill?: string;
    strokeWidth?: number;
  }>;
  height?: number;
  xFormatter?: (v: string | number) => string;
  yFormatter?: (v: string | number) => string;
  tooltipFormatter?: TooltipFormatter;
}

const AreaChart = ({
  data,
  xKey,
  series,
  height = 240,
  xFormatter,
  yFormatter,
  tooltipFormatter,
}: AreaChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color ?? COLORS.accent}
            fill={s.fill ?? COLORS.accentFill}
            strokeWidth={s.strokeWidth ?? 2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

export { AreaChart };
