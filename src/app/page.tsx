import type { Metadata } from "next";
import HomePage from "@/components/pages/HomePage";
import PublicPlasmicPage from "@/components/plasmic/PublicPlasmicPage";

export const metadata: Metadata = {
  title: "Printing & Document Solutions",
  description:
    "Professional printing, consultation, and document solutions for modern businesses.",
};

export default function Home() {
  return <PublicPlasmicPage path="/" fallback={<HomePage />} />;
}
