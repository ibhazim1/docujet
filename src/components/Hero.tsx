import Link from "next/link";

type HeroProps = {
  className?: string;
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  eyebrow?: string;
};

export default function Hero({
  className,
  eyebrow = "Epson WorkForce Enterprise",
  title = "Shaping the Future of Business Printing with Heat-Free Technology",
  description = "The Epson WorkForce Enterprise WF-C20600, WF-C20750, and WF-C21000 deliver consistent high-speed A3 colour multifunction printing with Heat-Free Technology, lower power consumption, and reduced intervention.",
  primaryButtonText = "Book a Product Consultation",
  primaryButtonUrl = "/booking",
  secondaryButtonText = "Explore the Models",
  secondaryButtonUrl = "/services",
}: HeroProps) {
  return (
    <section className={`docujet-hero-surface w-full bg-stone-50 ${className ?? ""}`}>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center lg:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {description}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryButtonUrl}
              className="inline-flex items-center justify-center rounded-full bg-sky-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
            >
              {primaryButtonText}
            </Link>
            <Link
              href={secondaryButtonUrl}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {secondaryButtonText}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
          <div className="rounded-[1.5rem] bg-slate-900 p-7 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-200">
              Business-ready support
            </p>
            <div className="mt-8 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-sky-100">
                  Consultation-first approach
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Recommendations matched to real office output, workflows, and team requirements.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-sky-100">
                  Demonstrations and planning
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Review printer capabilities, pricing direction, and implementation considerations before committing.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-sky-100">
                  Ongoing business support
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Technical guidance and after-sales support for a more reliable document environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
