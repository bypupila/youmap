import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { isEmailIdentifier, normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";

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
    const service = createServiceRoleClient();
    const { data: user, error } = await service
      .from("users")
      .select("email")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
