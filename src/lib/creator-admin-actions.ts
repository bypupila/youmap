import { getChannelAccessForUser } from "@/lib/current-user";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export type CreatorAdminEntityType = "video" | "sponsor" | "votacion" | "sync" | "bulk";
export type CreatorAdminActivitySeverity = "info" | "warning" | "error";

export async function requireCreatorChannelAccess(channelId: string, userId: string) {
  const access = await getChannelAccessForUser(channelId, userId);
  if (!access.canManage) return null;
  return access;
}

export async function recordCreatorActivity({
  channelId,
  actorUserId,
  eventType,
  entityType,
  entityId,
  description,
  severity = "info",
  metadata = {},
}: {
  channelId: string;
  actorUserId: string | null;
  eventType: string;
  entityType: CreatorAdminEntityType;
  entityId?: string | null;
  description: string;
  severity?: CreatorAdminActivitySeverity;
  metadata?: Record<string, unknown>;
}) {
  const hasCreatorActivityLog = await tableExists("public", "creator_activity_log");
  if (!hasCreatorActivityLog) return;

  await sql`
    insert into public.creator_activity_log (
      channel_id,
      actor_user_id,
      event_type,
      entity_type,
      entity_id,
      description,
      severity,
      metadata
    )
    values (
      ${channelId},
      ${actorUserId},
      ${eventType},
      ${entityType},
      ${entityId || null},
      ${description},
      ${severity},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}
