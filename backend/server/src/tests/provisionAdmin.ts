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
  console.log('=== PROVISIONING REAL ADMIN ACCOUNT IN POSTGRESQL ===');
  
  // Insert or update admin account
  const query = `
    INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@sola.com',
      '$2b$10$e.eXp659/f33JzL83Xn80e227w910/k90022/b.0.0',
      'مسئول منصة صولا',
      'ADMIN',
      true,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active;
  `;

  await pool.query(query);

  const res = await pool.query('SELECT id, email, role, is_active FROM admin_users');
  console.log('--- POSTGRESQL SELECT email, role FROM admin_users ---');
  console.log(res.rows);

  await pool.end();
}

main().catch(err => {
  console.error('Provisioning error:', err);
  process.exit(1);
});
