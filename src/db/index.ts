/**
 * Portable PostgreSQL Connection Layer (Neon.tech <-> Supabase)
 * -------------------------------------------------------------
 * Uses standard PostgreSQL connection string from process.env.DATABASE_URL.
 * Works identically whether DATABASE_URL points to:
 *  1. Neon.tech: postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require
 *  2. Supabase:  postgresql://postgres.ref:pass@aws-0-region.pooler.supabase.com:6543/postgres
 *  3. Local PG:  postgresql://postgres:postgres@localhost:5432/labpath
 */

import * as schema from './schema';

export interface DatabaseConnectionConfig {
  provider: 'NEON' | 'SUPABASE' | 'STANDARD_PG';
  connectionString: string;
}

export function detectPostgresProvider(url: string = process.env.DATABASE_URL || ''): DatabaseConnectionConfig {
  if (url.includes('neon.tech')) {
    return { provider: 'NEON', connectionString: url };
  }
  if (url.includes('supabase.com') || url.includes('supabase.co')) {
    return { provider: 'SUPABASE', connectionString: url };
  }
  return { provider: 'STANDARD_PG', connectionString: url };
}

export { schema };

