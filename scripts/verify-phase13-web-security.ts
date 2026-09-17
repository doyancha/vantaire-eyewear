import * as fs from "fs";
import * as path from "path";
import { serializeJsonLd } from "../src/lib/security/jsonld";
import nextConfig from "../next.config";
import { assertLocalVantaireSupabaseTarget } from "./local-guard";

assertLocalVantaireSupabaseTarget();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: WEB & APPLICATION SECURITY AUDIT VERIFIER");
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

async function run() {
  // 1. JSON-LD Serialization & Script Breakout Escaping
  console.log("1. JSON-LD XSS / Script Breakout Verification:");
  const testPayload = {
    name: "</script><script>alert('xss')</script>",
    description: "Line\u2028Break and Paragraph\u2029Break <!-- HTML Comment -->",
    tagline: '"><img src=x onerror=alert(1)>',
    url: "https://vantaire.local/?a=1&b=2",
  };

  const serialized = serializeJsonLd(testPayload);

  assert(
    !serialized.includes("<script>") && !serialized.includes("</script>"),
    "Tags (<script>, </script>) are escaped to unicode (\\u003c, \\u003e)"
  );
  assert(
    !serialized.includes("<img") && !serialized.includes("<!--"),
    "HTML elements and comments are escaped to unicode (\\u003c)"
  );
  assert(
    !serialized.includes("\u2028") && !serialized.includes("\u2029"),
    "JavaScript line terminators (U+2028, U+2029) are escaped"
  );
  assert(
    !serialized.includes("&") || serialized.includes("\\u0026"),
    "Ampersands are escaped to \\u0026"
  );

  // Check that valid JSON roundtrips after parse
  const parsed = JSON.parse(serialized);
  assert(
    parsed.name === testPayload.name &&
      parsed.description === testPayload.description &&
      parsed.tagline === testPayload.tagline,
    "Serialized JSON-LD unescapes faithfully via JSON.parse()"
  );

  // Verify Product Page uses serializeJsonLd
  const productPageSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/products/[slug]/page.tsx"),
    "utf-8"
  );
  assert(
    productPageSrc.includes("serializeJsonLd(jsonLd)"),
    "Product detail page uses serializeJsonLd() for JSON-LD application/ld+json injection"
  );

  // 2. HTTP Security Headers in next.config.ts
  console.log("\n2. HTTP Security Headers Verification:");
  assert(typeof nextConfig.headers === "function", "nextConfig.headers function is configured");

  if (typeof nextConfig.headers === "function") {
    const headerRules = await nextConfig.headers();
    const globalRule = headerRules.find((r: any) => r.source === "/:path*");
    assert(globalRule !== undefined, "Global header rule (/:path*) is defined");

    if (globalRule) {
      const headersMap = new Map(globalRule.headers.map((h: any) => [h.key, h.value]));

      const csp = headersMap.get("Content-Security-Policy") || "";
      assert(csp.includes("default-src 'self'"), "CSP includes default-src 'self'");
      assert(csp.includes("frame-ancestors 'none'"), "CSP includes frame-ancestors 'none'");
      assert(csp.includes("base-uri 'self'"), "CSP includes base-uri 'self'");
      assert(
        headersMap.get("X-Content-Type-Options") === "nosniff",
        "X-Content-Type-Options is set to 'nosniff'"
      );
      assert(
        headersMap.get("X-Frame-Options") === "DENY",
        "X-Frame-Options is set to 'DENY'"
      );
      assert(
        headersMap.get("Referrer-Policy") === "strict-origin-when-cross-origin",
        "Referrer-Policy is set to 'strict-origin-when-cross-origin'"
      );
      assert(
        headersMap.get("Cross-Origin-Opener-Policy") === "same-origin",
        "Cross-Origin-Opener-Policy is set to 'same-origin'"
      );
      assert(
        headersMap.has("Permissions-Policy"),
        "Permissions-Policy header is configured"
      );
    }

    const adminRule = headerRules.find((r: any) => r.source === "/admin/:path*");
    assert(adminRule !== undefined, "Admin header rule (/admin/:path*) is defined");
    if (adminRule) {
      const adminRobots = adminRule.headers.find((h: any) => h.key === "X-Robots-Tag");
      assert(
        adminRobots?.value === "noindex, nofollow, noarchive",
        "Admin routes set X-Robots-Tag to 'noindex, nofollow, noarchive'"
      );
    }
  }

  // 3. Login Action Input Bounds & Uniform Errors
  console.log("\n3. Login Action Uniform Errors & Input Bounds:");
  const loginActionSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/admin/login/actions.ts"),
    "utf-8"
  );
  assert(
    loginActionSrc.includes("email.length > 254"),
    "Email length boundary <= 254 enforced"
  );
  assert(
    loginActionSrc.includes("password.length > 1024"),
    "Password length boundary <= 1024 enforced"
  );
  assert(
    loginActionSrc.includes('error: "Invalid credentials or unauthorized account."'),
    "Login returns uniform generic error message preventing user enumeration"
  );

  // 4. Open Redirect & Middleware Verification
  console.log("\n4. Middleware Route Protection & Redirect Verification:");
  const middlewareSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/middleware.ts"),
    "utf-8"
  );
  assert(
    middlewareSrc.includes("updateSession"),
    "Middleware delegates to Supabase session updater"
  );

  const supabaseMiddlewareSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/supabase/middleware.ts"),
    "utf-8"
  );
  assert(
    supabaseMiddlewareSrc.includes('/admin/login'),
    "Middleware redirects unauthenticated /admin access to relative /admin/login"
  );
  assert(
    !supabaseMiddlewareSrc.includes("redirect(request.nextUrl.searchParams.get"),
    "Middleware does not redirect to unvalidated open redirect query parameters"
  );

  console.log("\n======================================================================");
  console.log(`WEB & APPLICATION SECURITY COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-web-security:", err);
  process.exit(1);
});
