import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";
import { verifyPassword } from "@/lib/auth-password";
import { setSessionCookie } from "@/lib/auth-session";
import { sql } from "@/lib/neon";

const payloadSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const identifier = String(payload.identifier || "").trim();
    const isEmail = identifier.includes("@");

    const userRows = isEmail
      ? await sql<
          Array<{ id: string; email: string; username: string; display_name: string }>
        >`
          select id, email, username, display_name
          from public.users
          where email = ${normalizeEmail(identifier)}
          limit 1
        `
      : await sql<
          Array<{ id: string; email: string; username: string; display_name: string }>
        >`
          select id, email, username, display_name
          from public.users
          where username = ${normalizeUsername(identifier)}
          limit 1
        `;

    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const credentials = await sql<Array<{ password_hash: string }>>`
      select password_hash
      from public.user_credentials
      where user_id = ${user.id}
      limit 1
    `;
    const storedHash = credentials[0]?.password_hash || "";
    if (!storedHash || !verifyPassword(payload.password, storedHash)) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
      },
    });
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar sesión." },
      { status: 400 }
    );
  }
}
