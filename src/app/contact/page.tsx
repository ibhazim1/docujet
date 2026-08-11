import type { Metadata } from "next";
import ContactPageView from "@/components/pages/ContactPage";
import PublicPlasmicPage from "@/components/plasmic/PublicPlasmicPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact DocuJet for consultations, demonstrations, printing support, and business document solution enquiries.",
};

export default function ContactPage() {
  return <PublicPlasmicPage path="/contact" fallback={<ContactPageView />} />;
}
