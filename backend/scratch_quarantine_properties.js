import { queryDb } from './server/src/services/dbClient.js';
import dotenv from 'dotenv';
dotenv.config();

const FIXTURE_IDS = [
  'ebe14048-1b4f-4956-99da-bb58cd59c330',
  'ccbd27e4-2a57-4b9a-a9f4-7aa957c5dbe8',
  '7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc',
  'f35955df-857a-41fc-af15-f6117777cc7b',
  '0832d668-fe8e-4091-a66e-ac259ede0d46',
  '4bdc92d2-7fef-4faf-9ef4-4cba1c94cb4b',
  '08d17fa6-3bbc-4089-99f4-7db05a58261d',
];

async function main() {
  console.log('Quarantining 7 confirmed test/fixture properties by setting status to ARCHIVED...');

  for (const id of FIXTURE_IDS) {
    const res = await queryDb(
      `UPDATE properties SET status = $2, verification_status = $3 WHERE id = $1 RETURNING id, title, status`,
      [id, 'ARCHIVED', 'VERIFIED']
    );
    console.log(`Updated property ${id}:`, res.rows[0]);
  }

  // Verify remaining published properties
  const check = await queryDb(
    `SELECT id, title, status FROM properties WHERE status = 'PUBLISHED' AND deleted_at IS NULL`
  );
  console.log(`Remaining PUBLISHED properties in production: ${check.rows.length}`);
}

main().catch(console.error);
