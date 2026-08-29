import { ExplainOn } from "./Explain";
import { SOURCES } from "@/lib/crm/taxonomy";
import type { SourceKey } from "@/lib/crm/types";

type SourcePillProps = {
  source: SourceKey;
  size?: "sm" | "md";
};

/** The `.srcpill` from the PHP, wearing the admin's badge shape. */
export default function SourcePill({ source, size = "md" }: SourcePillProps) {
  const def = SOURCES[source];

  return (
    <ExplainOn
      term="field.source"
      detail={
        def
          ? `${def.label} counts as ${def.group === "social" ? "a social channel" : "an owned web property"}.`
          : undefined
      }
    >
      <span
        className={`inline-flex cursor-help whitespace-nowrap rounded-full bg-slate-100 font-semibold text-slate-700 ${
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        {def?.label ?? source}
      </span>
    </ExplainOn>
  );
}
