import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { assertLocalVantaireSupabaseTarget } from "./local-guard";

assertLocalVantaireSupabaseTarget();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: DEPENDENCY & FRAMEWORK AUDIT VERIFIER");
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

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

// 1. Next.js LTS Version Check
console.log("1. Next.js Framework Version Check:");
const nextVersion = pkg.dependencies?.next;
assert(
  nextVersion === "15.5.25",
  `Next.js is pinned to official Maintenance LTS 15.5.25 (got: ${nextVersion})`
);

const eslintNext = pkg.devDependencies?.["@next/eslint-plugin-next"];
const eslintConfigNext = pkg.devDependencies?.["eslint-config-next"];
assert(
  eslintNext === "15.5.25" && eslintConfigNext === "15.5.25",
  `Next.js ESLint tooling pinned to 15.5.25 (got: plugin=${eslintNext}, config=${eslintConfigNext})`
);

// 2. React Version Check
console.log("\n2. React RSC Engine Version Check:");
const reactVersion = pkg.dependencies?.react;
const reactDomVersion = pkg.dependencies?.["react-dom"];
const installedReact = require("react/package.json").version;
const installedReactDom = require("react-dom/package.json").version;
assert(
  reactVersion === "19.2.8" && installedReact === "19.2.8",
  `React pinned to 19.2.8 (pkg: ${reactVersion}, installed: ${installedReact})`
);
assert(
  reactDomVersion === "19.2.8" && installedReactDom === "19.2.8",
  `React DOM pinned to 19.2.8 (pkg: ${reactDomVersion}, installed: ${installedReactDom})`
);

// 3. PostCSS Security Check
console.log("\n3. PostCSS Security Check:");
const installedPostcss = require("postcss/package.json").version;
assert(
  installedPostcss === "8.5.28",
  `PostCSS deduplicated to 8.5.28 (installed: ${installedPostcss})`
);

// 4. npm audit checks
console.log("\n4. Vulnerability Audit (npm audit):");
try {
  const auditProdOutput = execSync("npm audit --omit=dev --json", {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const auditProd = JSON.parse(auditProdOutput);
  const prodVulns = auditProd.metadata?.vulnerabilities || {};
  const totalProdVulns = (prodVulns.info || 0) + (prodVulns.low || 0) + (prodVulns.moderate || 0) + (prodVulns.high || 0) + (prodVulns.critical || 0);
  assert(
    totalProdVulns === 0,
    `Production dependencies (npm audit --omit=dev): 0 vulnerabilities (got: ${JSON.stringify(prodVulns)})`
  );
} catch (err: any) {
  // npm audit exits with 1 if vulnerabilities found
  if (err.stdout) {
    try {
      const auditProd = JSON.parse(err.stdout);
      const prodVulns = auditProd.metadata?.vulnerabilities || {};
      assert(false, `Production vulnerabilities found: ${JSON.stringify(prodVulns)}`);
    } catch {
      assert(false, `Failed running npm audit --omit=dev: ${err.message}`);
    }
  } else {
    assert(false, `Failed running npm audit --omit=dev: ${err.message}`);
  }
}

try {
  const auditFullOutput = execSync("npm audit --json", {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const auditFull = JSON.parse(auditFullOutput);
  const fullVulns = auditFull.metadata?.vulnerabilities || {};
  const totalFullVulns = (fullVulns.info || 0) + (fullVulns.low || 0) + (fullVulns.moderate || 0) + (fullVulns.high || 0) + (fullVulns.critical || 0);
  assert(
    totalFullVulns === 0,
    `Full dependencies (npm audit): 0 vulnerabilities (got: ${JSON.stringify(fullVulns)})`
  );
} catch (err: any) {
  if (err.stdout) {
    try {
      const auditFull = JSON.parse(err.stdout);
      const fullVulns = auditFull.metadata?.vulnerabilities || {};
      assert(false, `Full dependencies vulnerabilities found: ${JSON.stringify(fullVulns)}`);
    } catch {
      assert(false, `Failed running npm audit: ${err.message}`);
    }
  } else {
    assert(false, `Failed running npm audit: ${err.message}`);
  }
}

console.log("\n======================================================================");
console.log(`DEPENDENCY SECURITY AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
