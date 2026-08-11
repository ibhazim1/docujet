import Link from "next/link";

type CallToActionProps = {
  className?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
};

export default function CallToAction({
  className,
  title = "Book a consultation with DocuJet",
  description = "Tell us what you need and we will prepare the right discussion, demonstration, or recommendation path for your business.",
  buttonText = "Book Appointment",
  buttonUrl = "/booking",
}: CallToActionProps) {
  return (
    <section className={`w-full py-20 ${className ?? ""}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {description}
            </p>
          </div>
          <div className="mt-8">
            <Link
              href={buttonUrl}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              {buttonText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
