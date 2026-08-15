"use client";

import { usePathname } from "next/navigation";

import ChatWidget from "@/components/chat/ChatWidget";

type SiteChromeProps = {
  children: React.ReactNode;
};

export default function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isPlasmicHost = pathname === "/plasmic-host";
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  // The assistant is for visitors, so it stays off the staff-facing routes and
  // out of the Plasmic canvas — where a fixed-position overlay would sit on top
  // of whatever the editor is trying to arrange.
  if (isPlasmicHost || isAdminRoute || isLoginRoute) {
    return children;
  }

  // Mounting here rather than inside a page component means it also rides along
  // on the pages Plasmic renders, which never pass through PublicSiteFallback.
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
