import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";
import { siteSettingsSchema } from "../src/lib/admin/settings-validation";
import { mapDbSiteSettings } from "../src/lib/data/mappers";
import { buildGeneralWhatsAppUrl } from "../src/lib/whatsapp";
import { revalidateSiteSettingsCaches } from "../src/lib/admin/revalidate";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Required Supabase credentials missing from environment.");
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runSettingsFunctionalVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 11 SETTINGS VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch initial pristine singleton row
  const { data: initialRow, error: fetchErr } = await adminClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (fetchErr || !initialRow) {
    throw new Error(`Failed to fetch initial site_settings row: ${fetchErr?.message}`);
  }

  try {
    // ---------------------------------------------------------------------------
    // [1/5] Singleton Row & Immutability Verification
    // ---------------------------------------------------------------------------
    console.log("\n[1/5] Testing Singleton Row & Immutability Guarantees...");

    // 1. Exactly 1 row exists
    const { count, error: countErr } = await adminClient
      .from("site_settings")
      .select("*", { count: "exact", head: true });
    assert(!countErr && count === 1, "Exactly one row exists in public.site_settings (count = 1)");

    // 2. Attempt to INSERT a second row with id = 2 (must fail chk_site_settings_singleton_id)
    const { error: insertErr } = await adminClient
      .from("site_settings")
      .insert({
        id: 2 as any,
        whatsapp_number: "8801700000000",
        whatsapp_display_number: "+880 1700-000000",
        whatsapp_is_demo: true,
        whatsapp_default_greeting: "Hello",
        contact_phone: "+880 1700-000000",
        contact_email: "test@vantaire.test",
        contact_hours: "10am-8pm",
        contact_friday_hours: "Closed",
        contact_location: "Dhaka",
        contact_service_area: "Nationwide",
        delivery_inside_dhaka_time: "2 days",
        delivery_outside_dhaka_time: "4 days",
        delivery_fee_inside_dhaka: 70,
        delivery_fee_outside_dhaka: 120,
        delivery_currency_symbol: "৳",
        delivery_currency_code: "BDT",
        delivery_cash_on_delivery: true,
        delivery_advance_payment_note: "COD available",
        delivery_packaging: "Hard case",
      } as any);
    assert(
      !!insertErr && (insertErr.message.includes("chk_site_settings_singleton") || insertErr.code === "23514"),
      "Direct INSERT of second row rejected by singleton check constraint"
    );

    // 3. Attempt to DELETE the singleton row (must fail trigger or restriction)
    const { error: deleteErr } = await adminClient
      .from("site_settings")
      .delete()
      .eq("id", 1);
    assert(
      !!deleteErr && (deleteErr.message.includes("cannot be deleted") || deleteErr.code === "23514"),
      "Direct DELETE of singleton row rejected by trg_guard_site_settings_no_delete"
    );

    // 4. Attempt to mutate the 'id' column (must fail trg_guard_site_settings_immutable)
    const { error: mutateIdErr } = await adminClient
      .from("site_settings")
      .update({ id: 2 } as any)
      .eq("id", 1);
    assert(
      !!mutateIdErr && mutateIdErr.message.includes("Site settings singleton ID cannot be modified"),
      "Mutating site_settings.id rejected by immutability trigger"
    );

    // 5. Attempt to mutate 'created_at' column (must fail trg_guard_site_settings_immutable)
    const { error: mutateCreatedAtErr } = await adminClient
      .from("site_settings")
      .update({ created_at: new Date(Date.now() - 1000000).toISOString() } as any)
      .eq("id", 1);
    assert(
      !!mutateCreatedAtErr && mutateCreatedAtErr.message.includes("Site settings created_at timestamp is immutable"),
      "Mutating site_settings.created_at rejected by immutability trigger"
    );

    // ---------------------------------------------------------------------------
    // [2/5] Domain Integrity & Check Constraints
    // ---------------------------------------------------------------------------
    console.log("\n[2/5] Testing Domain Integrity & Check Constraints...");

    // Test invalid WhatsApp numbers
    const invalidNumbers = [
      { num: "01700000000", desc: "Leading zero without international country code" },
      { num: "+8801700000000", desc: "Leading plus sign (non-digits)" },
      { num: "88017000-0000", desc: "Hyphen in number" },
      { num: "1234567", desc: "Too short (< 8 digits)" },
      { num: "1234567890123456", desc: "Too long (> 15 digits)" },
    ];

    for (const test of invalidNumbers) {
      const { error: numErr } = await adminClient
        .from("site_settings")
        .update({
          whatsapp_number: test.num,
          whatsapp_display_number: test.num,
        } as any)
        .eq("id", 1);
      assert(
        !!numErr && (numErr.message.includes("chk_site_settings_whatsapp_number_format") || numErr.code === "23514"),
        `Invalid WhatsApp number rejected: ${test.desc} (${test.num})`
      );
    }

    // Test Demo Truthfulness constraint
    // whatsapp_is_demo = false with demo number 8801700000000 must fail
    const { error: demoLieErr } = await adminClient
      .from("site_settings")
      .update({
        whatsapp_is_demo: false,
        whatsapp_number: "8801700000000",
        whatsapp_display_number: "+880 1700-000000",
      } as any)
      .eq("id", 1);
    assert(
      !!demoLieErr && (demoLieErr.message.includes("chk_site_settings_demo_truthfulness") || demoLieErr.code === "23514"),
      "False demo flag with demo number 8801700000000 rejected by demo truthfulness constraint"
    );

    // Test currency constraint
    const { error: currCodeErr } = await adminClient
      .from("site_settings")
      .update({ delivery_currency_code: "USD" } as any)
      .eq("id", 1);
    assert(
      !!currCodeErr && (currCodeErr.message.includes("chk_site_settings_currency") || currCodeErr.code === "23514"),
      "Non-BDT currency code rejected by currency check constraint"
    );

    // Test empty contact phone
    const { error: blankPhoneErr } = await adminClient
      .from("site_settings")
      .update({ contact_phone: "   " } as any)
      .eq("id", 1);
    assert(
      !!blankPhoneErr && (blankPhoneErr.message.includes("chk_site_settings_contact_nonblank") || blankPhoneErr.code === "23514"),
      "Blank contact phone rejected by check constraint"
    );

    // Test invalid social URL (not starting with https://)
    const { error: httpSocialErr } = await adminClient
      .from("site_settings")
      .update({ social_instagram: "http://instagram.com/vantaire" } as any)
      .eq("id", 1);
    assert(
      !!httpSocialErr && (httpSocialErr.message.includes("chk_site_settings_social_urls") || httpSocialErr.code === "23514"),
      "Non-HTTPS social URL rejected by social check constraint"
    );

    // Valid update with real number & is_demo = false succeeds
    const { error: validRealErr } = await adminClient
      .from("site_settings")
      .update({
        whatsapp_number: "8801819999999",
        whatsapp_display_number: "+880 1819-999999",
        whatsapp_is_demo: false,
        social_instagram: "https://instagram.com/vantaire_eyewear",
      } as any)
      .eq("id", 1);
    assert(!validRealErr, "Valid live configuration with real number & HTTPS social succeeds");

    // ---------------------------------------------------------------------------
    // [3/5] Zod Schema Validation & Domain Rules
    // ---------------------------------------------------------------------------
    console.log("\n[3/5] Testing Zod Schema Validation...");

    // Test mismatch between display number and digits
    const mismatchRes = siteSettingsSchema.safeParse({
      whatsappNumber: "8801711223344",
      whatsappDisplayNumber: "+880 1700-000000", // Doesn't match last 6 digits 223344
      whatsappIsDemo: false,
      whatsappDefaultGreeting: "Hello",
      contactPhone: "+880 1711-223344",
      contactEmail: "info@vantaire.test",
      contactHours: "10:00 AM - 8:00 PM",
      contactFridayHours: "Closed",
      contactLocation: "Dhaka",
      contactServiceArea: "Nationwide",
      deliveryInsideDhakaTime: "2 days",
      deliveryOutsideDhakaTime: "4 days",
      deliveryFeeInsideDhaka: 70,
      deliveryFeeOutsideDhaka: 120,
      deliveryCashOnDelivery: true,
      deliveryAdvancePaymentNote: "COD available",
      deliveryPackaging: "Hard case",
      socialInstagram: "https://instagram.com/vantaire",
      socialFacebook: "",
      expectedUpdatedAt: new Date().toISOString(),
    });
    assert(!mismatchRes.success, "Zod schema rejects display number that does not end with last 6 digits of WhatsApp number");

    // Test demo truthfulness in Zod
    const zodDemoLieRes = siteSettingsSchema.safeParse({
      whatsappNumber: "8801700000000",
      whatsappDisplayNumber: "+880 1700-000000",
      whatsappIsDemo: false,
      confirmLiveNumber: true,
      whatsappDefaultGreeting: "Hello",
      contactPhone: "+880 1700-000000",
      contactEmail: "info@vantaire.test",
      contactHours: "10:00 AM - 8:00 PM",
      contactFridayHours: "Closed",
      contactLocation: "Dhaka",
      contactServiceArea: "Nationwide",
      deliveryInsideDhakaTime: "2 days",
      deliveryOutsideDhakaTime: "4 days",
      deliveryFeeInsideDhaka: 70,
      deliveryFeeOutsideDhaka: 120,
      deliveryCashOnDelivery: true,
      deliveryAdvancePaymentNote: "COD available",
      deliveryPackaging: "Hard case",
      socialInstagram: "",
      socialFacebook: "",
      expectedUpdatedAt: new Date().toISOString(),
    });
    assert(!zodDemoLieRes.success, "Zod schema rejects marking demo number 8801700000000 as live");

    // ---------------------------------------------------------------------------
    // [4/5] Optimistic Concurrency Control
    // ---------------------------------------------------------------------------
    console.log("\n[4/5] Testing Optimistic Concurrency Control...");

    // Fetch fresh updated_at
    const { data: curRow } = await adminClient
      .from("site_settings")
      .select("updated_at")
      .eq("id", 1)
      .single();

    const staleTimestamp = new Date(Date.parse(curRow!.updated_at) - 60000).toISOString();

    // Stale update simulation (WHERE id = 1 AND updated_at = staleTimestamp)
    const { data: staleUpdate, error: staleErr } = await adminClient
      .from("site_settings")
      .update({ contact_location: "Banani, Dhaka" })
      .eq("id", 1)
      .eq("updated_at", staleTimestamp)
      .select();

    assert(
      !staleErr && (!staleUpdate || staleUpdate.length === 0),
      "Stale expectedUpdatedAt yields 0 updated rows (optimistic concurrency conflict detected)"
    );

    // Matching timestamp update simulation
    const { data: freshUpdate, error: freshErr } = await adminClient
      .from("site_settings")
      .update({ contact_location: "Gulshan, Dhaka" })
      .eq("id", 1)
      .eq("updated_at", curRow!.updated_at)
      .select();

    assert(
      !freshErr && freshUpdate?.length === 1,
      "Matching expectedUpdatedAt successfully updates row"
    );

    // Re-attempting with the previous timestamp now fails
    const { data: reattemptUpdate } = await adminClient
      .from("site_settings")
      .update({ contact_location: "Dhanmondi, Dhaka" })
      .eq("id", 1)
      .eq("updated_at", curRow!.updated_at)
      .select();

    assert(
      !reattemptUpdate || reattemptUpdate.length === 0,
      "Subsequent update with original timestamp correctly rejected as stale"
    );

    // ---------------------------------------------------------------------------
    // [5/5] Storefront Query Integration & WhatsApp Helper Verification
    // ---------------------------------------------------------------------------
    console.log("\n[5/5] Testing Storefront Query Integration & WhatsApp URL Helper...");

    const { data: latestRow } = await adminClient
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const mapped = mapDbSiteSettings(latestRow!);
    assert(mapped.whatsapp.number === latestRow!.whatsapp_number, "mapDbSiteSettings correctly maps singleton row");
    assert(mapped.delivery.currencyCode === "BDT" && mapped.delivery.currencySymbol === "৳", "Currency mapped correctly");

    // Test WhatsApp URL builder greeting resolution
    const generalUrl = buildGeneralWhatsAppUrl(undefined, mapped);
    assert(
      generalUrl.includes(mapped.whatsapp.number) && generalUrl.includes(encodeURIComponent(mapped.whatsapp.defaultGreeting)),
      "buildGeneralWhatsAppUrl incorporates live operational greeting and phone number"
    );

    const customUrl = buildGeneralWhatsAppUrl("Custom message for sunglasses", mapped);
    assert(
      customUrl.includes(encodeURIComponent("Custom message for sunglasses")),
      "buildGeneralWhatsAppUrl respects custom override message when provided"
    );

    // Test revalidateSiteSettingsCaches function
    try {
      revalidateSiteSettingsCaches();
      assert(true, "revalidateSiteSettingsCaches executed without unhandled exception");
    } catch (e: any) {
      assert(false, `revalidateSiteSettingsCaches failed: ${e?.message}`);
    }

  } finally {
    // Restore original pristine singleton row
    console.log("\nRestoring pristine site_settings database state...");
    await adminClient
      .from("site_settings")
      .update({
        whatsapp_number: initialRow.whatsapp_number,
        whatsapp_display_number: initialRow.whatsapp_display_number,
        whatsapp_is_demo: initialRow.whatsapp_is_demo,
        whatsapp_default_greeting: initialRow.whatsapp_default_greeting,
        contact_phone: initialRow.contact_phone,
        contact_email: initialRow.contact_email,
        contact_hours: initialRow.contact_hours,
        contact_friday_hours: initialRow.contact_friday_hours,
        contact_location: initialRow.contact_location,
        contact_service_area: initialRow.contact_service_area,
        delivery_inside_dhaka_time: initialRow.delivery_inside_dhaka_time,
        delivery_outside_dhaka_time: initialRow.delivery_outside_dhaka_time,
        delivery_fee_inside_dhaka: initialRow.delivery_fee_inside_dhaka,
        delivery_fee_outside_dhaka: initialRow.delivery_fee_outside_dhaka,
        delivery_currency_symbol: initialRow.delivery_currency_symbol,
        delivery_currency_code: initialRow.delivery_currency_code,
        delivery_cash_on_delivery: initialRow.delivery_cash_on_delivery,
        delivery_advance_payment_note: initialRow.delivery_advance_payment_note,
        delivery_packaging: initialRow.delivery_packaging,
        social_instagram: initialRow.social_instagram,
        social_facebook: initialRow.social_facebook,
      })
      .eq("id", 1);
    console.log("Pristine state restored.");
  }

  console.log("\n==================================================");
  console.log(`PHASE 11 SETTINGS VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSettingsFunctionalVerification().catch((err) => {
  console.error("FATAL ERROR in Phase 11 Settings verification:", err);
  process.exit(1);
});
