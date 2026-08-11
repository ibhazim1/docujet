import type { Metadata } from "next";
import FAQPage from "@/components/pages/FAQPage";
import PublicPlasmicPage from "@/components/plasmic/PublicPlasmicPage";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about DocuJet consultations, demonstrations, booking, pricing, and support.",
};

export default function FaqPage() {
  return <PublicPlasmicPage path="/faq" fallback={<FAQPage />} />;
}
