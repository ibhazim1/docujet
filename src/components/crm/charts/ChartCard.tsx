import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  footnote?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
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
  subtitle,
  footnote,
  columns,
  rows,
  children,
}: ChartCardProps) {
  return (
    <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </header>

      <div className="mt-5">{children}</div>

      {footnote ? <p className="mt-4 text-xs leading-5 text-slate-500">{footnote}</p> : null}

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
    </section>
  );
}
