import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const app = new ExpressServerApp();
  const customerToken = signAccessToken({ sub: 'customer-truthful-state', role: 'ROLE_CUSTOMER', phone: '+201000000099' });

  const paymentsUnauthenticated = await app.handleHttpRequest('GET', '/api/v1/customer/payments');
  assert(paymentsUnauthenticated.statusCode === 401, 'customer payments requires canonical Customer authentication');

  const propertyFailure = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search');
  assert(
    propertyFailure.statusCode === 500 && (propertyFailure.body as any).error?.code === 'CUSTOMER_PROPERTIES_QUERY_FAILED',
    'property database failure must not be converted into a successful empty collection',
  );

  const paymentsFailure = await app.handleHttpRequest('GET', '/api/v1/customer/payments', {
    authorization: `Bearer ${customerToken}`,
  });
  assert(
    paymentsFailure.statusCode === 500 && (paymentsFailure.body as any).error?.code === 'CUSTOMER_PAYMENTS_QUERY_FAILED',
    'payment database failure must not be converted into a successful empty collection',
  );

  console.log('CUSTOMER-TRUTHFUL-STATE-01 backend contract tests passed');
}

run().catch((error) => {
  console.error(error);
  throw error;
});
