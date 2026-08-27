"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import LogoutButton from "./LogoutButton";
import type { AdminNavItem } from "./AdminSidebar";

type AdminShellProps = {
  /** The page itself — header, content, whatever else. */
  children: React.ReactNode;
  className?: string;
  navItems?: readonly AdminNavItem[];
  brand?: string;
  brandHref?: string;
  tagline?: string;
  /** Drops the sidebar and the mobile bar, leaving only the content column. */
  showSidebar?: boolean;
  /** The mobile bar, which is the only way to reach the sidebar on a phone. */
  menuLabel?: string;
  mobileTitle?: string;
  drawerTitle?: string;
  closeLabel?: string;
};

/**
 * The admin frame: a fixed sidebar on desktop, a drawer on mobile.
 *
 * The coded pages get this from `AdminSiteFallback`. A Plasmic-authored admin
 * page does not — Studio renders the page component alone — so this is
 * registered as its own insertable element and a designer wraps the page in it
 * themselves. That is deliberate: the frame is then as editable as everything
 * inside it, rather than being welded on by the route.
 */
export default function AdminShell({
  children,
  className = "",
  navItems,
  brand,
  brandHref,
  tagline,
  showSidebar = true,
  menuLabel = "Menu",
  mobileTitle = "DocuJet Admin",
  drawerTitle = "Navigation",
  closeLabel = "Close",
}: AdminShellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-950 ${className}`}>
      <div className={showSidebar ? "lg:grid lg:grid-cols-[280px_minmax(0,1fr)]" : ""}>
        {showSidebar ? (
          <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-slate-200 bg-white lg:block">
            <AdminSidebar navItems={navItems} brand={brand} brandHref={brandHref} tagline={tagline} />
          </aside>
        ) : null}

        <div className="min-w-0">
          {showSidebar ? (
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {menuLabel}
              </button>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                {mobileTitle}
              </p>
              <LogoutButton className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" />
            </div>
          ) : null}

          {children}
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden">
          <div className="h-full w-[82%] max-w-xs overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                {drawerTitle}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {closeLabel}
              </button>
            </div>
            <AdminSidebar navItems={navItems} brand={brand} brandHref={brandHref} tagline={tagline} onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
