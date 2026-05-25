import { NextResponse } from "next/server";
import { z } from "zod";
import { isEmailIdentifier, normalizeEmail, normalizeUsername } from "@/lib/auth-identifiers";

const payloadSchema = z.object({
  identifier: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const { identifier } = payloadSchema.parse(await request.json());
    const trimmed = identifier.trim();
    const normalizedIdentifier = isEmailIdentifier(trimmed) ? normalizeEmail(trimmed) : normalizeUsername(trimmed);
    return NextResponse.json({
      ok: true,
      normalized_identifier: normalizedIdentifier,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo resolver el usuario" },
      { status: 400 }
    );
  }
}
