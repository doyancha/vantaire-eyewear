import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.3 — DRIFT REPAIR TEST");
console.log("==================================================");

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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}

const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runDriftTest() {
  const targetSlug = "noir-sovereign-aviator";

  // Step 1: Deliberately introduce data drift
  console.log(`\n[STEP 1] Introducing intentional drift to product: ${targetSlug}`);
  const { error: driftErr } = await adminClient
    .from("products")
    .update({ price: 3999, name: "Drifted Noir Sovereign" })
    .eq("slug", targetSlug);

  if (driftErr) {
    console.error("Failed to introduce drift:", driftErr);
    process.exit(1);
  }

  const { data: driftedProd } = await adminClient
    .from("products")
    .select("name, price")
    .eq("slug", targetSlug)
    .single();

  console.log(`  ✓ Drift introduced: name="${driftedProd?.name}", price=${driftedProd?.price}`);

  // Step 2: Reseed using psql into docker container
  console.log(`\n[STEP 2] Reseeding database with seed.sql to repair drift...`);
  const seedSqlPath = path.resolve(process.cwd(), "supabase", "seed.sql");
  const seedSql = fs.readFileSync(seedSqlPath, "utf-8");

  // Run psql via docker exec
  execSync("docker exec -i supabase_db_vantaire-eyewear psql -U postgres -d postgres", {
    input: seedSql,
    stdio: ["pipe", "inherit", "inherit"],
  });

  // Step 3: Verify repaired values
  console.log(`\n[STEP 3] Verifying product values restored to canonical baseline`);
  const { data: restoredProd } = await adminClient
    .from("products")
    .select("name, price")
    .eq("slug", targetSlug)
    .single();

  console.log(`  Restored state: name="${restoredProd?.name}", price=${restoredProd?.price}`);
  if (restoredProd?.name === "Noir Sovereign Aviator" && restoredProd?.price === 3450) {
    console.log("  ✓ Drift successfully and accurately repaired!");
  } else {
    console.error("  ❌ Drift repair failed!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("DRIFT REPAIR TEST PASSED");
  console.log("==================================================");
}

runDriftTest().catch((err) => {
  console.error("Drift test error:", err);
  process.exit(1);
});
