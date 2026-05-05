import type { AdminAppUserRole } from "@/lib/admin-roles";
import { sql } from "@/lib/neon";

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string | null;
  updated_at: string | null;
}

export interface AdminUsersSummary {
  total: number;
  viewer: number;
  creator: number;
  superadmin: number;
}

export interface AdminUsersPageData {
  users: Array<{
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: AdminAppUserRole;
    updated_at: string | null;
  }>;
  summary: AdminUsersSummary;
  totalCount: number;
  page: number;
  totalPages: number;
  query: string;
  pageSize: number;
}

export async function loadAdminUsersPageData(query: string, requestedPage: number, pageSize = 20): Promise<AdminUsersPageData> {
  const normalizedQuery = normalizeSearchQuery(query);
  const searchPattern = normalizedQuery ? `%${normalizedQuery.toLowerCase()}%` : "";

  const summary = normalizedQuery
    ? await loadFilteredSummary(searchPattern)
    : await loadAllSummary();

  const totalCount = summary.total;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const page = totalPages === 0 ? 1 : Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * pageSize;

  const rows = normalizedQuery
    ? await loadFilteredRows(searchPattern, pageSize, offset)
    : await loadAllRows(pageSize, offset);

  return {
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      display_name: row.display_name,
      role: normalizeRole(row.role),
      updated_at: row.updated_at,
    })),
    summary,
    totalCount,
    page,
    totalPages,
    query: normalizedQuery,
    pageSize,
  };
}

function normalizeSearchQuery(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeRole(value: string | null | undefined): AdminAppUserRole {
  if (value === "viewer") return "viewer";
  if (value === "superadmin") return "superadmin";
  return "creator";
}

async function loadAllSummary(): Promise<AdminUsersSummary> {
  const rows = await sql<Array<{
    total: number;
    viewer: number;
    creator: number;
    superadmin: number;
  }>>`
    select
      count(*)::int as total,
      count(*) filter (where role::text = 'viewer')::int as viewer,
      count(*) filter (where role::text = 'creator')::int as creator,
      count(*) filter (where role::text = 'superadmin')::int as superadmin
    from public.users
  `;

  return rows[0] || { total: 0, viewer: 0, creator: 0, superadmin: 0 };
}

async function loadFilteredSummary(searchPattern: string): Promise<AdminUsersSummary> {
  const rows = await sql<Array<{
    total: number;
    viewer: number;
    creator: number;
    superadmin: number;
  }>>`
    select
      count(*)::int as total,
      count(*) filter (where role::text = 'viewer')::int as viewer,
      count(*) filter (where role::text = 'creator')::int as creator,
      count(*) filter (where role::text = 'superadmin')::int as superadmin
    from public.users
    where lower(email) like ${searchPattern}
       or lower(username) like ${searchPattern}
       or lower(display_name) like ${searchPattern}
       or lower(coalesce(role::text, '')) like ${searchPattern}
  `;

  return rows[0] || { total: 0, viewer: 0, creator: 0, superadmin: 0 };
}

async function loadAllRows(pageSize: number, offset: number) {
  return sql<AdminUserRow[]>`
    select id, email, username, display_name, role::text as role, updated_at
    from public.users
    order by updated_at desc nulls last, username asc
    limit ${pageSize}
    offset ${offset}
  `;
}

async function loadFilteredRows(searchPattern: string, pageSize: number, offset: number) {
  return sql<AdminUserRow[]>`
    select id, email, username, display_name, role::text as role, updated_at
    from public.users
    where lower(email) like ${searchPattern}
       or lower(username) like ${searchPattern}
       or lower(display_name) like ${searchPattern}
       or lower(coalesce(role::text, '')) like ${searchPattern}
    order by updated_at desc nulls last, username asc
    limit ${pageSize}
    offset ${offset}
  `;
}
