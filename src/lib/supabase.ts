import { readRequiredEnv, readRequiredHttpUrl, sanitizeEnvValue } from "@/lib/env";

export function getSupabaseUrl() {
  return readRequiredHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey() {
  return readRequiredEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export function getSupabaseServiceRoleKey() {
  return readRequiredEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",
    "SUPABASE_SERVICE_ROLE_KEY"
  );
}

export function getPublicAppUrl() {
  return sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}
