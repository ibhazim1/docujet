"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-16">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-slate-950 px-8 py-10 text-white md:px-10 md:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">
            DocuJet
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            Admin Login
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-slate-300">
            This login screen is for DocuJet client staff and administrators.
            Public customers do not need an account to use the booking page.
          </p>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            <p className="font-semibold text-white">Public booking stays open</p>
            <p className="mt-2">
              Customer appointments continue through{" "}
              <Link href="/booking" className="text-sky-200 underline">
                /booking
              </Link>{" "}
              with no login required.
            </p>
          </div>
        </div>

        <div className="px-8 py-10 md:px-10 md:py-12">
          <p className="text-sm font-medium text-slate-500">
            Staff sign-in preview
          </p>
          <form className="mt-6 space-y-5">
            <Field label="Email Address" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                className={inputClassName}
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Password" htmlFor="login-password">
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className={`${inputClassName} pr-20`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Remember me
              </label>
              <span className="text-sm text-sky-800">
                Forgot password
              </span>
            </div>

            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="status"
              aria-live="polite"
            >
              Authentication is currently disabled for preview use. Click Sign In
              to open the admin dashboard.
            </div>

            <Link
              href="/admin"
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-900"
            >
              Sign In
            </Link>
          </form>
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
