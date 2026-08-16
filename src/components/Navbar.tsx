"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "@/lib/site-data";

type NavbarProps = {
  className?: string;
  companyName?: string;
};

export default function Navbar({ className, companyName = "DocuJet" }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  function linkClassName(href: string) {
    const isActive = pathname === href;
    return isActive
      ? "text-slate-950"
      : "text-slate-600 transition hover:text-slate-950";
  }

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur ${className ?? ""}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-950">
          {companyName}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems
            .filter((item) => item.href !== "/booking")
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClassName(item.href)}
            >
              {item.label}
            </Link>
            ))}
          <Link
            href="/booking"
            className="rounded-full bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            Book Appointment
          </Link>
        </div>

        <button
          type="button"
          className="flex flex-col gap-1.5 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          <span className="h-0.5 w-6 bg-slate-950" />
          <span className="h-0.5 w-6 bg-slate-950" />
          <span className="h-0.5 w-6 bg-slate-950" />
        </button>
      </div>

      {isOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-200 bg-white px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={linkClassName(item.href)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/booking"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-sky-800 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
