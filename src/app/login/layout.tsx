import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Frontend-only administrator login screen for DocuJet staff.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
