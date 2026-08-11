import Link from "next/link";
import { footerPlaceholders, navItems } from "@/lib/site-data";

type FooterProps = {
  className?: string;
  companyName?: string;
  bookingLinkText?: string;
  bookingLinkUrl?: string;
};

export default function Footer({
  className,
  companyName = "DocuJet",
  bookingLinkText = "Book Appointment",
  bookingLinkUrl = "/booking",
}: FooterProps) {
  return (
    <footer
      className={`w-full border-t border-slate-200 bg-stone-50 ${className ?? ""}`}
    >
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {companyName}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Professional printing, consultation, and document solutions for
              businesses that need reliable support and clear next steps.
            </p>
            <Link
              href={bookingLinkUrl}
              className="mt-6 inline-flex items-center rounded-full bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
            >
              {bookingLinkText}
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Navigation
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-slate-950">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <h3 className="font-semibold text-slate-950">Contact</h3>
              <p className="mt-2">{footerPlaceholders.phone}</p>
              <p>{footerPlaceholders.email}</p>
              <p>{footerPlaceholders.office}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-950">Business Hours</h3>
              <p className="mt-2">{footerPlaceholders.hours}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
