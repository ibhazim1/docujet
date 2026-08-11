import Image from "next/image";
import CallToAction from "@/components/CallToAction";

type ServicesPageProps = {
  className?: string;
  pageTitle?: string;
  pageDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
};

const products = [
  {
    name: "WF-C20600",
    image: "/products/WF-C20600.jpg",
    speed: "60 ipm",
    position: "Best for organisations moving into high-volume A3 colour printing",
    summary:
      "The WF-C20600 is the entry point into the WorkForce Enterprise range, giving teams a strong balance of speed, low intervention, and Heat-Free efficiency without oversizing the deployment.",
    details: [
      "Approximate ISO print speed of 60 images per minute for simplex and duplex output.",
      "Built for offices that need dependable A3 multifunction performance with less warm-up delay.",
      "Supports finishing options and broad media handling for day-to-day departmental production.",
    ],
  },
  {
    name: "WF-C20750",
    image: "/products/WF-C20750.jpg",
    speed: "75 ipm",
    position: "Best for busier shared environments that need more throughput",
    summary:
      "The WF-C20750 steps up output capacity for central office print rooms and larger teams, offering a faster production pace while keeping the same business-ready platform and workflow flexibility.",
    details: [
      "Approximate ISO print speed of 75 images per minute for simplex and duplex printing.",
      "PrecisionCore linehead inkjet design helps maintain high-speed, consistent document output.",
      "A strong fit when workloads are heavier and finishing, media support, and uptime matter more.",
    ],
  },
  {
    name: "WF-C21000",
    image: "/products/WF-C21000.jpg",
    speed: "100 ipm",
    position: "Best for the most demanding enterprise print volumes",
    summary:
      "The WF-C21000 is the flagship model in the range, designed for organisations that need maximum throughput, reduced intervention, and a more capable platform for large-scale business printing.",
    details: [
      "Approximate ISO print speed of up to 100 images per minute.",
      "High-capacity consumables and reduced replacement frequency help support continuous operation.",
      "Designed for enterprise environments that need top-end output, workflow integration, and broad finishing capability.",
    ],
  },
];

const comparisonRows = [
  {
    label: "Print speed",
    values: ["60 ipm", "75 ipm", "100 ipm"],
  },
  {
    label: "Recommended environment",
    values: [
      "Departments scaling beyond standard office printers",
      "Shared office fleets with heavier daily demand",
      "Enterprise sites with sustained high-volume output",
    ],
  },
  {
    label: "Best fit",
    values: [
      "Growing departments",
      "Busy shared teams",
      "High-volume enterprise sites",
    ],
  },
  {
    label: "Strength",
    values: [
      "Balanced entry model",
      "Higher throughput with the same platform",
      "Maximum speed and capacity in the range",
    ],
  },
  {
    label: "Heat-Free printing",
    values: ["Yes", "Yes", "Yes"],
  },
  {
    label: "Duplex productivity",
    values: ["High-speed duplex", "High-speed duplex", "High-speed duplex"],
  },
  {
    label: "Finishing support",
    values: ["Advanced options", "Advanced options", "Advanced options"],
  },
  {
    label: "Workflow and admin tools",
    values: [
      "Enterprise-ready",
      "Enterprise-ready",
      "Enterprise-ready",
    ],
  },
];

const sharedHighlights = [
  "Heat-Free Technology helps reduce warm-up time and power consumption compared with conventional laser workflows.",
  "High-yield consumables reduce the frequency of intervention in demanding office environments.",
  "Support for finishing, thick media, and long paper gives the range flexibility beyond standard office printing.",
  "Enterprise tooling includes workflow, fleet management, security, and print administration support.",
];

export default function ServicesPage({
  className,
  pageTitle = "Epson WorkForce Enterprise WF-C20600, WF-C20750, and WF-C21000",
  pageDescription = "Explore the Epson WorkForce Enterprise product range with printer visuals, model-by-model descriptions, and a side-by-side comparison to help you choose the right fit for your organisation.",
  ctaTitle = "Need help choosing the right product?",
  ctaDescription = "Book a product consultation to compare the WF-C20600, WF-C20750, and WF-C21000 based on output speed, media handling, finishing options, and deployment needs.",
  ctaButtonText = "Book Product Consultation",
  ctaButtonUrl = "/booking",
}: ServicesPageProps) {
  return (
    <main className={`w-full min-w-0 ${className ?? ""}`}>
      <section className="docujet-hero-surface border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            Product
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            {pageTitle}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
            {pageDescription}
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.name}
                className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                  {product.name}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {product.speed}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {product.position}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              Product Details
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Model-by-model overview
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Each printer in the WorkForce Enterprise line is built on the same
              core platform, but the right choice depends on the amount of output
              your team expects, the pressure on shared devices, and how much
              headroom you want for future demand.
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {products.map((product, index) => (
              <article
                key={product.name}
                className="grid gap-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:p-8"
              >
                <div
                  className={`overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 ${
                    index % 2 === 1 ? "lg:order-2" : ""
                  }`}
                >
                  <Image
                    src={product.image}
                    alt={`${product.name} printer illustration`}
                    width={960}
                    height={720}
                    className="h-auto w-full rounded-[1.2rem]"
                  />
                </div>

                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                    {product.name}
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold text-slate-950">
                    {product.position}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-slate-600">
                    {product.summary}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {product.details.map((detail) => (
                      <li
                        key={detail}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700"
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
              Comparison
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Compare the three models at a glance
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              All three devices share the same WorkForce Enterprise direction,
              but they serve different levels of print demand. This comparison is
              designed to make the sizing decision easier.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[2rem] border border-white/10 bg-white/5">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-r border-white/10 px-5 py-4 text-left text-sm font-semibold text-slate-200">
                    Category
                  </th>
                  {products.map((product) => (
                    <th
                      key={product.name}
                      className="border-b border-r border-white/10 px-5 py-4 text-left text-sm font-semibold text-white last:border-r-0"
                    >
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-2xl bg-white p-2">
                          <Image
                            src={product.image}
                            alt={`${product.name} printer`}
                            width={500}
                            height={500}
                            className="h-36 w-full rounded-xl object-contain"
                          />
                        </div>
                        <div>
                          <p>{product.name}</p>
                          <p className="mt-1 text-xs font-medium text-sky-300">
                            {product.speed}
                          </p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="border-b border-r border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-medium text-slate-200"
                    >
                      {row.label}
                    </th>
                    {row.values.map((value, valueIndex) => (
                      <td
                        key={`${row.label}-${products[valueIndex]?.name}`}
                        className="border-b border-r border-white/10 px-5 py-4 text-sm leading-7 text-slate-300 last:border-r-0"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
                Shared Strengths
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                What all three printers bring to the table
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                The difference between the models is mainly throughput. The
                broader platform benefits remain consistent across the range, so
                organisations can size performance without giving up the core
                feature set.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sharedHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CallToAction
        title={ctaTitle}
        description={ctaDescription}
        buttonText={ctaButtonText}
        buttonUrl={ctaButtonUrl}
      />
    </main>
  );
}
