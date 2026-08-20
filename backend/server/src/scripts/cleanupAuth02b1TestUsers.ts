/**
 * Cleanup any test users created during test execution
 * Location: backend/server/src/scripts/cleanupAuth02b1TestUsers.ts
 */

import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';

async function cleanup() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const targetIds = [
      '8e9d80d7-782c-49b5-88cc-96352ca7ec8f',
      '2f405210-45d2-4483-bbf2-2a9662346f84',
      '92f04a09-7c23-41c2-82c8-a17e22a91d28',
    ];

    console.log('Cleaning up test user IDs:', targetIds);
    const res = await client.query(
      'DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING id, phone_number;',
      [targetIds]
    );
    console.log(`Deleted ${res.rowCount} test rows.`);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(console.error);
