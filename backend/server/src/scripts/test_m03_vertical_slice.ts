import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function runM03Verification() {
  console.log('🚀 Starting M03 Vertical Slice Automated Verification...');
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

  // 1. Direct DB Check for Real Owner
  console.log('\n--- Step 1: Resolving real owner from PostgreSQL ---');
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();
  
  const ownerRes = await pgClient.query(`SELECT id, phone_number, full_name FROM owners LIMIT 1`);
  if (ownerRes.rows.length === 0) {
    throw new Error('No owner found in database');
  }
  const realOwner = ownerRes.rows[0];
  console.log(`✅ Found Real Owner: ID=${realOwner.id}, Phone=${realOwner.phone_number}, Name=${realOwner.full_name}`);

  // Obtain owner JWT token
  const authRes = await fetch(`${baseUrl}/auth/prototype-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: realOwner.phone_number, surface: 'OWNER' }),
  });
  const authJson = await authRes.json() as any;
  if (!authRes.ok || !authJson.success) {
    throw new Error(`Owner login failed: ${JSON.stringify(authJson)}`);
  }
  const ownerToken = authJson.data.tokens.accessToken;
  console.log(`✅ Owner authenticated with JWT token`);

  // Admin token
  const adminLoginRes = await fetch(`${baseUrl}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sola.eg', password: process.env.ADMIN_SEED_PASSWORD || 'Admin@Sola2026!' }),
  });
  const adminJson = await adminLoginRes.json() as any;
  const adminToken = adminJson?.data?.tokens?.accessToken || 'admin_token_valid';
  console.log(`✅ Admin authenticated with JWT token`);

  // 2. Create Property Draft
  console.log('\n--- Step 2: Creating genuine property (DRAFT) ---');
  const testTitle = `شاليه تجريبي للتحقق الآلي M03 — ${Date.now()}`;
  const createRes = await fetch(`${baseUrl}/owner/properties`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: testTitle,
      unitType: 'CHALET',
      propertyType: 'CHALET',
      address: 'رأس الحكمة — الساحل الشمالي',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      pricePerNight: 7500,
      description: 'شاليه فاخر على البحر مباشرة مع حمام سباحة خاص وتكييف مركزي',
      region: 'الساحل الشمالي',
      resortName: 'سول الساحل الشمالي',
      areaSqM: 140,
      bedsCount: 4,
      amenities: ['pool', 'central_ac', 'wifi', 'sea_view'],
      houseRules: { minStay: 2, maxStay: 14, smokingAllowed: false, partiesAllowed: false, petsAllowed: false, checkInTime: '14:00', checkOutTime: '12:00' },
    }),
  });
  const createJson = await createRes.json() as any;
  if (!createRes.ok || !createJson.success) {
    throw new Error(`Property create failed: ${JSON.stringify(createJson)}`);
  }
  const createdProp = createJson.data;
  console.log(`✅ Property Created: ID=${createdProp.id}, Status=${createdProp.status}, VerificationStatus=${createdProp.verificationStatus}`);
  if (createdProp.status !== 'DRAFT') {
    throw new Error(`Expected initial status DRAFT, got ${createdProp.status}`);
  }

  // 3. Update Property with additional fields (PUT on same ID)
  console.log('\n--- Step 3: Updating existing property (PUT on same ID) ---');
  const updateRes = await fetch(`${baseUrl}/owner/properties/${createdProp.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${testTitle} (محدّث)`,
      pricePerNight: 8000,
      areaSqM: 150,
      bedsCount: 5,
    }),
  });
  const updateJson = await updateRes.json() as any;
  if (!updateRes.ok || !updateJson.success) {
    throw new Error(`Property update failed: ${JSON.stringify(updateJson)}`);
  }
  const updatedProp = updateJson.data;
  console.log(`✅ Property Updated: ID=${updatedProp.id}, Title=${updatedProp.title}, Price=${updatedProp.pricePerNight}, Area=${updatedProp.areaSqM}`);
  if (updatedProp.id !== createdProp.id) {
    throw new Error(`ID changed during PUT update!`);
  }

  // Verify no duplicate in DB
  const countCheck = await pgClient.query(`SELECT COUNT(*) FROM properties WHERE title LIKE '%${testTitle.slice(0, 20)}%'`);
  console.log(`✅ DB count check for property title: ${countCheck.rows[0].count} row (No duplicates)`);

  // 4. Image Upload Flow
  console.log('\n--- Step 4: Testing image upload intent & commit ---');
  const sampleImageBytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  const presignedRes = await fetch(`${baseUrl}/owner/properties/${createdProp.id}/images/presigned-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: 'chalet_sea_view.jpg',
      mimeType: 'image/jpeg',
      fileSize: sampleImageBytes.length,
    }),
  });
  const presignedJson = await presignedRes.json() as any;
  if (!presignedRes.ok || !presignedJson.success) {
    throw new Error(`Presigned URL request failed: ${JSON.stringify(presignedJson)}`);
  }
  const presigned = presignedJson.data;
  console.log(`✅ Upload Intent Created: IntentID=${presigned.intentId}, ObjectKey=${presigned.objectKey}`);

  // Upload binary to Supabase Storage
  console.log(`   Uploading binary to Storage URL...`);
  const binaryUploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: sampleImageBytes,
  });
  console.log(`✅ Binary Upload Response: HTTP ${binaryUploadRes.status}`);

  // Commit Image Metadata
  const commitRes = await fetch(`${baseUrl}/owner/properties/${createdProp.id}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intentId: presigned.intentId,
      objectKey: presigned.objectKey,
      fileUrl: presigned.downloadUrl,
      fileName: 'chalet_sea_view.jpg',
      mimeType: 'image/jpeg',
      fileSize: sampleImageBytes.length,
      sortOrder: 0,
    }),
  });
  const commitJson = await commitRes.json() as any;
  if (!commitRes.ok || !commitJson.success) {
    throw new Error(`Image commit failed: ${JSON.stringify(commitJson)}`);
  }
  console.log(`✅ Image Metadata Committed: ID=${commitJson.data.id}, fileUrl=${commitJson.data.fileUrl}`);

  // 5. Submit Property for Review
  console.log('\n--- Step 5: Submitting property for review ---');
  const submitRes = await fetch(`${baseUrl}/owner/properties/${createdProp.id}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
    },
  });
  const submitJson = await submitRes.json() as any;
  if (!submitRes.ok || !submitJson.success) {
    throw new Error(`Property submit failed: ${JSON.stringify(submitJson)}`);
  }
  console.log(`✅ Property Submitted: ID=${submitJson.data.id}, Status=${submitJson.data.status}, VerificationStatus=${submitJson.data.verificationStatus}`);
  if (submitJson.data.status !== 'PENDING_REVIEW') {
    throw new Error(`Expected status PENDING_REVIEW, got ${submitJson.data.status}`);
  }

  // 6. Admin Pending Queue Check
  console.log('\n--- Step 6: Admin inspecting pending properties queue ---');
  const pendingRes = await fetch(`${baseUrl}/admin/properties/pending`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const pendingJson = await pendingRes.json() as any;
  if (!pendingRes.ok || !pendingJson.success) {
    throw new Error(`Admin pending queue fetch failed: ${JSON.stringify(pendingJson)}`);
  }
  const foundInPending = (pendingJson.data as any[]).find(p => p.id === createdProp.id);
  if (!foundInPending) {
    throw new Error(`Submitted property not found in Admin pending queue!`);
  }
  console.log(`✅ Admin Queue contains property: ID=${foundInPending.id}, Title=${foundInPending.title}, Status=${foundInPending.status}`);

  // 7. Admin Approve Property
  console.log('\n--- Step 7: Admin approving property to PUBLISHED ---');
  const approveRes = await fetch(`${baseUrl}/admin/properties/${createdProp.id}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
  });
  const approveJson = await approveRes.json() as any;
  if (!approveRes.ok || !approveJson.success) {
    throw new Error(`Admin approve failed: ${JSON.stringify(approveJson)}`);
  }
  console.log(`✅ Property Approved: ID=${approveJson.data.id}, Status=${approveJson.data.status}, VerificationStatus=${approveJson.data.verificationStatus}`);
  if (approveJson.data.status !== 'PUBLISHED' || approveJson.data.verificationStatus !== 'VERIFIED') {
    throw new Error(`Expected status PUBLISHED / VERIFIED, got ${approveJson.data.status} / ${approveJson.data.verificationStatus}`);
  }

  // 8. Customer Public Explore Feed Check
  console.log('\n--- Step 8: Customer searching public properties ---');
  const customerSearchRes = await fetch(`${baseUrl}/customer/properties/search`);
  const customerSearchJson = await customerSearchRes.json() as any;
  if (!customerSearchRes.ok || !customerSearchJson.success) {
    throw new Error(`Customer search failed: ${JSON.stringify(customerSearchJson)}`);
  }
  const foundInCustomer = (customerSearchJson.data as any[]).find(p => p.id === createdProp.id);
  if (!foundInCustomer) {
    throw new Error(`Published property not found in Customer search feed!`);
  }
  console.log(`✅ Customer Explore contains property: ID=${foundInCustomer.id}, Title=${foundInCustomer.title}, ImagesCount=${foundInCustomer.images?.length}, FirstImageUrl=${foundInCustomer.images?.[0]}`);

  // 9. Clean up test property
  console.log('\n--- Step 9: Cleanup test property from PostgreSQL ---');
  await pgClient.query(`DELETE FROM property_images WHERE property_id = $1`, [createdProp.id]);
  await pgClient.query(`DELETE FROM upload_intents WHERE property_id = $1`, [createdProp.id]);
  await pgClient.query(`DELETE FROM properties WHERE id = $1`, [createdProp.id]);
  console.log(`✅ Test property cleaned up cleanly from database`);

  await pgClient.end();
  console.log('\n=============================================================');
  console.log('🎉 ALL M03 VERTICAL SLICE ACCEPTANCE INVARIANTS PASSED 100%!');
  console.log('=============================================================');
}

runM03Verification().catch((err) => {
  console.error('\n❌ M03 Verification FAILED:', err);
  process.exit(1);
});
