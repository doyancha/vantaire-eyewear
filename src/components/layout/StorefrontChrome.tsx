"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import type { OperationalSettings } from "@/lib/data/mappers";
import type { CollectionMeta } from "@/types/catalog";

interface StorefrontChromeProps {
  children: React.ReactNode;
  settings?: OperationalSettings;
  collections?: CollectionMeta[];
}

export function StorefrontChrome({ children, settings, collections }: StorefrontChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <AnnouncementBar settings={settings} />
      <Header settings={settings} collections={collections} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} collections={collections} />
    </>
  );
}
