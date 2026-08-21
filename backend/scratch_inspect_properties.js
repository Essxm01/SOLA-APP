import { queryDb } from './server/src/services/dbClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Inspecting production properties table...');
  const res = await queryDb(
    `SELECT id, owner_id, title, unit_type, property_type, address, base_price_per_night, status, verification_status, created_at, updated_at
     FROM properties
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );

  console.log(`Total properties found: ${res.rows.length}`);
  console.log(JSON.stringify(res.rows, null, 2));
}

main().catch(console.error);
