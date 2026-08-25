"use client";

import type { ReactNode } from "react";

type PipelineBarProps = {
  className?: string;
  /** The tiles. Whatever is put here — usually `StageTile`s. */
  children?: ReactNode;
};

/** Where the book sits right now — a grid holding one `StageTile` per stage. */
export default function PipelineBar({ className = "", children }: PipelineBarProps) {
  return (
    <section className={`grid gap-3 sm:grid-cols-3 xl:grid-cols-6 ${className}`}>
      {children}
    </section>
  );
}
