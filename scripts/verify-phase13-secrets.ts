import * as fs from "fs";
import * as path from "path";
import { assertLocalVantaireSupabaseTarget } from "./local-guard";

assertLocalVantaireSupabaseTarget();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: SECRETS & CLIENT BUNDLE AUDIT VERIFIER");
console.log("======================================================================\n");

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

function getAllFiles(dir: string, extList: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extList));
    } else {
      if (extList.some((ext) => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

async function run() {
  const srcDir = path.resolve(process.cwd(), "src");
  const allSrcFiles = getAllFiles(srcDir, [".ts", ".tsx", ".js", ".jsx"]);

  // 1. Client Components Service Role Isolation
  console.log("1. Client Components ('use client') Secret Leak Audit:");
  let clientFilesCount = 0;
  let clientViolations: string[] = [];

  for (const filePath of allSrcFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const isClient = content.includes('"use client"') || content.includes("'use client'");
    if (isClient) {
      clientFilesCount++;
      if (
        content.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        content.includes("service_role") ||
        content.includes("DATABASE_URL") ||
        content.includes("SUPABASE_DB_URL")
      ) {
        clientViolations.push(filePath);
      }
    }
  }

  assert(
    clientViolations.length === 0,
    `No client component references SUPABASE_SERVICE_ROLE_KEY or database URLs (${clientFilesCount} client files audited)`
  );

  // 2. Application Source Hardcoded Secrets Audit (src/)
  console.log("\n2. Application Source Code Secrets Audit (src/):");
  let hardcodedKeyViolations: string[] = [];

  for (const filePath of allSrcFiles) {
    const relative = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, "utf-8");

    // Check hardcoded Supabase JWT pattern
    if (/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(content)) {
      hardcodedKeyViolations.push(`${relative}: hardcoded JWT found`);
    }

    // Check actual service role key usage in application source code
    if (content.includes("process.env.SUPABASE_SERVICE_ROLE_KEY")) {
      hardcodedKeyViolations.push(`${relative}: process.env.SUPABASE_SERVICE_ROLE_KEY accessed in application code`);
    }
  }

  assert(
    hardcodedKeyViolations.length === 0,
    `Application runtime (src/) has 0 references to process.env.SUPABASE_SERVICE_ROLE_KEY and 0 hardcoded JWTs (got: ${hardcodedKeyViolations.join(", ") || "none"})`
  );

  // 3. Phase 13 Privileged Verifier Local-Target Safety Guard Check
  console.log("\n3. Phase 13 Privileged Verifier Local-Target Safety Guard Check:");
  const scriptsDir = path.resolve(process.cwd(), "scripts");
  const phase13VerifierFiles = getAllFiles(scriptsDir, [".ts"]).filter((f) =>
    path.basename(f).startsWith("verify-phase13-")
  );

  let guardedVerifiers = 0;
  let unguardedVerifiers: string[] = [];

  for (const filePath of phase13VerifierFiles) {
    const base = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("assertLocalVantaireSupabaseTarget()")) {
      guardedVerifiers++;
    } else {
      unguardedVerifiers.push(base);
    }
  }

  assert(
    unguardedVerifiers.length === 0,
    `All Phase 13 verification scripts enforce assertLocalVantaireSupabaseTarget() (guarded: ${guardedVerifiers}, unguarded: ${unguardedVerifiers.join(", ") || "none"})`
  );

  console.log("\n======================================================================");
  console.log(`SECRETS & CLIENT BUNDLE AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-secrets:", err);
  process.exit(1);
});
