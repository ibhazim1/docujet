import { fetchPlasmicPage } from "./fetchPlasmicPage";
import PublicPlasmicPageClient from "./PublicPlasmicPageClient";
import AdminSiteFallback from "./AdminSiteFallback";

type AdminPlasmicPageProps = {
  path: string;
  fallback: React.ReactNode;
};

export default async function AdminPlasmicPage({
  path,
  fallback,
}: AdminPlasmicPageProps) {
  const plasmicData = await fetchPlasmicPage(path);

  if (!plasmicData) {
    return <AdminSiteFallback>{fallback}</AdminSiteFallback>;
  }

  return <PublicPlasmicPageClient component={path} prefetchedData={plasmicData} />;
}
