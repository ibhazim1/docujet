import Link from "next/link";

import CallToAction from "@/components/CallToAction";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";

import {
  benefitItems,
  faqItems,
  whyChooseItems,
} from "@/lib/site-data";

type HomePageProps = {
  className?: string;

  heroTitle?: string;
  heroDescription?: string;

  primaryButtonText?: string;
  primaryButtonUrl?: string;

  secondaryButtonText?: string;
  secondaryButtonUrl?: string;

  benefitsHeading?: string;

  whyChooseHeading?: string;

  faqHeading?: string;

  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
};

export default function HomePage({
  className,

  heroTitle = "Shaping the Future of Business Printing with Heat-Free Technology",

  heroDescription =
    "Powered by Epson Heat-Free Technology, the WorkForce Enterprise WF-C20600, WF-C20750, and WF-C21000 provide consistent high-speed printing, lower power consumption, and fewer replacement parts for demanding business environments.",

  primaryButtonText = "Book a Product Consultation",
  primaryButtonUrl = "/booking",

  secondaryButtonText = "Explore the Models",
  secondaryButtonUrl = "/services",

  benefitsHeading =
    "Built around enterprise speed, low intervention, and Heat-Free efficiency",

  whyChooseHeading =
    "Why organisations choose the WorkForce Enterprise platform",

  faqHeading =
    "Common questions about the Epson WorkForce Enterprise range",

  ctaTitle =
    "Ready to review the right model for your print volume?",

  ctaDescription =
    "Book a consultation to compare the WF-C20600, WF-C20750, and WF-C21000, review finishing options, and plan the right deployment approach.",

  ctaButtonText = "Book Consultation",
  ctaButtonUrl = "/booking",
}: HomePageProps) {
  return (
    <main
      className={`w-full min-w-0 overflow-x-hidden ${
        className ?? ""
      }`}
    >
      {/* HERO */}
      <Hero
        title={heroTitle}
        description={heroDescription}
        primaryButtonText={primaryButtonText}
        primaryButtonUrl={primaryButtonUrl}
        secondaryButtonText={secondaryButtonText}
        secondaryButtonUrl={secondaryButtonUrl}
      />

      {/* KEY BENEFITS */}
      <section className="w-full py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              Key Benefits
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {benefitsHeading}
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {benefitItems.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]"
              >
                <h3 className="text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="w-full">
        <ServicesSection />
      </section>

      {/* WHY CHOOSE DOCUJET */}
      <section className="w-full py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              Why Choose DocuJet
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {whyChooseHeading}
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              DocuJet is positioned for businesses that want practical
              guidance, suitable technology, and a smoother path from
              exploration to support.
            </p>
          </div>

          <div className="grid gap-4">
            {whyChooseItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-700 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full">
        <CallToAction
          title={ctaTitle}
          description={ctaDescription}
          buttonText={ctaButtonText}
          buttonUrl={ctaButtonUrl}
        />
      </section>

      {/* FAQ PREVIEW */}
      <section className="w-full py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                FAQ Preview
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                {faqHeading}
              </h2>
            </div>

            <Link
              href="/faq"
              className="inline-flex items-center text-sm font-semibold text-sky-800 transition hover:text-sky-900"
            >
              View all FAQ
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {faqItems.slice(0, 3).map((item) => (
              <article
                key={item.question}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]"
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {item.question}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
