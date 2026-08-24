"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/lib/admin-mock-data";

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function AdminSidebar({
  className,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href="/admin" className="text-2xl font-semibold tracking-tight text-slate-950">
          DocuJet
        </Link>
        <p className="mt-2 text-sm text-slate-500">Admin dashboard UI preview</p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {adminNavItems.map((item) => {
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

      <div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-500">
        <p className="font-medium text-slate-900">Security note</p>
        <p className="mt-2">
          Admin authentication and route protection are not active yet.
        </p>
      </div>
    </div>
  );
}
