import { TRACK } from "./tokens";
import { pct } from "@/lib/crm/analytics";

type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  centerValue: string;
  centerCaption: string;
};

const SIZE = 148;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface-colour gap between wedges, in circumference px. */
const GAP = 3;

/**
 * A ring of wedges plus a same-ramp legend.
 *
 * Unlike a bar, a wedge has no length to carry magnitude on its own — hue is
 * the only channel doing identity work here, so every segment is also
 * directly labelled in the legend rather than relying on colour memory.
 */
export default function DonutChart({ segments, centerValue, centerCaption }: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  // Raw (ungapped) arc length per segment, and each one's starting position
  // along the circumference — computed as a prefix sum over an array rather
  // than an accumulator reassigned during the render pass.
  const rawLengths = segments.map((segment) =>
    (total > 0 ? segment.value / total : 0) * CIRCUMFERENCE,
  );
  const starts = rawLengths.map((_, index) =>
    rawLengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  );

  const arcs = segments.map((segment, index) => ({
    ...segment,
    fraction: total > 0 ? segment.value / total : 0,
    length: Math.max(0, rawLengths[index] - GAP),
    dashoffset: -(starts[index] + GAP / 2),
  }));

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0"
        role="img"
        aria-label={`${centerValue} ${centerCaption}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={TRACK} strokeWidth={STROKE} />
          {arcs.map(
            (arc) =>
              arc.length > 0 && (
                <circle
                  key={arc.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                  strokeDashoffset={arc.dashoffset}
                >
                  <title>{`${arc.label}: ${arc.value} (${pct(arc.fraction)})`}</title>
                </circle>
              ),
          )}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-slate-950 text-[22px] font-semibold"
        >
          {centerValue}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="fill-slate-500 text-[10px]">
          {centerCaption}
        </text>
      </svg>

      <ul className="min-w-[140px] flex-1 space-y-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-700">
              <span className="font-semibold text-slate-950">{segment.value}</span>
              <span className="ml-1.5 text-slate-400">
                {pct(total > 0 ? segment.value / total : 0)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
