import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/config";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.brandName} | Sunglasses Collection • Shade Your Presence`,
    template: `%s | ${siteConfig.brandName}`,
  },
  description: `${siteConfig.brandName} presents architectural sunglasses silhouettes with sun-tinted optics. Order directly through WhatsApp with nationwide delivery across Bangladesh.`,
  keywords: [
    "sunglasses Bangladesh",
    "eyewear Dhaka",
    "sun protection sunglasses",
    "WhatsApp order sunglasses",
    "eyewear collection",
    "VANTAIRE EYEWEAR",
    "shades Dhaka"
  ],
  authors: [{ name: siteConfig.brandName }],
  creator: siteConfig.brandName,
  publisher: siteConfig.brandName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.siteUrl,
    title: `${siteConfig.brandName} | Shade Your Presence`,
    description: "Architectural sunglasses silhouettes with sun-tinted optics. Direct WhatsApp ordering & nationwide delivery across Bangladesh.",
    siteName: siteConfig.brandName,
    images: [
      {
        url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: `${siteConfig.brandName} Sunglasses Collection`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.brandName} | Shade Your Presence`,
    description: "Architectural sunglasses silhouettes. WhatsApp ordering across Bangladesh.",
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${playfair.variable} ${inter.variable} font-sans bg-vantaire-black text-vantaire-warmWhite antialiased selection:bg-vantaire-champagne selection:text-vantaire-black flex flex-col min-h-screen`}
      >
        <AnnouncementBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}