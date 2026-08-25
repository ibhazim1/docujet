"use client";

import { useLeadTracker } from "../TrackerContext";

type ApplyButtonProps = {
  label?: string;
  className?: string;
};

/** Commits whatever is sitting in the search box. The dropdowns apply themselves. */
export default function ApplyButton({ label = "Apply", className = "" }: ApplyButtonProps) {
  const { applySearch } = useLeadTracker();

  return (
    <button
      type="button"
      onClick={applySearch}
      className={`rounded-full bg-sky-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-900 ${className}`}
    >
      {label}
    </button>
  );
}
