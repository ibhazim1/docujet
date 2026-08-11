import { PLASMIC } from "@/plasmic-init";
import LoginPage from "@/components/pages/LoginPage";
import PublicPlasmicPageClient from "./PublicPlasmicPageClient";

export default async function LoginPlasmicPage() {
  const plasmicData = await PLASMIC.maybeFetchComponentData("/login");

  if (!plasmicData) {
    return <LoginPage />;
  }

  return <PublicPlasmicPageClient component="/login" prefetchedData={plasmicData} />;
}
