"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import type { OperationalSettings } from "@/lib/data/mappers";

interface StorefrontChromeProps {
  children: React.ReactNode;
  settings?: OperationalSettings;
}

export function StorefrontChrome({ children, settings }: StorefrontChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <AnnouncementBar settings={settings} />
      <Header settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
