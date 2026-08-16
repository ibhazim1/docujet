import ServiceCard from "./ServiceCard";
import { serviceItems as defaultServiceItems } from "@/lib/site-data";
import type { ServiceItem } from "@/lib/site-data";

type ServicesSectionProps = {
  className?: string;
  title?: string;
  description?: string;
  serviceItems?: ServiceItem[];
};

export default function ServicesSection({
  className,
  title = "WorkForce Enterprise Product Range",
  description = "Explore the three Epson WorkForce Enterprise models and review the key product details highlighted in the brochure, including speed, Heat-Free printing, finishing support, and enterprise workflow readiness.",
  serviceItems = defaultServiceItems,
}: ServicesSectionProps) {
  return (
    <section className={`w-full bg-white py-20 ${className ?? ""}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {description}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {serviceItems.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
}
