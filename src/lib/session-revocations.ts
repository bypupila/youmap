import { sql } from "@/lib/neon";

let ensureSessionRevocationsTablePromise: Promise<void> | null = null;

export function ensureSessionRevocationsTable() {
  if (!ensureSessionRevocationsTablePromise) {
    ensureSessionRevocationsTablePromise = (async () => {
      await sql`
        create table if not exists public.user_session_revocations (
          user_id uuid primary key,
          revoked_after timestamptz not null,
          reason text not null,
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists user_session_revocations_revoked_after_idx
        on public.user_session_revocations (revoked_after)
      `;
    })();
  }

  return ensureSessionRevocationsTablePromise;
}

export async function revokeUserSessions(userId: string, reason: string) {
  await ensureSessionRevocationsTable();
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
  await ensureSessionRevocationsTable();

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
