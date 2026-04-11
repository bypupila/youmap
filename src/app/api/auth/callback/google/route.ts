import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function createFallbackUsername(email: string) {
  const [local] = String(email || "traveler").split("@");
  const core = slugifyUsername(local) || "traveler";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${core}-${suffix}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/onboarding?error=missing_code", requestUrl.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback/google]", error?.message || "missing session");
    return NextResponse.redirect(new URL("/onboarding?error=auth_failed", requestUrl.origin));
  }

  const user = data.session.user;
  const username = createFallbackUsername(user.email || "traveler");

  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      username,
      display_name: user.user_metadata.full_name || user.user_metadata.name || user.email,
      avatar_url: user.user_metadata.avatar_url || null,
      google_id: user.user_metadata.sub || user.user_metadata.provider_id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
