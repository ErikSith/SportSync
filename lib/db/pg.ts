import { Client, type QueryResultRow } from 'pg';

export { hasValidServiceRoleKey } from '@/lib/db/service-role';

const PROJECT_REF = 'jnxpmtaystxywjxxyexh';

function stripSchemaParam(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('schema');
    return u.toString();
  } catch {
    return url.replace(/[?&]schema=[^&]*/g, '');
  }
}

/**
 * DATABASE_URL passwords are sometimes wrapped as `[secret]` in templates.
 * Also `[...]` breaks URL parsing (IPv6 host syntax) — parse manually.
 */
function parseDatabaseUrl(raw: string): { user: string; password: string; host: string; port: string; database: string } {
  const cleaned = stripSchemaParam(raw.trim().replace(/^"|"$/g, ''));
  const m = cleaned.match(
    /^postgres(?:ql)?:\/\/([^:\/?#]+):(.+)@([^:\/?#]+)(?::(\d+))?\/([^?]+)/i,
  );
  if (!m?.[1] || m[2] === undefined || !m[3] || !m[5]) {
    throw new Error('DATABASE_URL could not be parsed');
  }
  let password = decodeURIComponent(m[2]);
  if (password.startsWith('[') && password.endsWith(']') && password.length > 2) {
    password = password.slice(1, -1);
  }
  return {
    user: decodeURIComponent(m[1]),
    password,
    host: m[3],
    port: m[4] ?? '5432',
    database: m[5],
  };
}

/** Prefer IPv4-friendly Supabase session pooler when direct db.* host fails on some networks. */
export function resolvePgConnectionString(raw = process.env.DATABASE_URL): string {
  if (!raw) throw new Error('DATABASE_URL is required for Postgres admin access');
  const parts = parseDatabaseUrl(raw);
  // Session pooler (IPv4): user must be postgres.PROJECT_REF
  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(parts.password)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
}

export function resolvePgConnectionCandidates(raw = process.env.DATABASE_URL): string[] {
  if (!raw) throw new Error('DATABASE_URL is required for Postgres admin access');
  const parts = parseDatabaseUrl(raw);
  const pw = encodeURIComponent(parts.password);
  const db = parts.database || 'postgres';
  return [
    `postgresql://postgres.${PROJECT_REF}:${pw}@aws-0-eu-west-1.pooler.supabase.com:5432/${db}`,
    `postgresql://postgres.${PROJECT_REF}:${pw}@aws-0-eu-west-1.pooler.supabase.com:6543/${db}`,
    `postgresql://postgres:${pw}@db.${PROJECT_REF}.supabase.co:5432/${db}`,
    `postgresql://postgres:${pw}@${parts.host}:${parts.port}/${db}`,
  ];
}

export async function withPgAdmin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const candidates = resolvePgConnectionCandidates();
  let lastError: unknown;

  for (const connectionString of candidates) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    });
    try {
      await client.connect();
      try {
        return await fn(client);
      } finally {
        await client.end();
      }
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Postgres admin connection failed for all candidates');
}

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return withPgAdmin((client) => client.query<T>(text, params));
}
