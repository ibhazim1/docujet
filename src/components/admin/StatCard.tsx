import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  /** Turns the card into a link — used by the KPIs that toggle a filter. */
  href?: string;
  /** Marks a link card whose filter is currently applied. */
  active?: boolean;
  /** `sm` shrinks the value for text rather than numeric readings. */
  valueSize?: "md" | "sm";
};

export default function StatCard({
  label,
  value,
  helper,
  href,
  active = false,
  valueSize = "md",
}: StatCardProps) {
  const body = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-3 font-semibold tracking-tight text-slate-950 ${
          valueSize === "sm" ? "text-xl" : "text-3xl"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </>
  );

  const className = `block rounded-3xl border bg-white p-5 shadow-sm ${
    active ? "border-sky-800 ring-2 ring-sky-100" : "border-slate-200"
  }`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:border-slate-400`}>
        {body}
      </Link>
    );
  }

  return <section className={className}>{body}</section>;
}
