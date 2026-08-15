import { SOURCES } from "@/lib/crm/taxonomy";
import type { SourceKey } from "@/lib/crm/types";

type SourcePillProps = {
  source: SourceKey;
  size?: "sm" | "md";
};

/** The `.srcpill` from the PHP, wearing the admin's badge shape. */
export default function SourcePill({ source, size = "md" }: SourcePillProps) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full bg-slate-100 font-semibold text-slate-700 ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {SOURCES[source]?.label ?? source}
    </span>
  );
}
