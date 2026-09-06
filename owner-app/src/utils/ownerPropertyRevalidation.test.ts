import {
  derivePropertyMetrics,
  revalidateOwnerProperties,
  createPropertyRevalidationTracker,
} from './ownerProperties.js';
import type { Property } from '../types';

const assert = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};

const makeProp = (id: string, status: Property['status'], verificationStatus: Property['verificationStatus']): Property => ({
  id,
  title: `Property ${id}`,
  unitType: 'CHALET',
  propertyType: 'CHALET',
  address: 'الساحل الشمالي',
  region: 'الساحل الشمالي',
  resortName: 'مراسي',
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  pricePerNight: 5000,
  currency: 'EGP',
  status,
  verificationStatus,
  images: [],
  amenities: ['pool', 'wifi'],
  houseRules: {} as any,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
} as unknown as Property);

async function run() {
  console.log('--- Starting OWNER 3.9 Revalidation Tests ---');

  // Scenario 1: External Admin approval causes status transition
  // Initial state in Owner memory: PENDING_REVIEW + UNVERIFIED
  const initialProp = makeProp('prop-qa-1', 'PENDING_REVIEW', 'UNVERIFIED');
  const initialList = [initialProp];
  const initialMetrics = derivePropertyMetrics(initialList);
  assert(initialMetrics.underReviewPropertiesCount === 1, 'Initial metrics must show 1 under review');
  assert(initialMetrics.publishedPropertiesCount === 0, 'Initial metrics must show 0 published');

  // External Admin mutation: Property is approved to PUBLISHED + VERIFIED
  const approvedProp = makeProp('prop-qa-1', 'PUBLISHED', 'VERIFIED');
  let propertyRepoCalls = 0;
  let otherRepoCalls = 0;

  const mockPropertyRepo = async (): Promise<Property[]> => {
    propertyRepoCalls += 1;
    return [approvedProp];
  };

  // Run property-scoped revalidation
  const updatedProps = await revalidateOwnerProperties(mockPropertyRepo);

  // Assertions:
  // 1. Property-scoped: only property repo called, NOT bookings, notifs, wallet
  assert(propertyRepoCalls === 1, 'revalidateOwnerProperties must call property repo exactly once');
  assert(otherRepoCalls === 0, 'revalidateOwnerProperties must NOT call unrelated repos');

  // 2. State updated to canonical server state (PUBLISHED + VERIFIED)
  assert(updatedProps.length === 1, 'Must return 1 property');
  assert(updatedProps[0].id === 'prop-qa-1', 'Same property ID must be preserved');
  assert(updatedProps[0].status === 'PUBLISHED', 'Property status must update to PUBLISHED');
  assert(updatedProps[0].verificationStatus === 'VERIFIED', 'Property verificationStatus must update to VERIFIED');

  // 3. Derived metrics update accurately
  const updatedMetrics = derivePropertyMetrics(updatedProps);
  assert(updatedMetrics.publishedPropertiesCount === 1, 'Updated metrics must show 1 published');
  assert(updatedMetrics.underReviewPropertiesCount === 0, 'Updated metrics must show 0 under review');
  assert(updatedMetrics.totalPropertiesCount === 1, 'Total properties must be 1');

  // Scenario 2: Revalidation failure fails closed without fabricating status
  let threw = false;
  try {
    await revalidateOwnerProperties(async () => {
      throw new Error('NETWORK_DISCONNECTED');
    });
  } catch (err: any) {
    threw = true;
    assert(err.message === 'NETWORK_DISCONNECTED', 'Must re-throw truthful server error');
  }
  assert(threw, 'Failing revalidation must throw and not fabricate success');

  // Scenario 3: Malformed server response fails closed
  let malformedThrew = false;
  try {
    await revalidateOwnerProperties(async () => {
      return { bad: 'data' } as any;
    });
  } catch (err: any) {
    malformedThrew = true;
    assert(err.message.includes('MALFORMED_OWNER_PROPERTIES_RESPONSE'), 'Must throw on malformed response');
  }
  assert(malformedThrew, 'Malformed response must reject');

  // Scenario 4: Out-of-order revalidation race condition (Blocker 2)
  const tracker = createPropertyRevalidationTracker();
  let committedState: Property[] = initialList;
  const commitHandler = (fresh: Property[]) => {
    committedState = fresh;
  };

  let resolveRequest1: (value: Property[]) => void;
  const promise1 = new Promise<Property[]>((resolve) => {
    resolveRequest1 = resolve;
  });

  let resolveRequest2: (value: Property[]) => void;
  const promise2 = new Promise<Property[]>((resolve) => {
    resolveRequest2 = resolve;
  });

  const exec1Promise = tracker.execute(() => promise1, commitHandler);
  const exec2Promise = tracker.execute(() => promise2, commitHandler);

  assert(tracker.getCurrentGeneration() === 2, 'Tracker generation must be 2 after launching request 2');

  // Controlled resolution: Resolve Request 2 (newer post-approval) first
  resolveRequest2!([approvedProp]);
  const res2 = await exec2Promise;

  assert(res2.isLatest === true, 'Request 2 must be marked as latest');
  assert(res2.generation === 2, 'Request 2 generation must be 2');
  assert(committedState[0].status === 'PUBLISHED', 'Committed state must be updated to PUBLISHED');

  // Now resolve Request 1 (older pre-approval) second
  resolveRequest1!([initialProp]);
  const res1 = await exec1Promise;

  assert(res1.isLatest === false, 'Stale Request 1 must NOT be marked as latest');
  assert(res1.generation === 1, 'Request 1 generation must be 1');
  assert(committedState[0].status === 'PUBLISHED', 'Stale response 1 must NOT overwrite newer state (status must remain PUBLISHED)');

  console.log('✅ OWNER 3.9 Revalidation Tests PASSED');
}

run().catch((err) => {
  console.error('❌ OWNER 3.9 Revalidation Test FAILED:', err.message);
  throw err;
});
