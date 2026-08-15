import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'sola_secret_pass',
  database: 'sola_db'
});

async function main() {
  const tables = [
    'owners',
    'owner_verification_documents',
    'admin_users',
    'notifications',
    'payout_requests',
    'disputes',
    'properties',
    'bookings'
  ];
  console.log('=== POSTGRESQL ENGINE FORENSIC METRICS ===');
  console.log('Host: 127.0.0.1 | Port: 5432 | Database: sola_db | User: postgres');
  console.log('--------------------------------------------------');
  
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`[TABLE] ${t.padEnd(30)} : ${res.rows[0].count} rows`);
    } catch (err: any) {
      console.log(`[TABLE] ${t.padEnd(30)} : ERROR (${err.message})`);
    }
  }

  console.log('\n=== FORENSIC SEARCH FOR DEMO STRINGS IN DB ===');
  const demoStrings = ['مالك صولا', 'أحمد الفاروق', 'PAY-2026', 'DSP-2026', '01000000001'];
  for (const str of demoStrings) {
    let found = false;
    for (const t of tables) {
      try {
        const res = await pool.query(`SELECT * FROM ${t}`);
        const rowsStr = JSON.stringify(res.rows);
        if (rowsStr.includes(str)) {
          console.log(`[FOUND DEMO DATA] String "${str}" in table ${t}:`, res.rows);
          found = true;
        }
      } catch (err) {
        // ignore missing table
      }
    }
    if (!found) {
      console.log(`[CLEAN] String "${str}" -> NOT FOUND in any database table.`);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('DB query error:', err);
  process.exit(1);
});
