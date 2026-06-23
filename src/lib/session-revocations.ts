import { sql } from "@/lib/neon";
import { tableExists } from "@/lib/db-schema";

export async function revokeUserSessions(userId: string, reason: string) {
  if (!(await tableExists("public", "user_session_revocations"))) {
    return new Date().toISOString();
  }
  const revokedAfter = new Date().toISOString();

  await sql`
    insert into public.user_session_revocations (user_id, revoked_after, reason, updated_at)
    values (${userId}, ${revokedAfter}, ${reason}, ${revokedAfter})
    on conflict (user_id)
    do update set
      revoked_after = excluded.revoked_after,
      reason = excluded.reason,
      updated_at = excluded.updated_at
  `;

  return revokedAfter;
}

export async function isSessionRevoked(userId: string, issuedAtSeconds: number) {
  if (!userId || !issuedAtSeconds) return true;
  if (!(await tableExists("public", "user_session_revocations"))) {
    return false;
  }

  const rows = await sql<Array<{ revoked_after: string }>>`
    select revoked_after
    from public.user_session_revocations
    where user_id = ${userId}
    limit 1
  `;

  const revokedAfter = rows[0]?.revoked_after;
  if (!revokedAfter) return false;

  const issuedAtMs = issuedAtSeconds * 1000;
  return issuedAtMs <= new Date(revokedAfter).getTime();
}
