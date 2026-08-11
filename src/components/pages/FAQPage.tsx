import CallToAction from "@/components/CallToAction";
import FaqAccordion from "@/components/FaqAccordion";
import { faqItems } from "@/lib/site-data";

type FAQPageProps = {
  className?: string;
  pageTitle?: string;
  pageDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
};

export default function FAQPage({
  className,
  pageTitle = "Questions about Epson WorkForce Enterprise printers",
  pageDescription = "Review the key brochure-driven questions around Heat-Free Technology, print speed, consumables, workflow tools, media handling, and security.",
  ctaTitle = "Need a tailored recommendation?",
  ctaDescription = "Book a consultation to discuss your expected print volume, duplex needs, media requirements, workflow software, and finishing setup.",
  ctaButtonText = "Book Consultation",
  ctaButtonUrl = "/booking",
}: FAQPageProps) {
  return (
    <main className={`w-full min-w-0 ${className ?? ""}`}>
      <section className="docujet-hero-surface border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            Frequently Asked Questions
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            {pageTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
            {pageDescription}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <FaqAccordion items={faqItems} />
        </div>
      </section>

      <CallToAction
        title={ctaTitle}
        description={ctaDescription}
        buttonText={ctaButtonText}
        buttonUrl={ctaButtonUrl}
      />
    </main>
  );
}
