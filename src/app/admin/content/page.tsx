import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import { contentCards } from "@/lib/admin-mock-data";

export const metadata: Metadata = {
  title: "Website Content",
};

export default function AdminContentPage() {
  return (
    <>
      <AdminHeader
        title="Website Content"
        description="Content management guidance for Plasmic-maintained public pages."
      />

      <div className="space-y-6 p-5 md:p-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Plasmic content workflow
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            The public site is designed so non-technical staff can update major
            sections through Plasmic code components. Use the cards below as safe
            entry points for content changes. Real Plasmic Studio links should be
            replaced from configuration later if needed.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {contentCards.map((card) => (
            <article
              key={card.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {card.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
                >
                  {card.actionLabel}
                </button>
                <a
                  href={card.plasmicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Open in Plasmic
                </a>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-400">
                Placeholder Studio URL
              </p>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
