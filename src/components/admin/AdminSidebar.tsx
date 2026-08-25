"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/lib/admin-mock-data";

export type AdminNavItem = {
  label: string;
  href: string;
};

type AdminSidebarProps = {
  className?: string;
  /** The links. Empty means the five the admin ships with. */
  navItems?: AdminNavItem[];
  brand?: string;
  brandHref?: string;
  tagline?: string;
  /** The panel at the bottom. */
  noteTitle?: string;
  noteBody?: string;
  showNote?: boolean;
  onNavigate?: () => void;
};

export default function AdminSidebar({
  className,
  navItems,
  brand = "DocuJet",
  brandHref = "/admin",
  tagline = "Admin dashboard UI preview",
  noteTitle = "Security note",
  noteBody = "Admin authentication and route protection are not active yet.",
  showNote = true,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const items = navItems?.length ? navItems : adminNavItems;

  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href={brandHref} className="text-2xl font-semibold tracking-tight text-slate-950">
          {brand}
        </Link>
        {tagline ? <p className="mt-2 text-sm text-slate-500">{tagline}</p> : null}
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-800 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {showNote && (noteTitle || noteBody) ? (
        <div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-500">
          <p className="font-medium text-slate-900">{noteTitle}</p>
          <p className="mt-2">{noteBody}</p>
        </div>
      ) : null}
    </div>
  );
}
