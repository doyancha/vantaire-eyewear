/**
 * Phase 12 Verification Script: Cache Wrapper & Exception Guard Unit Tests
 * -----------------------------------------------------------------------------
 * Tests the canonical cache wrapper (createCachedStorefrontFunction) and
 * context-missing detector (isNextCacheContextMissing).
 * 
 * Verifies that:
 * 1. Broad generic "Invariant" errors are NOT suppressed.
 * 2. Database and programming invariants are truthfully re-thrown.
 * 3. Only authentic Next.js cache context missing errors fall back to raw fn.
 * 4. Negative cache recovery: failures are never cached; subsequent requests recover.
 */

import {
  isNextCacheContextMissing,
  createCachedStorefrontFunction,
  CACHE_TAGS,
} from "../src/lib/data/cache";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function run() {
  console.log("\n=======================================================");
  console.log("  PHASE 12: CACHE WRAPPER & EXCEPTION GUARD VERIFICATION");
  console.log("=======================================================\n");

  // 1. Context detection tests
  console.log("1. TESTING isNextCacheContextMissing SPECIFICITY");
  assert(
    isNextCacheContextMissing(new Error("Invariant: incrementalCache missing in app route")),
    "Identifies 'incrementalCache missing' error"
  );
  assert(
    isNextCacheContextMissing({ message: "incrementalCache missing" }),
    "Identifies plain object with message 'incrementalCache missing'"
  );
  assert(
    !isNextCacheContextMissing(new Error("Invariant: product record not found")),
    "Does NOT catch generic Invariant 'product record not found'"
  );
  assert(
    !isNextCacheContextMissing(new Error("Invariant: price must be a positive integer")),
    "Does NOT catch application invariant 'price must be positive integer'"
  );
  assert(
    !isNextCacheContextMissing(new Error("Database connection refused: 55322")),
    "Does NOT catch database errors"
  );
  assert(
    !isNextCacheContextMissing(null),
    "Safely returns false for null"
  );
  assert(
    !isNextCacheContextMissing(undefined),
    "Safely returns false for undefined"
  );

  // 2. Canonical wrapper fallback in test environment
  console.log("\n2. TESTING createCachedStorefrontFunction ISOMORPHIC FALLBACK");
  let executionCount = 0;
  const mockFetcher = async (multiplier: number) => {
    executionCount++;
    return 42 * multiplier;
  };

  const cachedFetcher = createCachedStorefrontFunction(
    mockFetcher,
    ["test-part"],
    { tags: [CACHE_TAGS.products] }
  );

  const result1 = await cachedFetcher(2);
  assert(result1 === 84, "Returns expected value (84) via fallback execution");
  assert(executionCount === 1, "Executed underlying fetcher once");

  // 3. Truthful re-throwing of database and invariant errors
  console.log("\n3. TESTING ERROR RE-THROW INTEGRITY (NO SUPPRESSION)");
  const failingDbFetcher = async () => {
    throw new Error("PostgreSQL connection timeout on port 55322");
  };

  const cachedDbFetcher = createCachedStorefrontFunction(
    failingDbFetcher,
    ["test-failing-db"],
    { tags: [CACHE_TAGS.products] }
  );

  let dbErrorCaught = false;
  try {
    await cachedDbFetcher();
  } catch (err: any) {
    dbErrorCaught = true;
    assert(
      err.message === "PostgreSQL connection timeout on port 55322",
      "Database error re-thrown with original message intact"
    );
  }
  assert(dbErrorCaught, "Database error was NOT swallowed by cache wrapper");

  const invariantFetcher = async () => {
    throw new Error("Invariant: active collection cannot have empty title");
  };

  const cachedInvariantFetcher = createCachedStorefrontFunction(
    invariantFetcher,
    ["test-failing-invariant"],
    { tags: [CACHE_TAGS.collections] }
  );

  let invariantErrorCaught = false;
  try {
    await cachedInvariantFetcher();
  } catch (err: any) {
    invariantErrorCaught = true;
    assert(
      err.message === "Invariant: active collection cannot have empty title",
      "Invariant error re-thrown with original message intact"
    );
  }
  assert(invariantErrorCaught, "Application invariant was NOT swallowed by cache wrapper");

  // 4. Negative Cache Recovery
  console.log("\n4. TESTING NEGATIVE CACHE RECOVERY");
  let attempt = 0;
  const flakeyService = async () => {
    attempt++;
    if (attempt === 1) {
      throw new Error("Transient network disruption");
    }
    return { status: "recovered", data: [1, 2, 3] };
  };

  const cachedFlakeyService = createCachedStorefrontFunction(
    flakeyService,
    ["test-flakey"],
    { tags: [CACHE_TAGS.siteSettings] }
  );

  let attempt1Failed = false;
  try {
    await cachedFlakeyService();
  } catch (err: any) {
    attempt1Failed = true;
    assert(err.message === "Transient network disruption", "Call 1 failed as expected");
  }
  assert(attempt1Failed, "Call 1 error was properly thrown");

  // Call 2 should recover immediately (negative cache recovery)
  const recoveredResult = await cachedFlakeyService();
  assert(recoveredResult.status === "recovered", "Call 2 recovered and returned fresh data");
  assert(recoveredResult.data.length === 3, "Returned fresh data array");

  console.log("\n=======================================================");
  console.log("  ALL PHASE 12 CACHE WRAPPER UNIT TESTS PASSED");
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("FATAL ERROR in cache wrapper test:", err);
  process.exit(1);
});
