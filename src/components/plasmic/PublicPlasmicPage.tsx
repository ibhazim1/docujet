import { fetchPlasmicPage } from "./fetchPlasmicPage";
import PublicPlasmicPageClient from "./PublicPlasmicPageClient";
import PublicSiteFallback from "./PublicSiteFallback";

type PublicPlasmicPageProps = {
  path: string;
  fallback: React.ReactNode;
};

export default async function PublicPlasmicPage({
  path,
  fallback,
}: PublicPlasmicPageProps) {
  const plasmicData = await fetchPlasmicPage(path);

  if (!plasmicData) {
    return <PublicSiteFallback>{fallback}</PublicSiteFallback>;
  }

  return <PublicPlasmicPageClient component={path} prefetchedData={plasmicData} />;
}
