import { queryDb } from './server/src/services/dbClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const res = await queryDb(
    `SELECT id, owner_id, title, unit_type, address, base_price_per_night, status, verification_status, created_at
     FROM properties
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );

  console.log(`TOTAL PROPERTIES: ${res.rows.length}`);
  const published = res.rows.filter(p => p.status === 'PUBLISHED');
  console.log(`PUBLISHED PROPERTIES COUNT: ${published.length}`);

  published.forEach((p, idx) => {
    console.log(`[${idx + 1}] ID: ${p.id} | Title: "${p.title}" | Owner: ${p.owner_id} | Created: ${p.created_at}`);
  });

  const other = res.rows.filter(p => p.status !== 'PUBLISHED');
  console.log(`\nOTHER STATUS PROPERTIES (${other.length}):`);
  other.forEach((p, idx) => {
    console.log(`[${idx + 1}] Status: ${p.status} | ID: ${p.id} | Title: "${p.title}" | Owner: ${p.owner_id}`);
  });
}

main().catch(console.error);
