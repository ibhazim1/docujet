"use client";

import type { ReactNode } from "react";

type KpiRowProps = {
  className?: string;
  /** The tiles. Whatever is put here — usually `KpiCard`s. */
  children?: ReactNode;
};

/**
 * The headline tiles.
 *
 * Only a grid. Every tile is a separate `KpiCard`, so a designer can reorder,
 * relabel, add or delete them without this component having an opinion.
 */
export default function KpiRow({ className = "", children }: KpiRowProps) {
  return (
    <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 ${className}`}>
      {children}
    </section>
  );
}
