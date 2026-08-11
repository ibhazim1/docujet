"use client";

import {
  PlasmicComponent,
  PlasmicRootProvider,
  type ComponentRenderData,
} from "@plasmicapp/loader-nextjs";
import "@/plasmic-init-client";
import { PLASMIC } from "@/plasmic-init";

type PublicPlasmicPageClientProps = {
  component: string;
  prefetchedData: ComponentRenderData;
};

export default function PublicPlasmicPageClient({
  component,
  prefetchedData,
}: PublicPlasmicPageClientProps) {
  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={prefetchedData}>
      <PlasmicComponent component={component} />
    </PlasmicRootProvider>
  );
}
