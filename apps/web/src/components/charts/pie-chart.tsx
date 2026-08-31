"use client";

import dynamic from "next/dynamic";

interface Slice {
  name: string;
  value: number;
  color: string;
}

// cavetail: recharts' Formatter type is overly strict; cast at the boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => string;

interface PieChartProps {
  data: Slice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  tooltipFormatter?: TooltipFormatter;
}

// cavetail: recharts is heavy; lazy-load so it stays out of the dashboard's
// critical chunk (used by BankProportionCard on the home route).
const PieChartImpl = dynamic(
  () => import("./pie-chart-impl").then((m) => m.PieChartImpl),
  { ssr: false },
);

const PieChart = (props: PieChartProps) => <PieChartImpl {...props} />;

export { PieChart };