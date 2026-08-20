/**
 * List all users and owners from database
 * Location: backend/server/src/scripts/listAllUsersOwners.ts
 */

import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';

async function list() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const resUsers = await client.query('SELECT id, phone_number, full_name, created_at FROM users ORDER BY created_at ASC;');
    const resOwners = await client.query('SELECT id, phone_number, full_name, created_at FROM owners ORDER BY created_at ASC;');

    console.log(`=== USERS (${resUsers.rowCount}) ===`);
    resUsers.rows.forEach(u => {
      console.log(`User: id=${u.id}, phone=${u.phone_number}, norm=${normalizePhoneNumber(u.phone_number)}`);
    });

    console.log(`\n=== OWNERS (${resOwners.rowCount}) ===`);
    resOwners.rows.forEach(o => {
      console.log(`Owner: id=${o.id}, phone=${o.phone_number}, norm=${normalizePhoneNumber(o.phone_number)}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

list().catch(console.error);
