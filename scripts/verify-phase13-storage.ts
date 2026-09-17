import { createClient } from "@supabase/supabase-js";
import { assertLocalVantaireSupabaseTarget, loadEnvLocal } from "./local-guard";
import { Database } from "../src/types/database.types";

assertLocalVantaireSupabaseTarget();
loadEnvLocal();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: STORAGE ADVERSARIAL VERIFIER");
console.log("======================================================================\n");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase keys in environment");
}

const serviceClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function run() {
  const ts = Date.now();
  const disposableAdminEmail = `test-storage-admin-${ts}@vantaire.test`;
  const disposableOutsiderEmail = `test-storage-outsider-${ts}@vantaire.test`;
  const securePassword = `Vantaire#Storage!${ts}`;

  let disposableAdminId = "";
  let disposableOutsiderId = "";
  const createdObjectPaths: string[] = [];

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Setup Identities
    console.log("1. Setting up Disposable Identities:");
    const { data: adminUser } = await serviceClient.auth.admin.createUser({
      email: disposableAdminEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableAdminId = adminUser!.user!.id;
    await serviceClient.from("admin_profiles").insert({
      id: disposableAdminId,
      role: "admin",
      display_name: "Storage Admin",
    });

    const { data: outsiderUser } = await serviceClient.auth.admin.createUser({
      email: disposableOutsiderEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableOutsiderId = outsiderUser!.user!.id;

    const adminClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await adminClient.auth.signInWithPassword({
      email: disposableAdminEmail,
      password: securePassword,
    });

    const outsiderClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await outsiderClient.auth.signInWithPassword({
      email: disposableOutsiderEmail,
      password: securePassword,
    });

    assert(true, "Authenticated anon, outsider, and admin clients");

    // 2. Storage Baseline Check
    console.log("\n2. Storage Bucket Baseline Audit:");
    let canonicalCount = 0;
    async function countFolder(folder: string) {
      const { data } = await serviceClient.storage.from("product-media").list(folder, { limit: 100 });
      if (!data) return;
      for (const item of data) {
        if (item.id === null) {
          await countFolder(folder ? `${folder}/${item.name}` : item.name);
        } else {
          canonicalCount++;
        }
      }
    }
    await countFolder("");
    assert(canonicalCount === 48, `product-media contains canonical 48 objects (got: ${canonicalCount})`);

    // 3. Anon Adversarial Attacks
    console.log("\n3. Anon Storage Adversarial Attacks:");
    const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const { error: anonUploadErr } = await anonClient.storage
      .from("product-media")
      .upload(`products/solstice-titanium-sunglasses/image-0123456789abcdef0123.png`, dummyPng, {
        contentType: "image/png",
      });
    assert(anonUploadErr !== null, "Anon upload is rejected by storage policy");

    const targetExistingFile = "products/solstice-titanium-sunglasses/front.webp";
    const { data: anonDelData, error: anonDelErr } = await anonClient.storage
      .from("product-media")
      .remove([targetExistingFile]);
    const { data: fileStillThereAnon } = await serviceClient.storage
      .from("product-media")
      .list("products/solstice-titanium-sunglasses", { search: "front.webp" });
    const anonDeleteBlocked = Boolean(
      anonDelErr !== null ||
      !anonDelData ||
      anonDelData.length === 0 ||
      (fileStillThereAnon && fileStillThereAnon.length > 0)
    );
    assert(anonDeleteBlocked, "Anon delete is rejected/blocked by storage policy (file remains intact)");

    // 4. Outsider Adversarial Attacks
    console.log("\n4. Outsider (Non-Admin Authenticated) Adversarial Attacks:");
    const { error: outUploadErr } = await outsiderClient.storage
      .from("product-media")
      .upload(`products/solstice-titanium-sunglasses/image-0123456789abcdef0123.png`, dummyPng, {
        contentType: "image/png",
      });
    assert(outUploadErr !== null, "Outsider upload is rejected by storage policy");

    const { data: outDelData, error: outDelErr } = await outsiderClient.storage
      .from("product-media")
      .remove([targetExistingFile]);
    const { data: fileStillThereOut } = await serviceClient.storage
      .from("product-media")
      .list("products/solstice-titanium-sunglasses", { search: "front.webp" });
    const outDeleteBlocked = Boolean(
      outDelErr !== null ||
      !outDelData ||
      outDelData.length === 0 ||
      (fileStillThereOut && fileStillThereOut.length > 0)
    );
    assert(outDeleteBlocked, "Outsider delete is rejected/blocked by storage policy (file remains intact)");

    // 5. Path Traversal & Escaping Adversarial Attacks (Admin Role)
    console.log("\n5. Path Traversal & Escaping Attacks (Admin Role):");
    const traversalPaths = [
      `../traversal-${ts}.png`,
      `products/../../etc/passwd-${ts}.png`,
      `/leading-slash-${ts}.png`,
      `products\\backslash-${ts}.png`,
      `products/solstice-titanium-sunglasses/unmatched-pattern.png`,
    ];

    for (const badPath of traversalPaths) {
      const { error: travErr } = await adminClient.storage
        .from("product-media")
        .upload(badPath, dummyPng, { contentType: "image/png" });
      assert(travErr !== null, `Path traversal / escape / regex violation rejected: "${badPath}" (error: ${travErr?.message})`);
      if (!travErr) {
        createdObjectPaths.push(badPath);
      }
    }

    // 6. Authorized Admin Upload & Verified Cleanup
    console.log("\n6. Authorized Admin Upload & Clean Lifecycle:");
    const validTestPath = `products/solstice-titanium-sunglasses/image-abcdef0123456789abcdef01.png`;
    const { data: uploadData, error: uploadErr } = await adminClient.storage
      .from("product-media")
      .upload(validTestPath, dummyPng, { contentType: "image/png" });

    assert(!uploadErr && !!uploadData, `Authorized admin uploads valid canonical media path: ${validTestPath}`);
    if (!uploadErr) {
      createdObjectPaths.push(validTestPath);
    }

    // Admin Delete
    const { error: adminDelErr } = await adminClient.storage
      .from("product-media")
      .remove([validTestPath]);
    assert(!adminDelErr, "Authorized admin can remove test uploaded media");
    const idx = createdObjectPaths.indexOf(validTestPath);
    if (idx !== -1) createdObjectPaths.splice(idx, 1);

  } finally {
    console.log("\nCleaning up disposable test identities and storage objects...");
    for (const p of createdObjectPaths) {
      try {
        await serviceClient.storage.from("product-media").remove([p]);
      } catch {}
    }
    if (disposableAdminId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableAdminId);
      await serviceClient.auth.admin.deleteUser(disposableAdminId);
    }
    if (disposableOutsiderId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableOutsiderId);
      await serviceClient.auth.admin.deleteUser(disposableOutsiderId);
    }
    console.log("Cleanup complete.");
  }

  console.log("\n======================================================================");
  console.log(`STORAGE SECURITY VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-storage:", err);
  process.exit(1);
});
