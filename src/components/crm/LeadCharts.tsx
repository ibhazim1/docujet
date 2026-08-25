"use client";

import type { ReactNode } from "react";

type LeadChartsProps = {
  className?: string;
  /** The charts. Each one is free-standing and reads the tracker itself. */
  children?: ReactNode;
};

/** Source and lifecycle analysis — a two-column grid holding whatever charts are wanted. */
export default function LeadCharts({ className = "", children }: LeadChartsProps) {
  return <div className={`grid gap-5 xl:grid-cols-2 ${className}`}>{children}</div>;
}
