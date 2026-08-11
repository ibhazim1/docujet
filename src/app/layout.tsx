import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-stone-50 text-slate-950">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
