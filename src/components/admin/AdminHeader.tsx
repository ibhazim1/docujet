import LogoutButton from "./LogoutButton";

type AdminHeaderProps = {
  title: string;
  description: string;
  /** The eyebrow above the title. */
  eyebrow?: string;
  className?: string;
};

export default function AdminHeader({
  title,
  description,
  eyebrow = "DocuJet Admin",
  className = "",
}: AdminHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8 ${className}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex w-full flex-col gap-3 self-start sm:w-auto sm:flex-row sm:items-center md:self-auto">
        <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-950">Admin Profile</p>
          <p>Supabase authenticated staff account</p>
        </div>
        <LogoutButton
          label="Logout"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:self-auto"
        />
      </div>
    </header>
  );
}
