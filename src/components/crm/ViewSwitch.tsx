"use client";

import type { ReactNode } from "react";
import { useLeadTracker } from "./TrackerContext";

type ViewSwitchProps = {
  todayView?: ReactNode;
  tableView?: ReactNode;
  boardView?: ReactNode;
  chartsView?: ReactNode;
  /** Replaces whichever view is active when the filters let nothing through. */
  emptyView?: ReactNode;
  /**
   * Ignores the active view and always renders this one. Lets a designer work
   * on the board or the charts without switching the canvas first.
   */
  forceView?: "" | "today" | "table" | "board" | "charts";
  className?: string;
};

/**
 * Shows one of the three views.
 *
 * Which one is the tracker's business; what each one contains is the
 * designer's — every branch is a slot, so the board can be replaced with
 * anything at all without touching the switch.
 */
export default function ViewSwitch({
  todayView,
  tableView,
  boardView,
  chartsView,
  emptyView,
  forceView = "",
  className = "",
}: ViewSwitchProps) {
  const { view, visible } = useLeadTracker();
  const active = forceView || view;

  const body =
    visible.length === 0 && emptyView
      ? emptyView
      : active === "board"
        ? boardView
        : active === "charts"
          ? chartsView
          : active === "table"
            ? tableView
            : todayView;

  return <div className={className}>{body}</div>;
}
