import Link from "next/link";
import { footerPlaceholders } from "@/lib/site-data";

type ContactPageProps = {
  className?: string;
  pageTitle?: string;
  pageDescription?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessHours?: string;
  ctaText?: string;
  ctaUrl?: string;
};

export default function ContactPage({
  className,
  pageTitle = "Speak with us about Epson WorkForce Enterprise solutions",
  pageDescription = "Use the contact form for enquiries related to the WF-C20600, WF-C20750, and WF-C21000, or book a consultation if you already know the type of discussion you need.",
  phone = footerPlaceholders.phone,
  email = footerPlaceholders.email,
  address = footerPlaceholders.office,
  businessHours = footerPlaceholders.hours,
  ctaText = "Book Consultation",
  ctaUrl = "/booking",
}: ContactPageProps) {
  return (
    <main className={`w-full min-w-0 ${className ?? ""}`}>
      <section className="docujet-hero-surface border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            Contact
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
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name" htmlFor="contact-name">
                <input id="contact-name" className={inputClassName} />
              </Field>
              <Field label="Company Name" htmlFor="contact-company">
                <input id="contact-company" className={inputClassName} />
              </Field>
              <Field label="Email Address" htmlFor="contact-email">
                <input
                  id="contact-email"
                  type="email"
                  className={inputClassName}
                />
              </Field>
              <Field label="Phone Number" htmlFor="contact-phone">
                <input id="contact-phone" className={inputClassName} />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Message" htmlFor="contact-message">
                <textarea
                  id="contact-message"
                  rows={6}
                  className={`${inputClassName} resize-y`}
                />
              </Field>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                Contact form placeholder for frontend structure. Backend or
                delivery integration can be added later.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-sky-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
              >
                Send Enquiry
              </button>
            </div>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-stone-50 p-8">
            <h2 className="text-2xl font-semibold text-slate-950">
              Contact Details
            </h2>
            <div className="mt-6 space-y-6 text-sm leading-7 text-slate-600">
              <section>
                <h3 className="font-semibold text-slate-950">Phone</h3>
                <p>{phone}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-950">Email</h3>
                <p>{email}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-950">Office Location</h3>
                <p>{address}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-950">Business Hours</h3>
                <p>{businessHours}</p>
              </section>
            </div>
            <Link
              href={ctaUrl}
              className="mt-8 inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {ctaText}
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-800"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
