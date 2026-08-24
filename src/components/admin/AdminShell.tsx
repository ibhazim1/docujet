"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import LogoutButton from "./LogoutButton";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <AdminSidebar />
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Menu
            </button>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              DocuJet Admin
            </p>
            <LogoutButton className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" />
          </div>

          {children}
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden">
          <div className="h-full w-[82%] max-w-xs bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                Navigation
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Close
              </button>
            </div>
            <AdminSidebar onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
