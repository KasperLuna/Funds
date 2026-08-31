"use client";

import dynamic from "next/dynamic";
import { COLORS } from "./chart-theme";

type DataPoint = Record<string, string | number>;

interface SparkLineProps {
  data: DataPoint[];
  dataKey: string;
  color?: string;
  height?: number;
}

// cavetail: recharts is heavy (~100KB+ parse) and sits in the dashboard's
// critical chunk. Lazy-load it so the PWA's first paint — and the capture
// FAB's tap responsiveness — isn't blocked behind top-level recharts eval.
const SparkLineImpl = dynamic(
  () => import("./spark-line-impl").then((m) => m.SparkLineImpl),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 48 }}
        className="animate-pulse rounded-(--radius-md) bg-(--surface-2)"
        aria-hidden
      />
    ),
  },
);

export const SparkLine = (props: SparkLineProps) => (
  <SparkLineImpl {...props} color={props.color ?? COLORS.accent} height={props.height ?? 32} />
);