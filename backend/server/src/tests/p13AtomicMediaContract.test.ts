import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

type Intent = { id: string; ownerId: string; propertyId: string; objectKey: string; status: 'PENDING_UPLOAD' | 'COMMITTED'; expiresAt: number };
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
    if (this.image) {
      if (this.image.ownerId !== ownerId || this.image.propertyId !== propertyId || this.image.objectKey !== objectKey) throw new Error('PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH');
      if (this.intent.status !== 'COMMITTED') throw new Error('MEDIA_COMMIT_INCONSISTENT');
      return this.image;
    }
    if (this.intent.ownerId !== ownerId || this.intent.propertyId !== propertyId || this.intent.objectKey !== objectKey) throw new Error('PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH');
    if (this.intent.status === 'COMMITTED') throw new Error('MEDIA_COMMIT_INCONSISTENT');
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

const activePending = make(); activePending.image = { id: 'orphan-image', uploadIntentId: activePending.intent.id, ownerId, propertyId, objectKey };
assert.throws(() => activePending.commit(ownerId, propertyId, objectKey), /MEDIA_COMMIT_INCONSISTENT/);
const committedMissing = make(); committedMissing.intent.status = 'COMMITTED';
assert.throws(() => committedMissing.commit(ownerId, propertyId, objectKey), /MEDIA_COMMIT_INCONSISTENT/);

const migration = fs.readFileSync(path.resolve('database/migrations/024_atomic_property_media_commit.sql'), 'utf8');
for (const required of ['BEGIN;', 'COMMIT;', 'konfrm_commit_property_media', 'FOR UPDATE', "status = 'COMMITTED'", 'property_images_one_active_per_upload_intent_idx', 'SECURITY INVOKER', 'REVOKE ALL', 'GRANT EXECUTE', 'schema_migrations', 'MEDIA_COMMIT_INCONSISTENT']) {
  assert.ok(migration.includes(required), `atomic migration must contain ${required}`);
}
for (const requiredCast of ['v_image.file_name::text', 'v_image.mime_type::text', 'v_image.sha256_checksum::text', 'v_image.status::text']) {
  assert.ok(migration.includes(requiredCast), `atomic RPC must cast ${requiredCast} to its declared text result type`);
}

// PL/pgSQL ambiguity regression guard. The RETURNS TABLE outputs "id" and
// "status" are function variables, so any unqualified id/status column
// reference in an expression position is an ambiguous-name runtime error.
// Every such reference must stay alias-qualified.
const bodyStart = migration.indexOf('AS $$');
const body = migration.slice(bodyStart + 'AS $$'.length, migration.indexOf('$$;', bodyStart));
for (const requiredQualified of [
  'FROM public.upload_intents ui',
  'ui.id = p_upload_intent_id',          // upload_intents id lookup + UPDATE id predicate
  'FROM public.property_images pi',
  'pi.status = \'ACTIVE\'',              // property_images status predicate
  'FROM public.properties p',
  'p.id = p_property_id',                // properties id predicate
  'ui.status = \'PENDING_UPLOAD\'',      // upload_intents UPDATE status predicate
]) {
  assert.ok(body.includes(requiredQualified), `function body must contain qualified reference: ${requiredQualified}`);
}
const bodyLines = body.split('\n');
const insertListStart = bodyLines.findIndex((l) => l.includes('INSERT INTO public.property_images ('));
const insertListEnd = bodyLines.findIndex((l, idx) => idx > insertListStart && l.includes(') VALUES ('));
const ambiguousRefs: string[] = [];
bodyLines.forEach((rawLine, idx) => {
  const line = rawLine.split('--')[0].trim();
  if (!line || !/(?<![.\w])(id|status)\b/.test(line)) return;
  // UPDATE SET's left side is a target-column name position, not an expression;
  // INSERT's column list is likewise a name position. Both stay unqualified.
  if (/^SET\s+status\s*=/.test(line)) return;
  if (insertListStart >= 0 && idx > insertListStart && idx < insertListEnd && /^[\w\s,]+$/.test(line)) return;
  ambiguousRefs.push(`line ${idx + 1}: ${line}`);
});
assert.deepEqual(ambiguousRefs, [], 'function body must not reference id/status columns unqualified outside name positions');

console.log('P1.3 atomic property-media contract suite passed');
