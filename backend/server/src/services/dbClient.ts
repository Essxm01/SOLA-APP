/**
 * Sola Vacation Rentals — PostgreSQL Database Pool Client
 * Location: server/src/services/dbClient.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/sola_db';

export const dbPool = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Execute parameterized SQL query against PostgreSQL sola_db
 */
export async function queryDb<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return dbPool.query<T>(text, params);
}
