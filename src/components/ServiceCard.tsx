import Link from "next/link";

type ServiceCardProps = {
  className?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
};

export default function ServiceCard({
  className,
  title = "Service Title",
  description = "Service description goes here.",
  buttonText = "Learn More",
  buttonUrl = "/booking",
}: ServiceCardProps) {
  return (
    <article
      className={`flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] ${className ?? ""}`}
    >
      <div className="mb-5 h-10 w-10 rounded-full bg-sky-100" />
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
        {description}
      </p>
      <Link
        href={buttonUrl}
        className="mt-6 inline-flex items-center text-sm font-semibold text-sky-800 transition hover:text-sky-900"
      >
        {buttonText}
      </Link>
    </article>
  );
}
