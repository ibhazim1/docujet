"use client";

import { useLeadTracker } from "../TrackerContext";
import { compactInputClassName } from "@/components/admin/field-styles";

type SearchInputProps = {
  placeholder?: string;
  /** Filters as you type instead of waiting for Enter or Apply. */
  instant?: boolean;
  className?: string;
};

/**
 * The free-text filter over name, email, phone and interest.
 *
 * The typed-but-not-yet-applied text lives in the tracker rather than in this
 * input, so an Apply button can sit anywhere on the page — or nowhere at all.
 */
export default function SearchInput({
  placeholder = "Search name, email, phone or interest…",
  instant = false,
  className = "",
}: SearchInputProps) {
  const { searchDraft, setSearchDraft, applySearch, apply } = useLeadTracker();

  return (
    <label className={`min-w-[220px] flex-1 ${className}`}>
      <span className="sr-only">Search leads</span>
      <input
        type="search"
        name="q"
        value={searchDraft}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setSearchDraft(next);
          if (instant) apply({ q: next.trim(), lead: null });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applySearch();
          }
        }}
        className={compactInputClassName}
      />
    </label>
  );
}
