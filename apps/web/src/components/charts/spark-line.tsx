"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { COLORS } from "./chart-theme";

type DataPoint = Record<string, string | number>;

interface SparkLineProps {
  data: DataPoint[];
  dataKey: string;
  color?: string;
  height?: number;
}

const SparkLine = ({
  data,
  dataKey,
  color = COLORS.accent,
  height = 32,
}: SparkLineProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#spark-${dataKey})`}
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export { SparkLine };
