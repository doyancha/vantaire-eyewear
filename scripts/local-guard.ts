import * as fs from "fs";
import * as path from "path";

export function loadEnvLocal(): void {
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

export function assertLocalVantaireSupabaseTarget(): void {
  loadEnvLocal();

  const supabaseUrlStr = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
  let supabaseUrl: URL;
  try {
    supabaseUrl = new URL(supabaseUrlStr);
  } catch {
    throw new Error(`[local-guard] Invalid NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrlStr}"`);
  }

  const host = supabaseUrl.hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(
      `[local-guard] Target host must be local (127.0.0.1 or localhost), got: ${host}`
    );
  }

  const port = supabaseUrl.port;
  if (port === "54321") {
    throw new Error(
      `[local-guard] FATAL: Port 54321 detected! This belongs to OmniReply. VANTAIRE must use port 55321.`
    );
  }
  if (port !== "55321") {
    throw new Error(
      `[local-guard] Expected VANTAIRE Supabase HTTP port 55321, got: ${port}`
    );
  }

  const dbUrlStr = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (dbUrlStr) {
    let dbUrl: URL;
    try {
      dbUrl = new URL(dbUrlStr);
    } catch {
      throw new Error(`[local-guard] Invalid DB URL: "${dbUrlStr}"`);
    }

    const dbHost = dbUrl.hostname;
    if (dbHost !== "127.0.0.1" && dbHost !== "localhost") {
      throw new Error(
        `[local-guard] Target DB host must be local (127.0.0.1 or localhost), got: ${dbHost}`
      );
    }

    const dbPort = dbUrl.port;
    if (dbPort === "54322") {
      throw new Error(
        `[local-guard] FATAL: DB port 54322 detected! This belongs to OmniReply. VANTAIRE must use port 55322.`
      );
    }
    if (dbPort && dbPort !== "55322") {
      throw new Error(
        `[local-guard] Expected VANTAIRE Supabase DB port 55322, got: ${dbPort}`
      );
    }
  }
}
