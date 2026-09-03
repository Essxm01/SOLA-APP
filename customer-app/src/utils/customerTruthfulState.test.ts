import { fetchCanonicalCollection, type CustomerFetch } from './customerTruthfulState.js';
import { buildPublicPropertySearchPath } from './publicPropertySearch.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const testUrl = (path: string) => path;

async function run() {
  const properties = await fetchCanonicalCollection<{ id: string }>('/customer/properties/search', undefined, async () => jsonResponse({ success: true, data: [{ id: 'property-1' }] }), testUrl);
  assert(properties.kind === 'success' && properties.data.length === 1, 'successful property response must render canonical properties');

  const inventoryEmpty = await fetchCanonicalCollection('/customer/properties/search', undefined, async () => jsonResponse({ success: true, data: [] }), testUrl);
  assert(inventoryEmpty.kind === 'success' && inventoryEmpty.data.length === 0, 'only successful empty inventory may render an Explore empty state');

  const propertyHttpFailure = await fetchCanonicalCollection('/customer/properties/search', undefined, async () => jsonResponse({ success: false }, 500), testUrl);
  assert(propertyHttpFailure.kind === 'error', 'property HTTP/API failure must not become an empty result');

  const propertyNetworkFailure = await fetchCanonicalCollection('/customer/properties/search', undefined, async () => { throw new Error('network'); }, testUrl);
  assert(propertyNetworkFailure.kind === 'error', 'property network failure must not become an empty result');

  const malformed = await fetchCanonicalCollection('/customer/properties/search', undefined, async () => new Response('<html>bad gateway</html>', { status: 502 }), testUrl);
  assert(malformed.kind === 'error', 'malformed property response must be an error');

  const unauthorizedPayments = await fetchCanonicalCollection('/customer/payments', { headers: { Authorization: 'Bearer expired' } }, async () => jsonResponse({ success: false }, 401), testUrl);
  assert(unauthorizedPayments.kind === 'unauthorized', 'unauthorized payment history must not render empty');

  for (const status of [404, 500]) {
    const failedPayments = await fetchCanonicalCollection('/customer/payments', undefined, async () => jsonResponse({ success: false }, status), testUrl);
    assert(failedPayments.kind === 'error', `payment HTTP ${status} must not become empty`);
  }

  const paymentEmpty = await fetchCanonicalCollection('/customer/payments', undefined, async () => jsonResponse({ success: true, data: [] }), testUrl);
  assert(paymentEmpty.kind === 'success' && paymentEmpty.data.length === 0, 'only successful empty payment collection may render no payments');

  let attempts = 0;
  const retryFetch: CustomerFetch = async () => {
    attempts += 1;
    return attempts === 1
      ? jsonResponse({ success: false }, 503)
      : jsonResponse({ success: true, data: [{ id: 'payment-1' }] });
  };
  const failedRetry = await fetchCanonicalCollection('/customer/payments', undefined, retryFetch, testUrl);
  const recoveredRetry = await fetchCanonicalCollection<{ id: string }>('/customer/payments', undefined, retryFetch, testUrl);
  assert(failedRetry.kind === 'error' && recoveredRetry.kind === 'success' && recoveredRetry.data[0]?.id === 'payment-1', 'retry must recover with canonical payment records');

  assert(buildPublicPropertySearchPath() === '/customer/properties/search', 'empty filters must return base search path');
  assert(
    buildPublicPropertySearchPath({ destination: 'مراسي', unitType: 'CHALET', totalGuests: 4, maxPrice: 25000 }) ===
      '/customer/properties/search?destination=%D9%85%D8%B1%D8%A7%D8%B3%D9%8A&unitType=CHALET&guests=4&maxPrice=25000',
    'full filters must serialize to canonical query parameters'
  );
  assert(
    buildPublicPropertySearchPath({ destination: '', unitType: 'ALL' }) === '/customer/properties/search',
    'empty destination and unitType ALL must return base search path'
  );

  console.log('CUSTOMER-TRUTHFUL-STATE-01 focused client state tests passed');
}

run().catch((error) => {
  console.error(error);
  throw error;
});
