import type { Metadata } from "next";
import ServicesPageView from "@/components/pages/ServicesPage";
import PublicPlasmicPage from "@/components/plasmic/PublicPlasmicPage";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Explore the Epson WorkForce Enterprise product range and review the key details for each available model.",
};

export default function ServicesPage() {
  return <PublicPlasmicPage path="/services" fallback={<ServicesPageView />} />;
}
