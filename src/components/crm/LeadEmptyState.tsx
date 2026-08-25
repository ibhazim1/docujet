"use client";

import EmptyState from "@/components/admin/EmptyState";
import { useLeadTracker } from "./TrackerContext";

type LeadEmptyStateProps = {
  title?: string;
  description?: string;
  /** Keeps it on screen even when rows are showing — useful while designing. */
  alwaysShow?: boolean;
};

/** What the list says when the filters let nothing through. */
export default function LeadEmptyState({
  title = "No leads match these filters",
  description = "Clear a filter or widen the search to bring rows back.",
  alwaysShow = false,
}: LeadEmptyStateProps) {
  const { visible } = useLeadTracker();
  if (visible.length > 0 && !alwaysShow) return null;

  return <EmptyState title={title} description={description} />;
}
