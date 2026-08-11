"use client";

import { usePathname } from "next/navigation";

type SiteChromeProps = {
  children: React.ReactNode;
};

export default function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isPlasmicHost = pathname === "/plasmic-host";
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  if (isPlasmicHost || isAdminRoute || isLoginRoute) {
    return children;
  }

  return children;
}
