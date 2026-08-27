"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { superadminNavItems } from "@/lib/admin-mock-data";
import { createClient } from "@/lib/supabase/client";

export type AdminNavItem = {
  label: string;
  href: string;
};

type AdminSidebarProps = {
  className?: string;
  /** The links. Empty means the combined eight-item staff navigation. */
  navItems?: readonly AdminNavItem[];
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
  brand = "DocuJet Staff workspace",
  brandHref = "/admin",
  tagline = "Admin workspace",
  noteTitle = "Staff access",
  noteBody = "Use the superadmin area to manage staff accounts and review sensitive activity.",
  showNote = true,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted && profile?.role === "superadmin" && profile.is_active) {
        setIsSuperadmin(true);
      }
    }

    void loadRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const allItems: readonly AdminNavItem[] = navItems?.length ? navItems : superadminNavItems;
  const items = allItems.filter(
    (item) => isSuperadmin || !item.href.startsWith("/superadmin"),
  );

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
