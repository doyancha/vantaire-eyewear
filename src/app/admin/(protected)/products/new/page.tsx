import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Add Product | VANTAIRE Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminNewProductPage() {
  await requireAdmin();

  return <ProductForm mode="create" />;
}
