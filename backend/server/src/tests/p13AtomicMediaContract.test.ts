import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

type Intent = { id: string; ownerId: string; propertyId: string; objectKey: string; status: 'PENDING_UPLOAD' | 'COMMITTED' | 'EXPIRED' | 'CANCELLED'; expiresAt: number };
type Image = { id: string; uploadIntentId: string; ownerId: string; propertyId: string; objectKey: string };

// This isolated model mirrors the database function contract. The separate
// Worker-adapter suite proves the real repository invokes that RPC; this suite
// proves the transaction boundary expected from the migration, including replay
// and forced-failure no-half-state behavior, without a live database.
class AtomicMediaModel {
  intent: Intent;
  image: Image | null = null;
  failAfterValidation = false;
  constructor(intent: Intent) { this.intent = { ...intent }; }
  commit(ownerId: string, propertyId: string, objectKey: string) {
    if (this.intent.ownerId !== ownerId || this.intent.propertyId !== propertyId || this.intent.objectKey !== objectKey) throw new Error('PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH');
    if (this.image && (this.image.ownerId !== ownerId || this.image.propertyId !== propertyId || this.image.objectKey !== objectKey)) throw new Error('PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH');
    if (this.intent.status === 'COMMITTED') {
      if (!this.image) throw new Error('MEDIA_COMMIT_INCONSISTENT');
      return this.image;
    }
    if (this.image) throw new Error('MEDIA_COMMIT_INCONSISTENT');
    if (this.intent.status !== 'PENDING_UPLOAD') throw new Error('UPLOAD_INTENT_NOT_PENDING');
    if (this.intent.expiresAt <= Date.now()) throw new Error('UPLOAD_INTENT_EXPIRED');
    if (this.failAfterValidation) throw new Error('FORCED_DATABASE_FAILURE');
    const image = { id: 'image-1', uploadIntentId: this.intent.id, ownerId, propertyId, objectKey };
    // The model only publishes either state after every validation succeeds.
    this.image = image;
    this.intent.status = 'COMMITTED';
    return image;
  }
}

const ownerId = 'a1111111-1111-4111-8111-111111111111';
const otherOwnerId = 'b2222222-2222-4222-8222-222222222222';
const propertyId = 'd4444444-4444-4444-8444-444444444444';
const objectKey = `properties/${propertyId}/image.png`;
const make = () => new AtomicMediaModel({ id: 'intent-1', ownerId, propertyId, objectKey, status: 'PENDING_UPLOAD', expiresAt: Date.now() + 60_000 });

const first = make();
const canonical = first.commit(ownerId, propertyId, objectKey);
assert.equal(first.intent.status, 'COMMITTED');
assert.equal(first.image?.id, canonical.id);
assert.equal(first.commit(ownerId, propertyId, objectKey), canonical, 'replay returns canonical image');

const double = make();
const [a, b] = await Promise.all([Promise.resolve().then(() => double.commit(ownerId, propertyId, objectKey)), Promise.resolve().then(() => double.commit(ownerId, propertyId, objectKey))]);
assert.equal(a.id, b.id); assert.equal(double.image?.id, 'image-1');

for (const [badOwner, badProperty, badKey] of [[otherOwnerId, propertyId, objectKey], [ownerId, 'other-property', objectKey], [ownerId, propertyId, 'wrong-key']]) {
  const model = make();
  assert.throws(() => model.commit(badOwner, badProperty, badKey), /BINDING_MISMATCH/);
  assert.equal(model.image, null); assert.equal(model.intent.status, 'PENDING_UPLOAD');
}

const expired = make(); expired.intent.expiresAt = Date.now() - 1;
assert.throws(() => expired.commit(ownerId, propertyId, objectKey), /EXPIRED/);
assert.equal(expired.image, null); assert.equal(expired.intent.status, 'PENDING_UPLOAD');

const failed = make(); failed.failAfterValidation = true;
assert.throws(() => failed.commit(ownerId, propertyId, objectKey), /FORCED_DATABASE_FAILURE/);
assert.equal(failed.image, null); assert.equal(failed.intent.status, 'PENDING_UPLOAD', 'forced failure has no active image + pending intent half-state');

for (const status of ['PENDING_UPLOAD', 'EXPIRED', 'CANCELLED'] as const) {
  const inconsistent = make(); inconsistent.intent.status = status; inconsistent.image = { ...canonical };
  assert.throws(() => inconsistent.commit(ownerId, propertyId, objectKey), /MEDIA_COMMIT_INCONSISTENT/, `active image + ${status} must fail`);
}
const missingImage = make(); missingImage.intent.status = 'COMMITTED';
assert.throws(() => missingImage.commit(ownerId, propertyId, objectKey), /MEDIA_COMMIT_INCONSISTENT/, 'committed intent without active image must fail');
const badImageBinding = make(); badImageBinding.intent.status = 'COMMITTED'; badImageBinding.image = { ...canonical, objectKey: 'wrong-key' };
assert.throws(() => badImageBinding.commit(ownerId, propertyId, objectKey), /BINDING_MISMATCH/, 'active image binding mismatch must fail');

const migration = fs.readFileSync(path.resolve('database/migrations/024_atomic_property_media_commit.sql'), 'utf8');
for (const required of ['BEGIN;', 'konfrm_commit_property_media', 'FOR UPDATE', "status = 'COMMITTED'", 'MEDIA_COMMIT_INCONSISTENT', 'property_images_one_active_per_upload_intent_idx', 'SECURITY INVOKER', 'SET search_path = public, pg_temp', 'REVOKE ALL', 'FROM PUBLIC, anon, authenticated', 'TO service_role', "VALUES ('024_atomic_property_media_commit.sql')", 'COMMIT;']) {
  assert.ok(migration.includes(required), `atomic migration must contain ${required}`);
}

console.log('P1.3 atomic property-media contract suite passed');
