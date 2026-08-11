import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

type PublicSiteFallbackProps = {
  children: React.ReactNode;
};

export default function PublicSiteFallback({
  children,
}: PublicSiteFallbackProps) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
