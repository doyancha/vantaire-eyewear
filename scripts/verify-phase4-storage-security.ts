import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error("❌ Fatal: SUPABASE_SERVICE_ROLE_KEY and ANON_KEY are required.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedAssertions++;
  }
}

// Minimal valid JPEG header + bytes (68 bytes)
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
  0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07,
  0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d, 0x0e, 0x12, 0x10, 0x0d,
  0x0e, 0x11, 0x0e, 0x0b, 0xff, 0xd9,
]);

export async function verifyPhase4StorageSecurity() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 4 STORAGE SECURITY VERIFICATION");
  console.log("==================================================");
  console.log(`Target URL: ${SUPABASE_URL}\n`);

  // 1. PROVISION TEST USERS
  console.log("[1/8] Provisioning test users with authentic Supabase Auth...");
  const runtimeSecret = `SecTest_${crypto.randomBytes(12).toString("hex")}!9A`;

  const testCredentials = {
    owner: {
      email: "owner@vantaire.local",
      password: runtimeSecret,
      role: "owner" as const,
      displayName: "Local Owner",
    },
    admin: {
      email: "admin@vantaire.local",
      password: runtimeSecret,
      role: "admin" as const,
      displayName: "Local Admin",
    },
    outsider: {
      email: "outsider@vantaire.local",
      password: runtimeSecret,
    },
  };

  async function ensureUser(email: string, pass: string): Promise<string> {
    const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existing = listData.users.find((u) => u.email === email);
    if (existing) {
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: pass,
        email_confirm: true,
      });
      return existing.id;
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
    });
    if (createErr || !created.user) throw createErr || new Error("Failed to create user");
    return created.user.id;
  }

  const ownerId = await ensureUser(testCredentials.owner.email, testCredentials.owner.password);
  const adminId = await ensureUser(testCredentials.admin.email, testCredentials.admin.password);
  const outsiderId = await ensureUser(testCredentials.outsider.email, testCredentials.outsider.password);

  await (adminClient.from("admin_profiles") as any).upsert({
    id: ownerId,
    role: "owner",
    display_name: testCredentials.owner.displayName,
  });

  await (adminClient.from("admin_profiles") as any).upsert({
    id: adminId,
    role: "admin",
    display_name: testCredentials.admin.displayName,
  });

  await (adminClient.from("admin_profiles") as any).delete().eq("id", outsiderId);
  console.log("✓ Test users & admin_profiles established.");

  // 2. ACQUIRE REAL SUPABASE AUTH JWTS
  console.log("\n[2/8] Authenticating and acquiring authentic JWTs...");
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ownerAuth, error: ownerErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.owner.email,
    password: testCredentials.owner.password,
  });
  if (ownerErr || !ownerAuth.session) throw new Error(`Owner login failed: ${ownerErr?.message}`);
  const ownerJwt = ownerAuth.session.access_token;

  const { data: adminAuth, error: adminErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.admin.email,
    password: testCredentials.admin.password,
  });
  if (adminErr || !adminAuth.session) throw new Error(`Admin login failed: ${adminErr?.message}`);
  const adminJwt = adminAuth.session.access_token;

  const { data: outsiderAuth, error: outsiderErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.outsider.email,
    password: testCredentials.outsider.password,
  });
  if (outsiderErr || !outsiderAuth.session) throw new Error(`Outsider login failed: ${outsiderErr?.message}`);
  const outsiderJwt = outsiderAuth.session.access_token;

  // Build authenticated clients
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const outsiderClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${outsiderJwt}` } },
  });

  const staffAdminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${adminJwt}` } },
  });

  const staffOwnerClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
  });

  console.log("✓ Clients configured with authentic JWTs.");

  // 3. ANONYMOUS STORAGE WRITE TEST
  console.log("\n[3/8] Testing Anonymous Storage Upload (Must be BLOCKED)...");
  const { error: anonUploadErr } = await anonClient.storage
    .from("product-media")
    .upload("tests/phase4/anon-test.jpg", VALID_JPEG_BUFFER, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(Boolean(anonUploadErr), `ANONYMOUS STORAGE UPLOAD: BLOCKED (error: ${anonUploadErr?.message || "none"})`);

  // 4. OUTSIDER STORAGE WRITE TEST
  console.log("\n[4/8] Testing Outsider Storage Upload (Must be BLOCKED)...");
  const { error: outsiderUploadErr } = await outsiderClient.storage
    .from("product-media")
    .upload("tests/phase4/outsider-test.jpg", VALID_JPEG_BUFFER, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(Boolean(outsiderUploadErr), `OUTSIDER STORAGE UPLOAD: BLOCKED (error: ${outsiderUploadErr?.message || "none"})`);

  // 5. ADMIN STORAGE MANAGEMENT (UPLOAD, REPLACE, DELETE)
  console.log("\n[5/8] Testing Admin Storage Management (Upload, Replace, Delete)...");
  const adminTestPath = "tests/phase4/admin-lifecycle-test.jpg";

  // Admin Upload
  const { error: adminUploadErr } = await staffAdminClient.storage
    .from("product-media")
    .upload(adminTestPath, VALID_JPEG_BUFFER, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(!adminUploadErr, `ADMIN UPLOAD: PASS (uploaded ${adminTestPath})`);

  // Admin Replace (upsert)
  const modifiedBuffer = Buffer.concat([VALID_JPEG_BUFFER, Buffer.from("EXTRA_DATA")]);
  const { error: adminReplaceErr } = await staffAdminClient.storage
    .from("product-media")
    .upload(adminTestPath, modifiedBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(!adminReplaceErr, `ADMIN REPLACE: PASS (replaced ${adminTestPath})`);

  // Admin Delete
  const { error: adminDeleteErr } = await staffAdminClient.storage
    .from("product-media")
    .remove([adminTestPath]);
  assert(!adminDeleteErr, `ADMIN DELETE: PASS (deleted ${adminTestPath})`);

  // 6. OWNER STORAGE MANAGEMENT
  console.log("\n[6/8] Testing Owner Storage Management (Upload, List, Delete)...");
  const ownerTestPath = "tests/phase4/owner-lifecycle-test.jpg";

  const { error: ownerUploadErr } = await staffOwnerClient.storage
    .from("product-media")
    .upload(ownerTestPath, VALID_JPEG_BUFFER, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(!ownerUploadErr, `OWNER STORAGE UPLOAD: PASS (uploaded ${ownerTestPath})`);

  const { data: ownerList, error: ownerListErr } = await staffOwnerClient.storage
    .from("product-media")
    .list("tests/phase4");
  assert(!ownerListErr && (ownerList?.length ?? 0) > 0, `OWNER STORAGE LIST: PASS (listed objects in tests/phase4/)`);

  const { error: ownerDeleteErr } = await staffOwnerClient.storage
    .from("product-media")
    .remove([ownerTestPath]);
  assert(!ownerDeleteErr, `OWNER STORAGE DELETE: PASS (deleted ${ownerTestPath})`);

  // 7. INVALID MIME TYPE TEST
  console.log("\n[7/8] Testing Invalid MIME Type Upload (Must be BLOCKED)...");
  const textBuffer = Buffer.from("Hello VANTAIRE! This is plain text.");
  const { error: invalidMimeErr } = await staffAdminClient.storage
    .from("product-media")
    .upload("tests/phase4/test-malicious.txt", textBuffer, {
      contentType: "text/plain",
      upsert: true,
    });
  assert(Boolean(invalidMimeErr), `INVALID MIME UPLOAD: BLOCKED (error: ${invalidMimeErr?.message || "none"})`);

  // 8. OVERSIZED FILE TEST (> 5MB)
  console.log("\n[8/8] Testing Oversized File Upload (>5MB, Must be BLOCKED)...");
  // 5.5 MB dummy buffer
  const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0xaa);
  const { error: oversizedErr } = await staffAdminClient.storage
    .from("product-media")
    .upload("tests/phase4/oversized.jpg", oversizedBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  assert(Boolean(oversizedErr), `OVERSIZED UPLOAD: BLOCKED (error: ${oversizedErr?.message || "none"})`);

  // CLEANUP: Clean any residual objects in tests/phase4/
  console.log("\n[Cleanup] Cleaning any residual test objects in tests/phase4/...");
  const { data: remainingTests } = await adminClient.storage
    .from("product-media")
    .list("tests/phase4");
  if (remainingTests && remainingTests.length > 0) {
    const pathsToRemove = remainingTests.map((o) => `tests/phase4/${o.name}`);
    await adminClient.storage.from("product-media").remove(pathsToRemove);
    console.log(`  Cleaned ${pathsToRemove.length} residual test objects.`);
  } else {
    console.log("  No residual test objects found.");
  }

  console.log("\n==================================================");
  console.log("STORAGE SECURITY TEST SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passedAssertions}`);
  console.log(`Assertions Failed: ${failedAssertions}`);

  if (failedAssertions > 0) {
    throw new Error(`Storage security verification failed with ${failedAssertions} failures.`);
  }

  console.log("\n🎉 ALL STORAGE SECURITY CHECKS PASSED!");
}

if (require.main === module) {
  verifyPhase4StorageSecurity().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
