import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { uploadIntentDb, imageDb, propertyDb, ownerDb } from '../services/dbRepository.js';
import { createStorageProvider } from '../services/storageProvider.js';

const FOUNDER_OWNER_ID = '00000000-0000-4000-8000-201013154939';
const FOUNDER_DRAFT_ID = 'c9aa5184-bc05-426b-ae7d-0757fbaf2ff6';

async function runHotfix01Verification() {
  console.log('🚀 Starting M03 HOTFIX-01 REST & Live Verification...\n');

  // Verify Environment & Supabase Client
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Verify Founder Owner & Draft exist in Supabase
  console.log('--- 1. Checking Founder Owner & Draft existence ---');
  const { data: ownerRow, error: ownerErr } = await supabase
    .from('owners')
    .select('id, phone_number, full_name, verification_status')
    .eq('id', FOUNDER_OWNER_ID)
    .single();

  if (ownerErr || !ownerRow) {
    throw new Error(`Founder owner not found: ${JSON.stringify(ownerErr)}`);
  }
  console.log(`✅ Founder Owner Found: ID=${ownerRow.id}, Phone=${ownerRow.phone_number}, Name=${ownerRow.full_name}`);

  const { data: draftRow, error: draftErr } = await supabase
    .from('properties')
    .select('*')
    .eq('id', FOUNDER_DRAFT_ID)
    .eq('owner_id', FOUNDER_OWNER_ID)
    .single();

  if (draftErr || !draftRow) {
    throw new Error(`Founder draft not found: ${JSON.stringify(draftErr)}`);
  }
  console.log(`✅ Founder Draft Found: ID=${draftRow.id}, Title=${draftRow.title}, Status=${draftRow.status}, Area=${draftRow.area_sq_m}`);

  // 2. Test Dynamic Property UPDATE via Supabase REST (Non-destructive probe)
  console.log('\n--- 2. Testing Dynamic Property UPDATE REST Path ---');
  const originalArea = draftRow.area_sq_m;
  const originalResort = draftRow.resort_name;
  const probeArea = (originalArea || 100) + 1;

  console.log(`   Applying probe update (areaSqM: ${probeArea})...`);
  const updatedProp = await propertyDb.update(FOUNDER_DRAFT_ID, FOUNDER_OWNER_ID, {
    areaSqM: probeArea,
  });

  if (!updatedProp || updatedProp.areaSqM !== probeArea) {
    throw new Error(`Property UPDATE REST failed: ${JSON.stringify(updatedProp)}`);
  }
  console.log(`✅ Property UPDATE REST Succeeded: ID=${updatedProp.id}, areaSqM=${updatedProp.areaSqM}`);

  console.log(`   Restoring original property values (areaSqM: ${originalArea})...`);
  const restoredProp = await propertyDb.update(FOUNDER_DRAFT_ID, FOUNDER_OWNER_ID, {
    areaSqM: originalArea,
    resortName: originalResort,
  });
  console.log(`✅ Property Restored Cleanly: ID=${restoredProp?.id}, areaSqM=${restoredProp?.areaSqM}`);

  // 3. Test upload_intents INSERT via REST
  console.log('\n--- 3. Testing upload_intents INSERT REST Path ---');
  const idempotencyKey = `hotfix_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const objectKey = `properties/${FOUNDER_DRAFT_ID}/probe_${Date.now()}.jpg`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const intent = await uploadIntentDb.createIntent({
    ownerId: FOUNDER_OWNER_ID,
    propertyId: FOUNDER_DRAFT_ID,
    objectKey,
    mimeType: 'image/jpeg',
    sizeBytes: 124,
    idempotencyKey,
    expiresAt,
  });

  if (!intent || !intent.id || intent.status !== 'PENDING_UPLOAD') {
    throw new Error(`upload_intents INSERT failed: ${JSON.stringify(intent)}`);
  }
  console.log(`✅ upload_intents INSERT Succeeded: ID=${intent.id}, Status=${intent.status}, IntentNumber=${intent.intentNumber}`);

  // 4. Test upload_intents SELECT BY ID
  console.log('\n--- 4. Testing upload_intents SELECT BY ID REST Path ---');
  const fetchedIntent = await uploadIntentDb.getIntentById(intent.id);
  if (!fetchedIntent || fetchedIntent.id !== intent.id) {
    throw new Error(`upload_intents SELECT BY ID failed: ${JSON.stringify(fetchedIntent)}`);
  }
  console.log(`✅ upload_intents SELECT Succeeded: ID=${fetchedIntent.id}, ObjectKey=${fetchedIntent.objectKey}`);

  // 5. Test Live Supabase Signed Upload URL & Binary PUT
  console.log('\n--- 5. Testing Supabase Storage Signed Upload & Binary PUT ---');
  const storage = createStorageProvider();
  const presigned = await storage.generateSignedUploadUrl({
    intentId: intent.id,
    ownerId: FOUNDER_OWNER_ID,
    propertyId: FOUNDER_DRAFT_ID,
    objectKey,
    mimeType: 'image/jpeg',
    sizeBytes: 124,
    expiresAt,
  });

  console.log(`   Generated Signed Upload URL: ${presigned.uploadUrl.slice(0, 80)}...`);
  const sampleImageBytes = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
    0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
    0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08,
  ]);

  const uploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: sampleImageBytes,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`Binary upload failed: HTTP ${uploadRes.status} — ${errText}`);
  }
  console.log(`✅ Binary Upload Succeeded: HTTP ${uploadRes.status}`);

  const verification = await storage.verifyObjectExists(objectKey);
  if (!verification.exists) {
    throw new Error(`Storage object verification failed: ${objectKey} not found`);
  }
  console.log(`✅ Storage Object Exists in Supabase: ${objectKey}`);

  // 6. Test upload_intents COMMIT via REST
  console.log('\n--- 6. Testing upload_intents COMMIT REST Path ---');
  const committedIntent = await uploadIntentDb.commitIntent(intent.id);
  if (!committedIntent || committedIntent.status !== 'COMMITTED') {
    throw new Error(`upload_intents COMMIT failed: ${JSON.stringify(committedIntent)}`);
  }
  console.log(`✅ upload_intents COMMIT Succeeded: ID=${committedIntent.id}, Status=${committedIntent.status}`);

  // 7. Test property_images INSERT via REST
  console.log('\n--- 7. Testing property_images INSERT REST Path ---');
  const fileUrl = `${supabaseUrl}/storage/v1/object/public/property-media/${objectKey}`;
  const imageRow = await imageDb.addImage({
    propertyId: FOUNDER_DRAFT_ID,
    ownerId: FOUNDER_OWNER_ID,
    objectKey,
    fileUrl,
    fileName: 'probe_test.jpg',
    mimeType: 'image/jpeg',
    fileSize: 124,
    sortOrder: 0,
    uploadIntentId: intent.id,
  });

  if (!imageRow || !imageRow.id || imageRow.status !== 'ACTIVE') {
    throw new Error(`property_images INSERT failed: ${JSON.stringify(imageRow)}`);
  }
  console.log(`✅ property_images INSERT Succeeded: ID=${imageRow.id}, fileUrl=${imageRow.fileUrl}, Status=${imageRow.status}`);

  // 8. Test property_images DELETE via REST & Storage Cleanup
  console.log('\n--- 8. Testing property_images DELETE REST Path & Cleanup ---');
  const deletedImage = await imageDb.deleteImage(imageRow.id, FOUNDER_OWNER_ID);
  if (!deletedImage || deletedImage.id !== imageRow.id) {
    throw new Error(`property_images DELETE failed: ${JSON.stringify(deletedImage)}`);
  }
  console.log(`✅ property_images DELETE Succeeded: ID=${deletedImage.id}`);

  // Cleanup Storage Object
  await storage.deleteObject(objectKey);
  console.log(`✅ Temporary Storage Object Cleaned Up: ${objectKey}`);

  // Cleanup upload_intent row
  await supabase.from('upload_intents').delete().eq('id', intent.id);
  await supabase.from('property_images').delete().eq('id', imageRow.id);
  console.log(`✅ Probe database rows cleaned up cleanly`);

  console.log('\n=============================================================');
  console.log('🎉 ALL M03 HOTFIX-01 REST & LIVE INVARIANTS PASSED 100%!');
  console.log('=============================================================');
}

runHotfix01Verification().catch((err) => {
  console.error('❌ M03 HOTFIX-01 Verification FAILED:', err);
  process.exit(1);
});
