type StatusBadgeProps = {
  status: string;
};

const statusStyles: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Confirmed: "bg-sky-100 text-sky-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-800",
  New: "bg-violet-100 text-violet-800",
  Contacted: "bg-slate-200 text-slate-700",
  Qualified: "bg-cyan-100 text-cyan-800",
  Proposal: "bg-orange-100 text-orange-800",
  Won: "bg-emerald-100 text-emerald-800",
  Lost: "bg-rose-100 text-rose-800",
  Active: "bg-emerald-100 text-emerald-800",
  Prospect: "bg-blue-100 text-blue-800",
  "Needs Follow-up": "bg-amber-100 text-amber-800",
  Draft: "bg-slate-200 text-slate-700",
  Disabled: "bg-rose-100 text-rose-800",
  "Not configured": "bg-slate-200 text-slate-700",
  // Where a settings value's live copy actually came from.
  "Saved on server": "bg-emerald-100 text-emerald-800",
  "Saved in browser": "bg-amber-100 text-amber-800",
  "From .env": "bg-sky-100 text-sky-800",
  Planned: "bg-amber-100 text-amber-800",
  Connected: "bg-emerald-100 text-emerald-800",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] ?? "bg-slate-200 text-slate-700"}`}
    >
      {status}
    </span>
  );
}
