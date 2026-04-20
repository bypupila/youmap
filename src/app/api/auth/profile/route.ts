import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserIdFromRequest } from "@/lib/current-user";
import { hashPassword } from "@/lib/auth-password";
import { isValidUsername, normalizeUsername, toPublicMapPath } from "@/lib/auth-identifiers";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payloadSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(8).max(128).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = payloadSchema.parse(await request.json());
    const displayName = payload.displayName.trim();
    const username = normalizeUsername(payload.username);

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "El usuario tiene un formato inválido." }, { status: 400 });
    }

    const existingRows = await sql<Array<{ id: string; email: string; username: string }>>`
      select id, email, username
      from public.users
      where username = ${username}
      limit 1
    `;
    const existing = existingRows[0] || null;
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const password = String(payload.password || "").trim();
    if (!password) {
      return NextResponse.json({ error: "La contraseña es obligatoria para completar el perfil." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    await sql`
      update public.users
      set
        username = ${username},
        display_name = ${displayName},
        updated_at = ${nowIso}
      where id = ${userId}
    `;

    const passwordHash = hashPassword(password);
    await sql`
      insert into public.user_credentials (user_id, password_hash, updated_at)
      values (${userId}, ${passwordHash}, ${nowIso})
      on conflict (user_id)
      do update set
        password_hash = excluded.password_hash,
        updated_at = excluded.updated_at
    `;

    await sql`
      update public.onboarding_state
      set
        current_step = 'world',
        completed_steps = array['welcome', 'youtube', 'profile']::text[],
        is_complete = true,
        last_seen_at = ${nowIso},
        updated_at = ${nowIso}
      where user_id = ${userId}
    `;

    const channelRows = await sql<Array<{ id: string }>>`
      select id
      from public.channels
      where user_id = ${userId}
      limit 1
    `;
    const channelId = channelRows[0]?.id || null;

    return NextResponse.json({
      ok: true,
      user_id: userId,
      username,
      display_name: displayName,
      public_map_path: toPublicMapPath(username),
      channel_id: channelId,
    });
  } catch (error) {
    console.error("[api/auth/profile]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not update profile",
      },
      { status: 400 }
    );
  }
}
