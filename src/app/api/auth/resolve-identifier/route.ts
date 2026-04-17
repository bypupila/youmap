import { NextResponse } from "next/server";
import { z } from "zod";
import { isEmailIdentifier, normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";
import { sql } from "@/lib/neon";

const payloadSchema = z.object({
  identifier: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const { identifier } = payloadSchema.parse(await request.json());
    const trimmed = identifier.trim();

    if (isEmailIdentifier(trimmed)) {
      return NextResponse.json({ email: normalizeEmail(trimmed) });
    }

    const username = normalizeUsername(trimmed);
    const users = await sql<Array<{ email: string }>>`
      select email
      from public.users
      where username = ${username}
      limit 1
    `;
    const user = users[0] || null;

    if (!user?.email) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ email: normalizeEmail(user.email) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo resolver el usuario" },
      { status: 400 }
    );
  }
}
