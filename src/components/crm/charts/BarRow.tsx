import type { ReactNode } from "react";
import { TRACK } from "./tokens";

type BarRowProps = {
  label: string;
  /** 0..100. */
  width: number;
  color: string;
  value: ReactNode;
  share: ReactNode;
  /** Dims the row — used where the sample is too small to rank. */
  dim?: boolean;
  /** A second line under the label, e.g. "2 lost here". */
  note?: string;
};

/**
 * One horizontal bar.
 *
 * Bars are capped in height and square at the baseline with a rounded data
 * end, so the zero point stays unambiguous.
 */
export default function BarRow({
  label,
  width,
  color,
  value,
  share,
  dim = false,
  note,
}: BarRowProps) {
  return (
    <div
      className={`grid grid-cols-[minmax(72px,110px)_minmax(0,1fr)_auto] items-center gap-3 ${
        dim ? "opacity-55" : ""
      }`}
    >
      <span className="min-w-0 text-xs text-slate-600">
        <span className="block truncate">{label}</span>
        {note ? <span className="block text-[11px] text-slate-400">{note}</span> : null}
      </span>
      <span
        className="block h-4 w-full overflow-hidden rounded-l-[2px] rounded-r"
        style={{ backgroundColor: TRACK }}
      >
        <span
          className="block h-full rounded-l-[2px] rounded-r"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </span>
      <span className="whitespace-nowrap text-right text-xs tabular-nums text-slate-700">
        <span className="font-semibold text-slate-950">{value}</span>
        <span className="ml-2 text-slate-400">{share}</span>
      </span>
    </div>
  );
}
