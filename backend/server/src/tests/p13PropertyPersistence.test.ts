import { strict as assert } from 'node:assert';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { imageDb, ownerDb, propertyDb } from '../services/dbRepository';

const ownerA = 'a1111111-1111-4111-8111-111111111111';
const ownerB = 'b2222222-2222-4222-8222-222222222222';
const admin = 'c3333333-3333-4333-8333-333333333333';
const headers = (id: string, role: 'ROLE_OWNER' | 'ROLE_ADMIN') => ({ authorization: `Bearer ${signAccessToken({ sub: id, role })}` });
const base = { title: 'وحدة اختبارية', unitType: 'CHALET', propertyType: 'CHALET', address: 'عنوان حقيقي', bedrooms: 2, bathrooms: 1, maxGuests: 4, pricePerNight: 2000 };
const originals = { owner: ownerDb.getById, create: propertyDb.create, byId: propertyDb.getById, byOwnerId: propertyDb.getByOwnerId, byOwnerAndId: propertyDb.getByOwnerAndId, update: propertyDb.update, updateStatus: propertyDb.updateStatus, updateStatusForOwner: propertyDb.updateStatusForOwner, admin: propertyDb.getDetailForAdmin, public: propertyDb.getAllForPublic, pending: propertyDb.getPendingForAdmin, stats: propertyDb.getAdminStats, images: imageDb.getImagesByPropertyId };

const property: any = { id: 'd4444444-4444-4444-8444-444444444444', ownerId: ownerA, ...base, basePricePerNight: 2000, status: 'DRAFT', verificationStatus: 'UNVERIFIED', images: [] };

try {
  (ownerDb as any).getById = async (id: string) => id === ownerA ? { id } : null;
  (propertyDb as any).getById = async (id: string) => id === property.id ? { ...property } : null;
  (propertyDb as any).getByOwnerAndId = async (id: string, ownerId: string) => id === property.id && ownerId === ownerA ? { ...property } : null;
  (propertyDb as any).getByOwnerId = async (ownerId: string) => ownerId === ownerA ? [{ ...property }] : [];
  (propertyDb as any).create = async (payload: any) => { Object.assign(property, payload); return { ...property }; };
  (propertyDb as any).update = async (id: string, ownerId: string, updates: any) => id === property.id && ownerId === ownerA ? Object.assign(property, updates) : null;
  (propertyDb as any).updateStatusForOwner = async (id: string, ownerId: string, status: string, verificationStatus?: string) => id === property.id && ownerId === ownerA ? Object.assign(property, { status, verificationStatus: verificationStatus ?? property.verificationStatus }) : null;
  (propertyDb as any).getDetailForAdmin = async (id: string) => id === property.id ? { ...property } : null;
  (propertyDb as any).updateStatus = async (id: string, status: string, verificationStatus: string) => id === property.id ? Object.assign(property, { status, verificationStatus }) : null;
  (propertyDb as any).getAllForPublic = async () => property.status === 'PUBLISHED' && property.verificationStatus === 'VERIFIED' ? [{ ...property }] : [];
  (propertyDb as any).getPendingForAdmin = async () => property.status === 'PENDING_REVIEW' || (property.status === 'DRAFT' && property.verificationStatus === 'REJECTED') ? [{ ...property }] : [];
  (propertyDb as any).getAdminStats = async () => ({ pendingReview: property.status === 'PENDING_REVIEW' ? 1 : 0, published: property.status === 'PUBLISHED' ? 1 : 0, rejected: property.status === 'DRAFT' && property.verificationStatus === 'REJECTED' ? 1 : 0, total: 1 });
  (imageDb as any).getImagesByPropertyId = async () => property.images;
  const app = new ExpressServerApp();

  const empty = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers(ownerA, 'ROLE_OWNER'), {});
  assert.equal(empty.statusCode, 400, 'empty create must fail closed');
  const create = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers(ownerA, 'ROLE_OWNER'), { ...base, id: ownerB });
  assert.equal(create.statusCode, 201); assert.notEqual((create.body as any).data.id, ownerB, 'server must ignore client property ID');

  property.id = 'd4444444-4444-4444-8444-444444444444'; property.ownerId = ownerA; property.status = 'DRAFT'; property.verificationStatus = 'UNVERIFIED'; property.images = [];
  const foreignEdit = await app.handleHttpRequest('PUT', `/api/v1/owner/properties/${property.id}`, headers(ownerB, 'ROLE_OWNER'), { title: 'اختراق' });
  assert.equal(foreignEdit.statusCode, 403, 'cross-owner edit must be denied');
  const lifecycleWrite = await app.handleHttpRequest('PUT', `/api/v1/owner/properties/${property.id}`, headers(ownerA, 'ROLE_OWNER'), { status: 'PUBLISHED' });
  assert.equal(lifecycleWrite.statusCode, 400, 'owner edit cannot publish');
  const missingImageSubmit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${property.id}/submit`, headers(ownerA, 'ROLE_OWNER'));
  assert.equal(missingImageSubmit.statusCode, 400, 'draft without committed image cannot submit');
  property.images = [{ id: 'image-1' }];
  const submit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${property.id}/submit`, headers(ownerA, 'ROLE_OWNER'));
  assert.equal(submit.statusCode, 200); assert.equal(property.status, 'PENDING_REVIEW'); assert.equal(property.verificationStatus, 'PENDING_VERIFICATION');
  const reject = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/review`, headers(admin, 'ROLE_ADMIN'), { decision: 'REJECTED', reviewNotes: 'تحتاج صورة أوضح' });
  assert.equal(reject.statusCode, 200); assert.equal(property.status, 'DRAFT'); assert.equal(property.verificationStatus, 'REJECTED', 'rejection is schema-valid DRAFT + REJECTED verification');
  const hidden = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', {}, undefined);
  assert.equal((hidden.body as any).data.length, 0, 'rejected property is never public');
  const rejectedQueue = await app.handleHttpRequest('GET', '/api/v1/admin/properties/pending', headers(admin, 'ROLE_ADMIN'));
  assert.equal(rejectedQueue.statusCode, 200); assert.equal((rejectedQueue.body as any).data.length, 1, 'rejected DRAFT is represented in the Admin queue');
  const rejectedStats = await (propertyDb as any).getAdminStats();
  assert.equal(rejectedStats.rejected, 1); assert.equal(rejectedStats.pendingReview, 0, 'rejected DRAFT is not a pending-review metric');
  const rejectedAgain = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/review`, headers(admin, 'ROLE_ADMIN'), { decision: 'PUBLISHED' });
  assert.equal(rejectedAgain.statusCode, 409, 'rejected DRAFT cannot be reviewed again before Owner resubmits');
  const rejectedDirectApprove = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/approve`, headers(admin, 'ROLE_ADMIN'), {});
  assert.equal(rejectedDirectApprove.statusCode, 409, 'legacy approve route shares the pending-review state guard');
  const resubmit = await app.handleHttpRequest('POST', `/api/v1/owner/properties/${property.id}/submit`, headers(ownerA, 'ROLE_OWNER'));
  assert.equal(resubmit.statusCode, 200); assert.equal(property.status, 'PENDING_REVIEW'); assert.equal(property.verificationStatus, 'PENDING_VERIFICATION', 'resubmission returns rejected property to pending review');
  property.status = 'PENDING_REVIEW'; property.verificationStatus = 'PENDING_VERIFICATION';
  const prematureApprove = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/approve`, headers(admin, 'ROLE_ADMIN'), {});
  assert.equal(prematureApprove.statusCode, 200, 'legacy approve route remains reachable for pending review');
  assert.equal(property.status, 'PUBLISHED'); assert.equal(property.verificationStatus, 'VERIFIED');
  const publicSearch = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', {}, undefined);
  assert.equal((publicSearch.body as any).data.length, 1, 'only published + verified property is public');

  // Admin DB Failure vs 404 Truthfulness Regressions (Finding 3)
  const missingPropId = 'e0000000-0000-4000-8000-000000000000';
  (propertyDb as any).getDetailForAdmin = async (id: string) => id === property.id ? { ...property } : null;

  // Case B: Successful query, missing record -> 404
  const adminDetailNotFound = await app.handleHttpRequest('GET', `/api/v1/admin/properties/${missingPropId}`, headers(admin, 'ROLE_ADMIN'));
  assert.equal(adminDetailNotFound.statusCode, 404, 'missing property in admin detail returns 404');
  assert.equal((adminDetailNotFound.body as any).error.code, 'PROPERTY_NOT_FOUND');

  const adminApproveNotFound = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${missingPropId}/approve`, headers(admin, 'ROLE_ADMIN'), {});
  assert.equal(adminApproveNotFound.statusCode, 404, 'missing property in admin approve returns 404');
  assert.equal((adminApproveNotFound.body as any).error.code, 'PROPERTY_NOT_FOUND');

  const adminReviewNotFound = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${missingPropId}/review`, headers(admin, 'ROLE_ADMIN'), { decision: 'PUBLISHED' });
  assert.equal(adminReviewNotFound.statusCode, 404, 'missing property in admin review returns 404');
  assert.equal((adminReviewNotFound.body as any).error.code, 'PROPERTY_NOT_FOUND');

  // Case A: Query failure -> 500 (NOT 404)
  (propertyDb as any).getDetailForAdmin = async () => { throw new Error('database connection failure'); };

  const adminDetailDbFailure = await app.handleHttpRequest('GET', `/api/v1/admin/properties/${property.id}`, headers(admin, 'ROLE_ADMIN'));
  assert.equal(adminDetailDbFailure.statusCode, 500, 'database failure in admin detail returns 500');
  assert.equal((adminDetailDbFailure.body as any).error.code, 'PROPERTY_QUERY_FAILED');

  const adminApproveDbFailure = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/approve`, headers(admin, 'ROLE_ADMIN'), {});
  assert.equal(adminApproveDbFailure.statusCode, 500, 'database failure in admin approve returns 500');
  assert.equal((adminApproveDbFailure.body as any).error.code, 'PROPERTY_QUERY_FAILED');

  const adminReviewDbFailure = await app.handleHttpRequest('POST', `/api/v1/admin/properties/${property.id}/review`, headers(admin, 'ROLE_ADMIN'), { decision: 'PUBLISHED' });
  assert.equal(adminReviewDbFailure.statusCode, 500, 'database failure in admin review returns 500');
  assert.equal((adminReviewDbFailure.body as any).error.code, 'PROPERTY_QUERY_FAILED');

  // Property-create owner existence read: DB failure is a truthful 5xx, a
  // successful empty read keeps the domain 403.
  (ownerDb as any).getById = async () => { throw new Error('database unavailable'); };
  const ownerQueryFailure = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers(ownerA, 'ROLE_OWNER'), { ...base });
  assert.equal(ownerQueryFailure.statusCode, 500, 'owner DB failure is not reported as OWNER_NOT_FOUND');
  assert.equal((ownerQueryFailure.body as any).error.code, 'OWNER_QUERY_FAILED');
  (ownerDb as any).getById = async () => null;
  const ownerMissing = await app.handleHttpRequest('POST', '/api/v1/owner/properties', headers(ownerA, 'ROLE_OWNER'), { ...base });
  assert.equal(ownerMissing.statusCode, 403, 'successful empty owner read keeps the canonical 403');
  assert.equal((ownerMissing.body as any).error.code, 'OWNER_NOT_FOUND');

  console.log('P1.3 property persistence behavioral suite passed');
} finally {
  (ownerDb as any).getById = originals.owner; (propertyDb as any).create = originals.create; (propertyDb as any).getById = originals.byId;
  (propertyDb as any).getByOwnerId = originals.byOwnerId; (propertyDb as any).getByOwnerAndId = originals.byOwnerAndId; (propertyDb as any).update = originals.update;
  (propertyDb as any).updateStatus = originals.updateStatus; (propertyDb as any).updateStatusForOwner = originals.updateStatusForOwner;
  (propertyDb as any).getDetailForAdmin = originals.admin; (propertyDb as any).getAllForPublic = originals.public; (propertyDb as any).getPendingForAdmin = originals.pending; (propertyDb as any).getAdminStats = originals.stats; (imageDb as any).getImagesByPropertyId = originals.images;
}
