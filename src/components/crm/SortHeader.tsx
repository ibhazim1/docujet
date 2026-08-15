"use client";

import Link from "next/link";
import { buildHref } from "@/lib/crm/query";
import type { SortDirection, SortKey } from "@/lib/crm/types";

type SortHeaderProps = {
  sortKey: SortKey;
  label: string;
  activeKey: SortKey;
  activeDir: SortDirection;
  params: URLSearchParams;
};

/** A sortable column header that toggles direction on the active column. */
export default function SortHeader({
  sortKey,
  label,
  activeKey,
  activeDir,
  params,
}: SortHeaderProps) {
  const isActive = sortKey === activeKey;
  const nextDir = isActive && activeDir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={buildHref(params, { sort: sortKey, dir: nextDir, lead: null })}
      aria-sort={isActive ? (activeDir === "asc" ? "ascending" : "descending") : undefined}
      className={`inline-flex items-center gap-1 transition hover:text-slate-950 ${
        isActive ? "text-slate-950" : ""
      }`}
    >
      {label}
      <span aria-hidden="true" className="text-[10px]">
        {isActive ? (activeDir === "asc" ? "↑" : "↓") : ""}
      </span>
    </Link>
  );
}
