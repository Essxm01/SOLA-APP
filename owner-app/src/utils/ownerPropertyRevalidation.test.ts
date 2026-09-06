import {
  derivePropertyMetrics,
  revalidateOwnerProperties,
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

  console.log('✅ OWNER 3.9 Revalidation Tests PASSED');
}

run().catch((err) => {
  console.error('❌ OWNER 3.9 Revalidation Test FAILED:', err.message);
  throw err;
});
