import Explain from "../Explain";
import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  /**
   * A glossary key, explaining what the chart is for and how to read it.
   *
   * Separate from `insight`, which is generated from the data and says what
   * this particular picture means today. A reader who does not know what a
   * funnel counts cannot evaluate the verdict either — so one explains the
   * instrument and the other the reading.
   */
  explain?: string;
  subtitle?: string;
  /**
   * The verdict.
   *
   * One line saying what the picture means, generated from the same data by
   * `chartInsight()`. Every chart here was already correct and silent, which
   * left the interpretation to a reader who had to know what to look for. This
   * is the sentence an analyst would say standing next to it. Null when the
   * data does not support saying anything, which is better than a hedge.
   */
  insight?: string | null;
  footnote?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  /** The "View as table" twin. Hiding it costs the chart its text alternative. */
  showTable?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * The frame every chart sits in.
 *
 * Each one ships a "View as table" twin, so no value in this dashboard is
 * reachable only by hovering.
 */
export default function ChartCard({
  title,
  explain,
  subtitle,
  insight,
  footnote,
  columns,
  rows,
  showTable = true,
  className = "",
  children,
}: ChartCardProps) {
  return (
    <section
      className={`self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <header>
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-950">
          {title}
          {explain ? <Explain term={explain} label={title} /> : null}
        </h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </header>

      <div className="mt-5">{children}</div>

      {insight ? (
        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {insight}
        </p>
      ) : null}

      {footnote ? <p className="mt-4 text-xs leading-5 text-slate-500">{footnote}</p> : null}

      {showTable ? (
      <details className="group mt-4 border-t border-slate-200 pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-sky-800 marker:content-['']">
          View as table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={column}
                    className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-200">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2 ${i > 0 ? "text-right tabular-nums" : "text-slate-700"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      ) : null}
    </section>
  );
}
