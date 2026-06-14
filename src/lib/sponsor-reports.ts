import { createHash, randomBytes, randomUUID } from "crypto";
import { tableExists } from "@/lib/db-schema";
import { sql } from "@/lib/neon";

export interface SponsorReportLinkSummary {
  id: string;
  channel_id: string;
  sponsor_id: string;
  sponsor_name: string;
  active: boolean;
  period_days: number;
  view_count: number;
  last_viewed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
  public_url?: string;
}

export const SPONSOR_REPORT_CADENCES = ["weekly", "monthly", "quarterly"] as const;
export type SponsorReportCadence = (typeof SPONSOR_REPORT_CADENCES)[number];

export interface SponsorReportScheduleSummary {
  id: string;
  channel_id: string;
  sponsor_id: string;
  sponsor_name: string;
  cadence: SponsorReportCadence;
  period_days: number;
  recipient_email: string;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_report_link_id: string | null;
  last_report_public_url?: string;
  last_email_sent_at: string | null;
  last_error: string | null;
  paused_at: string | null;
  created_at: string;
}

export interface SponsorReportScheduleRunResult {
  schedule_id: string;
  sponsor_id: string;
  sponsor_name: string;
  report_id: string | null;
  public_url: string | null;
  email_sent: boolean;
  error: string | null;
}

export interface SponsorReportDailyMetric {
  day: string;
  impressions: number;
  clicks: number;
}

export interface SponsorReportCountryMetric {
  country_code: string;
  country_name: string;
  impressions: number;
  clicks: number;
}

export interface SponsorReportVideoMetric {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  country_name: string | null;
  travel_map_opens: number;
  youtube_views: number;
  youtube_likes: number;
  youtube_comments: number;
}

export interface SponsorReportData {
  link: SponsorReportLinkSummary;
  period: {
    days: number;
    since: string;
    until: string;
  };
  platform: {
    name: string;
    logo_url: string;
  };
  creator: {
    channel_id: string;
    name: string;
    handle: string | null;
    logo_url: string | null;
    subscriber_count: number | null;
    map_url: string;
  };
  sponsor: {
    id: string;
    brand_name: string;
    logo_url: string | null;
    website_url: string | null;
    affiliate_url: string | null;
    discount_code: string | null;
    description: string | null;
    active: boolean;
    scope: "global" | "country" | "video";
    scope_label: string;
    country_codes: string[];
    video_count: number;
  };
  travel_map: {
    impressions: number;
    clicks: number;
    unique_clickers: number;
    ctr: number;
    video_opens: number;
    saved: number;
    favorites: number;
    watch_later: number;
    watch_time_seconds: number;
    top_country: SponsorReportCountryMetric | null;
    top_video: SponsorReportVideoMetric | null;
    daily: SponsorReportDailyMetric[];
    top_countries: SponsorReportCountryMetric[];
    top_videos: SponsorReportVideoMetric[];
  };
  youtube: {
    top_video: SponsorReportVideoMetric | null;
    total_views_in_scope: number;
    total_likes_in_scope: number;
    total_comments_in_scope: number;
  };
}

interface ReportLinkRow {
  id: string;
  channel_id: string;
  sponsor_id: string;
  sponsor_name: string;
  active: boolean;
  period_days: number | string;
  view_count: number | string;
  last_viewed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ReportScheduleRow {
  id: string;
  channel_id: string;
  sponsor_id: string;
  created_by_user_id: string;
  sponsor_name: string;
  cadence: string;
  period_days: number | string;
  recipient_email: string;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_report_link_id: string | null;
  last_email_sent_at: string | null;
  last_error: string | null;
  paused_at: string | null;
  created_at: string;
}

interface ReportSponsorRow {
  id: string;
  brand_name: string;
  logo_url: string | null;
  website_url: string | null;
  affiliate_url: string | null;
  discount_code: string | null;
  description: string | null;
  active: boolean;
}

interface ReportChannelRow {
  id: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | string | null;
  username: string;
}

interface ScopeVideoRow {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  country_code: string | null;
  country_name: string | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
}

export function generateSponsorReportToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSponsorReportToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function buildSponsorReportPublicUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/sponsor-report/${encodeURIComponent(token)}`;
}

async function sponsorReportLinksTableExists() {
  return tableExists("public", "sponsor_report_links");
}

async function sponsorReportSchedulesTableExists() {
  return tableExists("public", "sponsor_report_schedules");
}

function normalizeReportLink(row: ReportLinkRow, publicUrl?: string): SponsorReportLinkSummary {
  return {
    id: row.id,
    channel_id: row.channel_id,
    sponsor_id: row.sponsor_id,
    sponsor_name: row.sponsor_name,
    active: Boolean(row.active),
    period_days: Number(row.period_days || 30),
    view_count: Number(row.view_count || 0),
    last_viewed_at: row.last_viewed_at,
    revoked_at: row.revoked_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    public_url: publicUrl,
  };
}

function normalizeReportSchedule(row: ReportScheduleRow, origin?: string): SponsorReportScheduleSummary {
  const lastReportPublicUrl = row.last_report_link_id && origin
    ? `${origin.replace(/\/$/, "")}/sponsor-report/${row.last_report_link_id}`
    : undefined;
  return {
    id: row.id,
    channel_id: row.channel_id,
    sponsor_id: row.sponsor_id,
    sponsor_name: row.sponsor_name,
    cadence: SPONSOR_REPORT_CADENCES.includes(row.cadence as SponsorReportCadence) ? (row.cadence as SponsorReportCadence) : "monthly",
    period_days: Number(row.period_days || 30),
    recipient_email: row.recipient_email,
    active: Boolean(row.active),
    next_run_at: row.next_run_at,
    last_run_at: row.last_run_at,
    last_report_link_id: row.last_report_link_id,
    last_report_public_url: lastReportPublicUrl,
    last_email_sent_at: row.last_email_sent_at,
    last_error: row.last_error,
    paused_at: row.paused_at,
    created_at: row.created_at,
  };
}

export async function listSponsorReportLinks(channelId: string, origin?: string): Promise<SponsorReportLinkSummary[]> {
  if (!(await sponsorReportLinksTableExists())) return [];

  const rows = await sql<ReportLinkRow[]>`
    select
      srl.id,
      srl.channel_id::text as channel_id,
      srl.sponsor_id::text as sponsor_id,
      s.brand_name as sponsor_name,
      srl.active,
      srl.period_days,
      srl.view_count,
      srl.last_viewed_at,
      srl.revoked_at,
      srl.expires_at,
      srl.created_at
    from public.sponsor_report_links srl
    inner join public.sponsors s on s.id = srl.sponsor_id
    where srl.channel_id = ${channelId}
    order by srl.created_at desc
    limit 200
  `;

  return rows.map((row) => normalizeReportLink(row, origin ? `${origin.replace(/\/$/, "")}/sponsor-report/${row.id}` : undefined));
}

export async function listSponsorReportSchedules(channelId: string, origin?: string): Promise<SponsorReportScheduleSummary[]> {
  if (!(await sponsorReportSchedulesTableExists())) return [];

  const rows = await sql<ReportScheduleRow[]>`
    select
      srs.id::text as id,
      srs.channel_id::text as channel_id,
      srs.sponsor_id::text as sponsor_id,
      srs.created_by_user_id::text as created_by_user_id,
      s.brand_name as sponsor_name,
      srs.cadence,
      srs.period_days,
      srs.recipient_email,
      srs.active,
      srs.next_run_at,
      srs.last_run_at,
      srs.last_report_link_id::text as last_report_link_id,
      srs.last_email_sent_at,
      srs.last_error,
      srs.paused_at,
      srs.created_at
    from public.sponsor_report_schedules srs
    inner join public.sponsors s on s.id = srs.sponsor_id
    where srs.channel_id = ${channelId}
    order by srs.active desc, srs.next_run_at asc, srs.created_at desc
    limit 200
  `;

  return rows.map((row) => normalizeReportSchedule(row, origin));
}

export async function createSponsorReportLink({
  channelId,
  sponsorId,
  createdByUserId,
  periodDays = 30,
}: {
  channelId: string;
  sponsorId: string;
  createdByUserId: string;
  periodDays?: number;
}) {
  if (!(await sponsorReportLinksTableExists())) {
    throw new Error("La tabla sponsor_report_links no existe. Ejecuta las migraciones antes de crear reportes.");
  }

  const token = randomUUID();
  const tokenHash = hashSponsorReportToken(token);
  const days = Math.min(365, Math.max(7, Math.round(periodDays)));

  const rows = await sql<Array<{ id: string; created_at: string }>>`
    insert into public.sponsor_report_links (
      id,
      channel_id,
      sponsor_id,
      created_by_user_id,
      token_hash,
      period_days
    )
    values (
      ${token},
      ${channelId},
      ${sponsorId},
      ${createdByUserId},
      ${tokenHash},
      ${days}
    )
    returning id, created_at
  `;

  return {
    id: rows[0]?.id || "",
    token,
    period_days: days,
    created_at: rows[0]?.created_at || null,
  };
}

export async function revokeSponsorReportLink({
  channelId,
  reportId,
}: {
  channelId: string;
  reportId: string;
}) {
  if (!(await sponsorReportLinksTableExists())) return false;

  const rows = await sql<Array<{ id: string }>>`
    update public.sponsor_report_links
    set active = false,
        revoked_at = coalesce(revoked_at, now())
    where id = ${reportId}
      and channel_id = ${channelId}
      and active = true
    returning id
  `;
  return Boolean(rows[0]?.id);
}

export async function createSponsorReportSchedule(input: {
  channelId: string;
  sponsorId: string;
  createdByUserId: string;
  cadence: SponsorReportCadence;
  periodDays?: number;
  recipientEmail: string;
  nextRunAt?: string | null;
}) {
  if (!(await sponsorReportSchedulesTableExists())) {
    throw new Error("La tabla sponsor_report_schedules no existe. Ejecuta las migraciones antes de programar reportes.");
  }

  const email = normalizeEmail(input.recipientEmail);
  if (!email) throw new Error("Escribe un email valido para programar reportes.");
  const cadence = normalizeCadence(input.cadence);
  const periodDays = normalizePeriodDays(input.periodDays || 30);
  const nextRunAt = normalizeScheduleDate(input.nextRunAt) || new Date().toISOString();

  const rows = await sql<Array<{ id: string }>>`
    insert into public.sponsor_report_schedules (
      channel_id,
      sponsor_id,
      created_by_user_id,
      cadence,
      period_days,
      recipient_email,
      next_run_at
    )
    values (
      ${input.channelId},
      ${input.sponsorId},
      ${input.createdByUserId},
      ${cadence},
      ${periodDays},
      ${email},
      ${nextRunAt}
    )
    returning id::text as id
  `;

  return rows[0]?.id || null;
}

export async function updateSponsorReportSchedule(input: {
  channelId: string;
  scheduleId: string;
  cadence?: SponsorReportCadence;
  periodDays?: number;
  recipientEmail?: string;
  nextRunAt?: string | null;
}) {
  if (!(await sponsorReportSchedulesTableExists())) return false;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  function addSet(column: string, value: unknown) {
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  if (input.cadence) addSet("cadence", normalizeCadence(input.cadence));
  if (typeof input.periodDays !== "undefined") addSet("period_days", normalizePeriodDays(input.periodDays));
  if (typeof input.recipientEmail !== "undefined") {
    const email = normalizeEmail(input.recipientEmail);
    if (!email) throw new Error("Escribe un email valido para actualizar la programacion.");
    addSet("recipient_email", email);
  }
  if (typeof input.nextRunAt !== "undefined") {
    const nextRunAt = normalizeScheduleDate(input.nextRunAt);
    if (!nextRunAt) throw new Error("La fecha de proximo envio no es valida.");
    addSet("next_run_at", nextRunAt);
  }

  if (setClauses.length === 0) return true;
  values.push(input.scheduleId, input.channelId);
  const rows = await sql.query<Array<{ id: string }>>(
    `update public.sponsor_report_schedules
     set ${setClauses.join(", ")},
         last_error = null,
         updated_at = now()
     where id = $${values.length - 1}
       and channel_id = $${values.length}
     returning id::text as id`,
    values
  );
  return Boolean(rows[0]?.id);
}

export async function setSponsorReportScheduleActive({
  channelId,
  scheduleId,
  active,
}: {
  channelId: string;
  scheduleId: string;
  active: boolean;
}) {
  if (!(await sponsorReportSchedulesTableExists())) return false;
  const rows = await sql<Array<{ id: string }>>`
    update public.sponsor_report_schedules
    set active = ${active},
        paused_at = case when ${active} = false then now() else null end,
        next_run_at = case when ${active} = true and next_run_at < now() then now() else next_run_at end,
        updated_at = now()
    where id = ${scheduleId}
      and channel_id = ${channelId}
    returning id::text as id
  `;
  return Boolean(rows[0]?.id);
}

export async function sponsorBelongsToChannel(channelId: string, sponsorId: string) {
  const rows = await sql<Array<{ id: string }>>`
    select s.id::text as id
    from public.sponsors s
    inner join public.channels c on c.user_id = s.user_id
    where c.id = ${channelId}
      and s.id = ${sponsorId}
    limit 1
  `;
  return Boolean(rows[0]?.id);
}

export async function sponsorReportScheduleBelongsToChannel(channelId: string, scheduleId: string) {
  if (!(await sponsorReportSchedulesTableExists())) return false;
  const rows = await sql<Array<{ id: string }>>`
    select id::text as id
    from public.sponsor_report_schedules
    where id = ${scheduleId}
      and channel_id = ${channelId}
    limit 1
  `;
  return Boolean(rows[0]?.id);
}

export async function runSponsorReportSchedule({
  scheduleId,
  channelId,
  origin,
}: {
  scheduleId: string;
  channelId?: string;
  origin: string;
}): Promise<SponsorReportScheduleRunResult | null> {
  if (!(await sponsorReportSchedulesTableExists())) return null;

  const rows = await sql<ReportScheduleRow[]>`
    select
      srs.id::text as id,
      srs.channel_id::text as channel_id,
      srs.sponsor_id::text as sponsor_id,
      srs.created_by_user_id::text as created_by_user_id,
      s.brand_name as sponsor_name,
      srs.cadence,
      srs.period_days,
      srs.recipient_email,
      srs.active,
      srs.next_run_at,
      srs.last_run_at,
      srs.last_report_link_id::text as last_report_link_id,
      srs.last_email_sent_at,
      srs.last_error,
      srs.paused_at,
      srs.created_at
    from public.sponsor_report_schedules srs
    inner join public.sponsors s on s.id = srs.sponsor_id
    where srs.id = ${scheduleId}
    limit 1
  `;
  const schedule = rows[0] || null;
  if (!schedule) return null;
  if (channelId && schedule.channel_id !== channelId) return null;

  let reportId: string | null = null;
  let publicUrl: string | null = null;
  let emailSent = false;
  let error: string | null = null;

  try {
    const created = await createSponsorReportLink({
      channelId: schedule.channel_id,
      sponsorId: schedule.sponsor_id,
      createdByUserId: schedule.created_by_user_id,
      periodDays: Number(schedule.period_days || 30),
    });
    reportId = created.id;
    publicUrl = buildSponsorReportPublicUrl(origin, created.token);
    const emailResult = await sendSponsorReportEmail({
      to: schedule.recipient_email,
      sponsorName: schedule.sponsor_name,
      publicUrl,
    });
    emailSent = emailResult.sent;
    error = emailResult.error;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "No se pudo generar el reporte programado.";
  }

  await sql`
    update public.sponsor_report_schedules
    set last_run_at = now(),
        last_report_link_id = ${reportId},
        last_email_sent_at = case when ${emailSent} = true then now() else last_email_sent_at end,
        last_error = ${error},
        next_run_at = ${nextRunForCadence(normalizeCadence(schedule.cadence), new Date()).toISOString()},
        updated_at = now()
    where id = ${schedule.id}
  `;

  return {
    schedule_id: schedule.id,
    sponsor_id: schedule.sponsor_id,
    sponsor_name: schedule.sponsor_name,
    report_id: reportId,
    public_url: publicUrl,
    email_sent: emailSent,
    error,
  };
}

export async function runDueSponsorReportSchedules({
  origin,
  limit = 20,
}: {
  origin: string;
  limit?: number;
}) {
  if (!(await sponsorReportSchedulesTableExists())) {
    return { processed: 0, results: [] as SponsorReportScheduleRunResult[] };
  }

  const rows = await sql<Array<{ id: string }>>`
    select id::text as id
    from public.sponsor_report_schedules
    where active = true
      and next_run_at <= now()
    order by next_run_at asc
    limit ${Math.min(50, Math.max(1, limit))}
  `;
  const results: SponsorReportScheduleRunResult[] = [];
  for (const row of rows) {
    const result = await runSponsorReportSchedule({ scheduleId: row.id, origin });
    if (result) results.push(result);
  }
  return { processed: results.length, results };
}

export async function loadSponsorReportByToken(token: string): Promise<SponsorReportData | null> {
  if (!(await sponsorReportLinksTableExists())) return null;

  const tokenHash = hashSponsorReportToken(token);
  const rows = await sql<ReportLinkRow[]>`
    select
      srl.id,
      srl.channel_id::text as channel_id,
      srl.sponsor_id::text as sponsor_id,
      s.brand_name as sponsor_name,
      srl.active,
      srl.period_days,
      srl.view_count,
      srl.last_viewed_at,
      srl.revoked_at,
      srl.expires_at,
      srl.created_at
    from public.sponsor_report_links srl
    inner join public.sponsors s on s.id = srl.sponsor_id
    where srl.token_hash = ${tokenHash}
      and srl.active = true
      and srl.revoked_at is null
      and (srl.expires_at is null or srl.expires_at > now())
    limit 1
  `;
  const link = rows[0] || null;
  if (!link) return null;

  await sql`
    update public.sponsor_report_links
    set view_count = view_count + 1,
        last_viewed_at = now()
    where id = ${link.id}
  `;

  return buildSponsorReportData(normalizeReportLink({ ...link, view_count: Number(link.view_count || 0) + 1 }));
}

async function buildSponsorReportData(link: SponsorReportLinkSummary): Promise<SponsorReportData | null> {
  const [channelRows, sponsorRows, countryRows, directVideoRows] = await Promise.all([
    sql<ReportChannelRow[]>`
      select c.id::text as id, c.channel_name, c.channel_handle, c.thumbnail_url, c.subscriber_count, u.username
      from public.channels c
      inner join public.users u on u.id = c.user_id
      where c.id = ${link.channel_id}
      limit 1
    `,
    sql<ReportSponsorRow[]>`
      select id::text as id, brand_name, logo_url, website_url, affiliate_url, discount_code, description, active
      from public.sponsors
      where id = ${link.sponsor_id}
      limit 1
    `,
    sql<Array<{ country_code: string }>>`
      select country_code
      from public.sponsor_geo_rules
      where sponsor_id = ${link.sponsor_id}
        and country_code is not null
      order by country_code asc
    `,
    sql<Array<{ video_id: string }>>`
      select video_id::text as video_id
      from public.sponsor_video_rules
      where sponsor_id = ${link.sponsor_id}
    `,
  ]);

  const channel = channelRows[0] || null;
  const sponsor = sponsorRows[0] || null;
  if (!channel || !sponsor) return null;

  const countryCodes = Array.from(new Set(countryRows.map((row) => String(row.country_code || "").toUpperCase()).filter(Boolean)));
  const directVideoIds = Array.from(new Set(directVideoRows.map((row) => row.video_id).filter(Boolean)));
  const scope = directVideoIds.length > 0 ? "video" : countryCodes.length > 0 ? "country" : "global";
  const scopedVideos = await loadSponsorScopeVideos(link.channel_id, scope, countryCodes, directVideoIds);
  const scopedYoutubeIds = scopedVideos.map((video) => video.youtube_video_id).filter(Boolean);
  const since = new Date(Date.now() - link.period_days * 24 * 60 * 60 * 1000);
  const until = new Date();

  const [
    summaryRows,
    dailyImpressionRows,
    dailyClickRows,
    countryMetricRows,
    topVideoRows,
    engagementRows,
  ] = await Promise.all([
    loadSponsorSummary(link.channel_id, link.sponsor_id, since),
    loadDailySponsorImpressions(link.channel_id, link.sponsor_id, since),
    loadDailySponsorClicks(link.channel_id, link.sponsor_id, since),
    loadSponsorCountryMetrics(link.channel_id, link.sponsor_id, since),
    loadScopedVideoOpens(link.channel_id, scopedYoutubeIds, since),
    loadScopedEngagement(link.channel_id, scopedYoutubeIds, since),
  ]);

  const videoByYoutubeId = new Map(scopedVideos.map((video) => [video.youtube_video_id, video]));
  const topVideos = topVideoRows
    .map((row) => normalizeVideoMetric(videoByYoutubeId.get(row.youtube_video_id), Number(row.opens || 0)))
    .filter((video): video is SponsorReportVideoMetric => Boolean(video));
  const youtubeTopVideos = scopedVideos
    .map((video) => normalizeVideoMetric(video, topVideos.find((entry) => entry.youtube_video_id === video.youtube_video_id)?.travel_map_opens || 0))
    .filter((video): video is SponsorReportVideoMetric => Boolean(video))
    .sort((a, b) => b.youtube_views - a.youtube_views)
    .slice(0, 10);

  const summary = summaryRows[0] || { impressions: 0, clicks: 0, unique_clickers: 0 };
  const impressions = Number(summary.impressions || 0);
  const clicks = Number(summary.clicks || 0);
  const topCountries = countryMetricRows.map((row) => ({
    country_code: row.country_code || "N/A",
    country_name: row.country_name || row.country_code || "Sin pais",
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
  }));
  const daily = mergeDailyMetrics(link.period_days, dailyImpressionRows, dailyClickRows, until);
  const engagement = engagementRows[0] || {
    video_opens: 0,
    saved: 0,
    favorites: 0,
    watch_later: 0,
    watch_time_seconds: 0,
  };

  return {
    link,
    period: {
      days: link.period_days,
      since: since.toISOString(),
      until: until.toISOString(),
    },
    platform: {
      name: "TravelYourMap",
      logo_url: "/icon.svg",
    },
    creator: {
      channel_id: channel.id,
      name: channel.channel_name,
      handle: channel.channel_handle || channel.username,
      logo_url: channel.thumbnail_url,
      subscriber_count: channel.subscriber_count === null ? null : Number(channel.subscriber_count),
      map_url: `/u/${encodeURIComponent(channel.channel_handle || channel.username)}`,
    },
    sponsor: {
      id: sponsor.id,
      brand_name: sponsor.brand_name,
      logo_url: sponsor.logo_url,
      website_url: sponsor.website_url,
      affiliate_url: sponsor.affiliate_url,
      discount_code: sponsor.discount_code,
      description: sponsor.description,
      active: Boolean(sponsor.active),
      scope,
      scope_label: buildScopeLabel(scope, countryCodes, scopedVideos.length),
      country_codes: countryCodes,
      video_count: scopedVideos.length,
    },
    travel_map: {
      impressions,
      clicks,
      unique_clickers: Number(summary.unique_clickers || 0),
      ctr: impressions > 0 ? clicks / impressions : 0,
      video_opens: Number(engagement.video_opens || 0),
      saved: Number(engagement.saved || 0),
      favorites: Number(engagement.favorites || 0),
      watch_later: Number(engagement.watch_later || 0),
      watch_time_seconds: Number(engagement.watch_time_seconds || 0),
      top_country: topCountries[0] || null,
      top_video: topVideos[0] || null,
      daily,
      top_countries: topCountries,
      top_videos: topVideos,
    },
    youtube: {
      top_video: youtubeTopVideos[0] || null,
      total_views_in_scope: scopedVideos.reduce((sum, video) => sum + Number(video.view_count || 0), 0),
      total_likes_in_scope: scopedVideos.reduce((sum, video) => sum + Number(video.like_count || 0), 0),
      total_comments_in_scope: scopedVideos.reduce((sum, video) => sum + Number(video.comment_count || 0), 0),
    },
  };
}

async function loadSponsorScopeVideos(
  channelId: string,
  scope: "global" | "country" | "video",
  countryCodes: string[],
  directVideoIds: string[]
) {
  if (scope === "video") {
    return sql<ScopeVideoRow[]>`
      select
        v.id::text as id,
        v.youtube_video_id,
        v.title,
        v.thumbnail_url,
        vl.country_code,
        vl.country_name,
        v.view_count,
        v.like_count,
        v.comment_count
      from public.videos v
      left join public.video_locations vl on vl.video_id = v.id and vl.is_primary = true
      where v.channel_id = ${channelId}
        and v.id = any(${directVideoIds})
        and coalesce(v.is_travel, true) = true
        and coalesce(v.is_short, false) = false
      order by coalesce(v.view_count, 0) desc
      limit 500
    `;
  }

  if (scope === "country") {
    return sql<ScopeVideoRow[]>`
      select
        v.id::text as id,
        v.youtube_video_id,
        v.title,
        v.thumbnail_url,
        vl.country_code,
        vl.country_name,
        v.view_count,
        v.like_count,
        v.comment_count
      from public.videos v
      inner join public.video_locations vl on vl.video_id = v.id and vl.is_primary = true
      where v.channel_id = ${channelId}
        and upper(vl.country_code) = any(${countryCodes})
        and coalesce(v.is_travel, true) = true
        and coalesce(v.is_short, false) = false
      order by coalesce(v.view_count, 0) desc
      limit 500
    `;
  }

  return sql<ScopeVideoRow[]>`
    select
      v.id::text as id,
      v.youtube_video_id,
      v.title,
      v.thumbnail_url,
      vl.country_code,
      vl.country_name,
      v.view_count,
      v.like_count,
      v.comment_count
    from public.videos v
    left join public.video_locations vl on vl.video_id = v.id and vl.is_primary = true
    where v.channel_id = ${channelId}
      and coalesce(v.is_travel, true) = true
      and coalesce(v.is_short, false) = false
    order by coalesce(v.view_count, 0) desc
    limit 500
  `;
}

async function loadSponsorSummary(channelId: string, sponsorId: string, since: Date) {
  return sql<Array<{ impressions: number | string; clicks: number | string; unique_clickers: number | string }>>`
    select
      (
        select count(*)::int
        from public.map_events
        where channel_id = ${channelId}
          and sponsor_id = ${sponsorId}
          and event_type = 'sponsor_impression'
          and created_at >= ${since.toISOString()}
      ) as impressions,
      (
        select count(*)::int
        from public.sponsor_clicks
        where channel_id = ${channelId}
          and sponsor_id = ${sponsorId}
          and clicked_at >= ${since.toISOString()}
      ) as clicks,
      (
        select count(distinct ip_hash)::int
        from public.sponsor_clicks
        where channel_id = ${channelId}
          and sponsor_id = ${sponsorId}
          and clicked_at >= ${since.toISOString()}
          and ip_hash is not null
      ) as unique_clickers
  `;
}

async function loadDailySponsorImpressions(channelId: string, sponsorId: string, since: Date) {
  return sql<Array<{ day: string; impressions: number | string }>>`
    select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as impressions
    from public.map_events
    where channel_id = ${channelId}
      and sponsor_id = ${sponsorId}
      and event_type = 'sponsor_impression'
      and created_at >= ${since.toISOString()}
    group by day
    order by day asc
  `;
}

async function loadDailySponsorClicks(channelId: string, sponsorId: string, since: Date) {
  return sql<Array<{ day: string; clicks: number | string }>>`
    select to_char(clicked_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as clicks
    from public.sponsor_clicks
    where channel_id = ${channelId}
      and sponsor_id = ${sponsorId}
      and clicked_at >= ${since.toISOString()}
    group by day
    order by day asc
  `;
}

async function loadSponsorCountryMetrics(channelId: string, sponsorId: string, since: Date) {
  return sql<Array<{ country_code: string | null; country_name: string | null; impressions: number | string; clicks: number | string }>>`
    with sponsor_event_countries as (
      select
        country_code,
        count(*) filter (where event_type = 'sponsor_impression')::int as impressions,
        count(*) filter (where event_type = 'sponsor_click')::int as event_clicks
      from public.map_events
      where channel_id = ${channelId}
        and sponsor_id = ${sponsorId}
        and event_type in ('sponsor_impression', 'sponsor_click')
        and created_at >= ${since.toISOString()}
      group by country_code
    ),
    sponsor_click_countries as (
      select country_code, count(*)::int as clicks
      from public.sponsor_clicks
      where channel_id = ${channelId}
        and sponsor_id = ${sponsorId}
        and clicked_at >= ${since.toISOString()}
      group by country_code
    )
    select
      coalesce(sec.country_code, scc.country_code) as country_code,
      max(vl.country_name) as country_name,
      coalesce(max(sec.impressions), 0)::int as impressions,
      coalesce(max(scc.clicks), max(sec.event_clicks), 0)::int as clicks
    from sponsor_event_countries sec
    full outer join sponsor_click_countries scc on scc.country_code is not distinct from sec.country_code
    left join public.video_locations vl on upper(vl.country_code) = upper(coalesce(sec.country_code, scc.country_code))
      and vl.channel_id = ${channelId}
    group by coalesce(sec.country_code, scc.country_code)
    order by (coalesce(max(sec.impressions), 0) + coalesce(max(scc.clicks), max(sec.event_clicks), 0)) desc
    limit 10
  `;
}

async function loadScopedVideoOpens(channelId: string, youtubeVideoIds: string[], since: Date) {
  if (youtubeVideoIds.length === 0) return [];
  return sql<Array<{ youtube_video_id: string; opens: number | string }>>`
    select youtube_video_id, count(*)::int as opens
    from public.map_events
    where channel_id = ${channelId}
      and youtube_video_id = any(${youtubeVideoIds})
      and event_type = 'video_panel_open'
      and created_at >= ${since.toISOString()}
    group by youtube_video_id
    order by count(*) desc
    limit 10
  `;
}

async function loadScopedEngagement(channelId: string, youtubeVideoIds: string[], since: Date) {
  if (youtubeVideoIds.length === 0) {
    return [{ video_opens: 0, saved: 0, favorites: 0, watch_later: 0, watch_time_seconds: 0 }];
  }
  return sql<Array<{ video_opens: number | string; saved: number | string; favorites: number | string; watch_later: number | string; watch_time_seconds: number | string }>>`
    select
      count(*) filter (where event_type = 'video_panel_open')::int as video_opens,
      count(*) filter (where event_type = 'video_saved_added')::int as saved,
      count(*) filter (where event_type = 'video_favorite_added')::int as favorites,
      count(*) filter (where event_type = 'video_watch_later_added')::int as watch_later,
      coalesce(sum(
        case
          when event_type = 'video_watch_time_logged'
            and coalesce(metadata->>'watch_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
          then (metadata->>'watch_seconds')::numeric
          else 0
        end
      ), 0)::int as watch_time_seconds
    from public.map_events
    where channel_id = ${channelId}
      and youtube_video_id = any(${youtubeVideoIds})
      and event_type in (
        'video_panel_open',
        'video_saved_added',
        'video_favorite_added',
        'video_watch_later_added',
        'video_watch_time_logged'
      )
      and created_at >= ${since.toISOString()}
  `;
}

function normalizeVideoMetric(video: ScopeVideoRow | undefined, travelMapOpens: number): SponsorReportVideoMetric | null {
  if (!video) return null;
  return {
    id: video.id,
    youtube_video_id: video.youtube_video_id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    country_name: video.country_name || video.country_code,
    travel_map_opens: travelMapOpens,
    youtube_views: Number(video.view_count || 0),
    youtube_likes: Number(video.like_count || 0),
    youtube_comments: Number(video.comment_count || 0),
  };
}

function mergeDailyMetrics(
  periodDays: number,
  impressionRows: Array<{ day: string; impressions: number | string }>,
  clickRows: Array<{ day: string; clicks: number | string }>,
  until: Date
): SponsorReportDailyMetric[] {
  const buckets = new Map<string, SponsorReportDailyMetric>();
  for (let offset = periodDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()));
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, { day: key, impressions: 0, clicks: 0 });
  }
  for (const row of impressionRows) {
    const bucket = buckets.get(row.day);
    if (bucket) bucket.impressions = Number(row.impressions || 0);
  }
  for (const row of clickRows) {
    const bucket = buckets.get(row.day);
    if (bucket) bucket.clicks = Number(row.clicks || 0);
  }
  return Array.from(buckets.values());
}

function buildScopeLabel(scope: "global" | "country" | "video", countryCodes: string[], videoCount: number) {
  if (scope === "global") return "Sponsor global en el mapa";
  if (scope === "country") return `${countryCodes.length} pais${countryCodes.length === 1 ? "" : "es"} asignado${countryCodes.length === 1 ? "" : "s"}`;
  return `${videoCount} video${videoCount === 1 ? "" : "s"} asignado${videoCount === 1 ? "" : "s"}`;
}

function normalizeCadence(value: string): SponsorReportCadence {
  return SPONSOR_REPORT_CADENCES.includes(value as SponsorReportCadence) ? (value as SponsorReportCadence) : "monthly";
}

function normalizePeriodDays(value: number) {
  return Math.min(365, Math.max(7, Math.round(Number(value) || 30)));
}

function normalizeEmail(value: string) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeScheduleDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T09:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function nextRunForCadence(cadence: SponsorReportCadence, from: Date) {
  const next = new Date(from);
  if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (cadence === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  return next;
}

async function sendSponsorReportEmail({
  to,
  sponsorName,
  publicUrl,
}: {
  to: string;
  sponsorName: string;
  publicUrl: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.REPORT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey || !from) {
    return {
      sent: false,
      error: "Email transaccional no configurado. Define RESEND_API_KEY y REPORT_EMAIL_FROM para enviar reportes automaticamente.",
    };
  }

  const subject = `Reporte de resultados - ${sponsorName}`;
  const text = [
    "Hola,",
    "",
    `Te compartimos el reporte privado de resultados de ${sponsorName} en TravelYourMap:`,
    publicUrl,
    "",
    "Incluye clicks, actividad en el mapa, videos destacados, paises principales y contexto importado desde YouTube.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">Reporte de resultados - ${escapeHtml(sponsorName)}</h1>
      <p>Te compartimos el reporte privado de resultados de ${escapeHtml(sponsorName)} en TravelYourMap.</p>
      <p><a href="${escapeHtml(publicUrl)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700">Abrir reporte privado</a></p>
      <p style="color:#4b5563">Incluye clicks, actividad en el mapa, videos destacados, paises principales y contexto importado desde YouTube.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      sent: false,
      error: `Resend no pudo enviar el reporte (${response.status}). ${body.slice(0, 180)}`.trim(),
    };
  }

  return { sent: true, error: null };
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
