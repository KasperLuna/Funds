"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
} from "./chart-theme";

interface Slice {
  name: string;
  value: number;
  color: string;
}

// cavetail: recharts' Formatter type is overly strict; cast at the boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => string;

interface PieChartImplProps {
  data: Slice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  tooltipFormatter?: TooltipFormatter;
}

const PieChartImpl = ({
  data,
  height = 240,
  innerRadius = 55,
  outerRadius = 75,
  tooltipFormatter,
}: PieChartImplProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={tooltipFormatter}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export { PieChartImpl };