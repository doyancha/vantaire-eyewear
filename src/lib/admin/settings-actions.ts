"use server";

import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { siteSettingsSchema, SiteSettingsFormValues } from "./settings-validation";
import { revalidateSiteSettingsCaches } from "./revalidate";
import { mapDbSiteSettings, OperationalSettings } from "@/lib/data/mappers";

export type ActionResponse<T = any> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export interface UpdateSiteSettingsResult {
  settings: OperationalSettings;
  updatedAt: string;
}

/**
 * Server Action to update the singleton site_settings row (id = 1).
 * Enforces authenticated admin authorization, Zod schema validation, demo truthfulness,
 * and optimistic concurrency control via expectedUpdatedAt.
 */
export async function updateSiteSettingsAction(
  rawInput: unknown
): Promise<ActionResponse<UpdateSiteSettingsResult>> {
  try {
    // 1. Authorize admin/owner session
    await requireAdmin();
    const supabase = await createClient();

    // 2. Validate input payload
    const parsed = siteSettingsSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Invalid settings data provided";
      return {
        success: false,
        error: firstError,
        fieldErrors,
      };
    }

    const payload = parsed.data;

    // 3. Fetch current singleton row to verify existence and optimistic concurrency
    const { data: currentRow, error: fetchErr } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (fetchErr || !currentRow) {
      return {
        success: false,
        error: "Site settings singleton row (id = 1) not found in database.",
      };
    }

    // 4. Optimistic concurrency verification
    if (currentRow.updated_at !== payload.expectedUpdatedAt) {
      return {
        success: false,
        error:
          "Settings changed in another session. Reload the latest configuration before saving.",
      };
    }

    // 5. Perform atomic update matching both id = 1 and expected updated_at token
    const { data: updatedRows, error: updateErr } = await (supabase.from("site_settings") as any)
      .update({
        whatsapp_number: payload.whatsappNumber,
        whatsapp_display_number: payload.whatsappDisplayNumber,
        whatsapp_is_demo: payload.whatsappIsDemo,
        whatsapp_default_greeting: payload.whatsappDefaultGreeting,
        contact_phone: payload.contactPhone,
        contact_email: payload.contactEmail,
        contact_hours: payload.contactHours,
        contact_friday_hours: payload.contactFridayHours,
        contact_location: payload.contactLocation,
        contact_service_area: payload.contactServiceArea,
        delivery_inside_dhaka_time: payload.deliveryInsideDhakaTime,
        delivery_outside_dhaka_time: payload.deliveryOutsideDhakaTime,
        delivery_fee_inside_dhaka: payload.deliveryFeeInsideDhaka,
        delivery_fee_outside_dhaka: payload.deliveryFeeOutsideDhaka,
        delivery_cash_on_delivery: payload.deliveryCashOnDelivery,
        delivery_advance_payment_note: payload.deliveryAdvancePaymentNote,
        delivery_packaging: payload.deliveryPackaging,
        social_instagram: payload.socialInstagram || null,
        social_facebook: payload.socialFacebook || null,
      })
      .eq("id", 1)
      .eq("updated_at", payload.expectedUpdatedAt)
      .select();

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || "Failed to update site settings.",
      };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return {
        success: false,
        error:
          "Settings changed in another session. Reload the latest configuration before saving.",
      };
    }

    const updatedRow = updatedRows[0];

    // 6. Revalidate cache surfaces across storefront and admin
    await revalidateSiteSettingsCaches();

    return {
      success: true,
      message: "Site settings successfully updated and revalidated.",
      data: {
        settings: mapDbSiteSettings(updatedRow),
        updatedAt: updatedRow.updated_at,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while saving site settings.",
    };
  }
}
