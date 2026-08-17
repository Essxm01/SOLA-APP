/**
 * Sola Vacation Rentals — PostgreSQL Database Pool Client
 * Location: server/src/services/dbClient.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import 'dotenv/config';
import pg from 'pg';

let currentPool: pg.Pool | null = null;
let currentConnectionString = '';

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/sola_db';
  
  if (!currentPool || currentConnectionString !== connectionString) {
    if (currentPool) {
      currentPool.end().catch(() => {});
    }
    const useSsl = connectionString.includes('supabase') || connectionString.includes('pooler') || (!connectionString.includes('127.0.0.1') && !connectionString.includes('localhost'));
    currentPool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    currentConnectionString = connectionString;
  }
  return currentPool;
}

export const dbPool = {
  query: <T = any>(text: string, params?: any[]) => getDbPool().query<T>(text, params)
};

/**
 * Execute parameterized SQL query against PostgreSQL sola_db
 */
export async function queryDb<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return getDbPool().query<T>(text, params);
}
