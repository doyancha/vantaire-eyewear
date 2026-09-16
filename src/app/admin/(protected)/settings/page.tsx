import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsWorkspace } from "@/components/admin/settings/SettingsWorkspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Site Settings | Admin CMS",
  description: "Manage live concierge WhatsApp configuration, business hours, and delivery settings.",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !row) {
    throw new Error("Failed to load site settings singleton row (id = 1)");
  }

  const initialData = {
    id: row.id,
    whatsappNumber: row.whatsapp_number,
    whatsappDisplayNumber: row.whatsapp_display_number,
    whatsappIsDemo: row.whatsapp_is_demo,
    whatsappDefaultGreeting: row.whatsapp_default_greeting,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    contactHours: row.contact_hours,
    contactFridayHours: row.contact_friday_hours,
    contactLocation: row.contact_location,
    contactServiceArea: row.contact_service_area,
    deliveryInsideDhakaTime: row.delivery_inside_dhaka_time,
    deliveryOutsideDhakaTime: row.delivery_outside_dhaka_time,
    deliveryFeeInsideDhaka: Number(row.delivery_fee_inside_dhaka),
    deliveryFeeOutsideDhaka: Number(row.delivery_fee_outside_dhaka),
    deliveryCurrencySymbol: row.delivery_currency_symbol,
    deliveryCurrencyCode: row.delivery_currency_code,
    deliveryCashOnDelivery: Boolean(row.delivery_cash_on_delivery),
    deliveryAdvancePaymentNote: row.delivery_advance_payment_note,
    deliveryPackaging: row.delivery_packaging,
    socialInstagram: row.social_instagram || "",
    socialFacebook: row.social_facebook || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return <SettingsWorkspace initialData={initialData} />;
}
