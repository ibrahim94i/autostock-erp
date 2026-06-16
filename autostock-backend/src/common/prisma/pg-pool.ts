import { Pool, PoolConfig } from 'pg';

/** Strip sslmode from URL — node-pg enforces cert verify when sslmode=require. */
function normalizeDatabaseUrl(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*&?/g, (_, sep) => (sep === '?' ? '?' : sep))
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

export function createPgPool(): Pool {
  const raw = process.env.DATABASE_URL ?? '';
  const connectionString = normalizeDatabaseUrl(raw);
  const useSsl =
    process.env.NODE_ENV === 'production' ||
    raw.includes('railway.app') ||
    raw.includes('sslmode=');

  const config: PoolConfig = { connectionString };
  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }
  return new Pool(config);
}
