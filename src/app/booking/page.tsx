import type { Metadata } from "next";
import BookingPageView from "@/components/pages/BookingPage";
import PublicPlasmicPage from "@/components/plasmic/PublicPlasmicPage";

export const metadata: Metadata = {
  title: "Book Appointment",
  description:
    "Request a consultation, demonstration, pricing discussion, or technical session with DocuJet.",
};

export default function BookingPage() {
  return <PublicPlasmicPage path="/booking" fallback={<BookingPageView />} />;
}
