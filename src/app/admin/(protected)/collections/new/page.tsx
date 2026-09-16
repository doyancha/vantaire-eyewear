import { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/server";
import { CollectionCreateForm } from "@/components/admin/collections/CollectionCreateForm";

export const metadata: Metadata = {
  title: "Add Collection | VANTAIRE Admin",
  description: "Create a new collection silhouette draft.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCollectionPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="text-xs font-mono text-vantaire-muted">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/admin" className="hover:text-vantaire-warmWhite transition-colors">
                Admin
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/admin/collections" className="hover:text-vantaire-warmWhite transition-colors">
                Collections
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-vantaire-champagne font-medium" aria-current="page">
              New
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-vantaire-champagne/10 text-vantaire-champagne border border-vantaire-champagne/20 shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              New Collection Silhouette
            </h1>
            <p className="text-xs text-vantaire-muted">
              Establish editorial identity and immutable public route slug.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <CollectionCreateForm />
    </div>
  );
}
