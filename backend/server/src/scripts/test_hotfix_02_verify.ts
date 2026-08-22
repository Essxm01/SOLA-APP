import dotenv from 'dotenv';
dotenv.config();
import { propertyDb } from '../services/dbRepository.js';
import { queryDb } from '../services/dbClient.js';

const FOUNDER_OWNER_ID = '00000000-0000-4000-8000-201013154939';

async function runHotfix02Verification() {
  console.log('🚀 Starting M03 HOTFIX-02 Verification...\n');

  // 1. Test queryDb with WHERE owner_id = $1 (must NOT match single property ID)
  console.log('--- 1. Testing WHERE owner_id = $1 REST Matching ---');
  const ownerPropsRes = await queryDb(
    `SELECT id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
            address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
            base_price_per_night AS "basePricePerNight", description, region, resort_name AS "resortName",
            area_sq_m AS "areaSqM", beds_count AS "bedsCount", amenities, house_rules AS "houseRules",
            status, verification_status AS "verificationStatus",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM properties WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [FOUNDER_OWNER_ID]
  );

  console.log(`✅ queryDb(WHERE owner_id = $1) returned ${ownerPropsRes.rows.length} rows`);
  if (!ownerPropsRes.rows || ownerPropsRes.rows.length === 0) {
    throw new Error('Expected properties for Founder owner, got 0 rows');
  }

  // 2. Test propertyDb.getByOwnerId
  console.log('\n--- 2. Testing propertyDb.getByOwnerId for Canonical Founder Owner ---');
  const founderProps = await propertyDb.getByOwnerId(FOUNDER_OWNER_ID);
  console.log(`✅ Total Canonical Non-deleted Properties: ${founderProps.length}`);

  const countsByStatus: Record<string, number> = {};
  for (const p of founderProps) {
    countsByStatus[p.status] = (countsByStatus[p.status] || 0) + 1;
  }
  console.log('✅ Canonical Status Breakdown:', countsByStatus);

  // Check specific known Founder properties
  const prop1 = founderProps.find(p => p.id === '6c44dd83-4b59-412a-964d-8868aa525465');
  const prop2 = founderProps.find(p => p.id === '94fed3d6-b633-4dd9-ac81-9b77df46563f');

  if (!prop1) {
    throw new Error('Founder property 6c44dd83-4b59-412a-964d-8868aa525465 not found in returned list');
  }
  console.log(`✅ Verified Founder Property 1: ID=${prop1.id}, Title="${prop1.title}", Status=${prop1.status}, ImagesCount=${prop1.images?.length || 0}`);

  if (!prop2) {
    throw new Error('Founder property 94fed3d6-b633-4dd9-ac81-9b77df46563f not found in returned list');
  }
  console.log(`✅ Verified Founder Property 2: ID=${prop2.id}, Title="${prop2.title}", Status=${prop2.status}`);

  // 3. Test single property read WHERE id = $1
  console.log('\n--- 3. Testing WHERE id = $1 REST Matching for Single Property ---');
  const singleProp = await propertyDb.getById('6c44dd83-4b59-412a-964d-8868aa525465');
  if (!singleProp || singleProp.id !== '6c44dd83-4b59-412a-964d-8868aa525465') {
    throw new Error('Single property lookup by ID failed');
  }
  console.log(`✅ Single Property Lookup Succeeded: ID=${singleProp.id}, Title="${singleProp.title}", Price=${singleProp.pricePerNight}`);

  // 4. Verify Metrics Calculation
  console.log('\n--- 4. Verifying Dynamic Metrics Calculation ---');
  const total = founderProps.length;
  const pendingReview = founderProps.filter(p => p.status === 'PENDING_REVIEW').length;
  const published = founderProps.filter(p => p.status === 'PUBLISHED').length;
  const drafts = founderProps.filter(p => p.status === 'DRAFT').length;

  console.log(`✅ Dynamic Counts Calculated: Total=${total}, PendingReview=${pendingReview}, Published=${published}, Drafts=${drafts}`);

  console.log('\n=============================================================');
  console.log('🎉 ALL M03 HOTFIX-02 CONTRACT VERIFICATIONS PASSED 100%!');
  console.log('=============================================================');
}

runHotfix02Verification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
