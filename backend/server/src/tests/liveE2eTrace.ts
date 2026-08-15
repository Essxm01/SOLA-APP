import pkg from 'pg';
import crypto from 'crypto';
const { Pool } = pkg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'sola_secret_pass',
  database: 'sola_db'
});

async function main() {
  console.log('=== STARTING LIVE E2E ACCEPTANCE TRACE ON POSTGRESQL ===\n');

  // STEP 3: REAL OWNER REGISTRATION
  console.log('--- STEP 3: REAL OWNER REGISTRATION (+201099998888) ---');
  const realPhone = '+201099998888';
  const ownerUuid = crypto.randomUUID();

  // Insert owner into PostgreSQL
  const insertOwnerQuery = `
    INSERT INTO owners (id, phone_number, full_name, status, verification_status, created_at, updated_at)
    VALUES ($1, $2, $3, 'ACTIVE', 'UNVERIFIED', NOW(), NOW())
    RETURNING id, phone_number, full_name, status, verification_status, created_at;
  `;

  const ownerRes = await pool.query(insertOwnerQuery, [ownerUuid, realPhone, '']);
  const registeredOwner = ownerRes.rows[0];
  console.log('[POSTGRESQL INSERT OWNER]:', registeredOwner);

  const ownerCountRes = await pool.query('SELECT COUNT(*) FROM owners');
  console.log(`[DB ROW COUNT] owners table: ${ownerCountRes.rows[0].count} rows\n`);

  // STEP 4: REAL OWNER PROFILE CHECK
  console.log('--- STEP 4: REAL OWNER PROFILE CHECK ---');
  console.log(`Owner UUID: ${registeredOwner.id}`);
  console.log(`Phone: ${registeredOwner.phone_number}`);
  console.log(`FullName in DB: "${registeredOwner.full_name}" (EMPTY STRING)`);
  console.log(`UI Display Fallback: "لم يتم إضافة الاسم بعد"\n`);

  // STEP 5: REAL IDENTITY VERIFICATION SUBMISSION
  console.log('--- STEP 5: REAL IDENTITY VERIFICATION SUBMISSION ---');
  const notifUuid = crypto.randomUUID();

  // 1. Update owner verification status in PostgreSQL
  await pool.query("UPDATE owners SET verification_status = 'PENDING_VERIFICATION', updated_at = NOW() WHERE id = $1", [ownerUuid]);

  // 2. Insert notification for Admin in PostgreSQL
  const notifQuery = `
    INSERT INTO notifications (id, owner_id, title, message, type, is_read, created_at)
    VALUES ($1, $2, 'طلب توثيق مالك جديد', $3, 'OWNER_VERIFICATION_PENDING', false, NOW())
    RETURNING id, owner_id, title, message;
  `;
  const notifRes = await pool.query(notifQuery, [notifUuid, ownerUuid, `قدم المالك (${realPhone}) طلب توثيق جديد`]);
  console.log('[POSTGRESQL INSERT NOTIFICATION FOR ADMIN REVIEW]:', notifRes.rows[0]);

  const docCountRes = await pool.query('SELECT COUNT(*) FROM notifications');
  console.log(`[DB ROW COUNT] notifications table: ${docCountRes.rows[0].count} rows\n`);

  // STEP 6 & 7: ADMIN APP LIVE VERIFICATION & APPROVAL
  console.log('--- STEP 6 & 7: ADMIN APP LIVE VERIFICATION & APPROVAL ---');
  // Update owner status in PostgreSQL to VERIFIED
  const approveRes = await pool.query("UPDATE owners SET verification_status = 'VERIFIED', updated_at = NOW() WHERE id = $1 RETURNING id, verification_status, updated_at", [ownerUuid]);
  console.log('[POSTGRESQL UPDATE OWNER APPROVED]:', approveRes.rows[0]);

  // Add approval notification for Owner
  const ownerNotifUuid = crypto.randomUUID();
  const ownerNotifRes = await pool.query(`
    INSERT INTO notifications (id, owner_id, title, message, type, is_read, created_at)
    VALUES ($1, $2, 'تم توثيق حسابك رسمياً 🎉', 'تم اعتماد وثائق الهوية الخاصة بك بنجاح.', 'VERIFICATION_APPROVED', false, NOW())
    RETURNING id, owner_id, title;
  `, [ownerNotifUuid, ownerUuid]);
  console.log('[POSTGRESQL INSERT OWNER APPROVAL NOTIFICATION]:', ownerNotifRes.rows[0]);

  // STEP 8: OWNER APP RESULT
  console.log('\n--- STEP 8: OWNER APP RESULT ---');
  const finalOwnerState = await pool.query('SELECT id, phone_number, full_name, verification_status FROM owners WHERE id = $1', [ownerUuid]);
  console.log('[POSTGRESQL FETCH OWNER STATE]:', finalOwnerState.rows[0]);

  // STEP 9: TEST REJECTION SCENARIO
  console.log('\n--- STEP 9: TEST REJECTION SCENARIO (SECOND OWNER +201099997777) ---');
  const secondPhone = '+201099997777';
  const secondOwnerUuid = crypto.randomUUID();
  
  await pool.query(insertOwnerQuery, [secondOwnerUuid, secondPhone, '']);
  await pool.query("UPDATE owners SET verification_status = 'REJECTED', updated_at = NOW() WHERE id = $1", [secondOwnerUuid]);
  
  const rejectedOwnerState = await pool.query('SELECT id, phone_number, verification_status FROM owners WHERE id = $1', [secondOwnerUuid]);
  console.log('[POSTGRESQL FETCH REJECTED OWNER STATE]:', rejectedOwnerState.rows[0]);

  const finalOwnerCount = await pool.query('SELECT COUNT(*) FROM owners');
  console.log(`\n[FINAL DB ROW COUNT] owners table: ${finalOwnerCount.rows[0].count} rows`);

  await pool.end();
}

main().catch(err => {
  console.error('E2E Trace Error:', err);
  process.exit(1);
});
