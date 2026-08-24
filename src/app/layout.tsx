import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { getSettingsSafe } from "@/lib/settings/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docujet.biz"),
  title: {
    default: "DocuJet | Printing & Document Solutions",
    template: "%s | DocuJet",
  },
  description:
    "Professional printing, printer consultation, product demonstrations, and document solutions for businesses.",
  openGraph: {
    title: "DocuJet | Printing & Document Solutions",
    description:
      "Professional printing, printer consultation, product demonstrations, and document solutions for businesses.",
    url: "https://docujet.biz",
    siteName: "DocuJet",
    locale: "en_MY",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getSettingsSafe(), not getSettings(): the whole site renders through this
  // layout, so unreadable settings must degrade to defaults here, never
  // 500 every page. Only the public-safe chat subset crosses into a Client
  // Component prop — settings also holds integration secrets, which must
  // never reach here.
  const { chat } = await getSettingsSafe();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-stone-50 text-slate-950">
        <SiteChrome chatConfig={chat}>{children}</SiteChrome>
      </body>
    </html>
  );
}
