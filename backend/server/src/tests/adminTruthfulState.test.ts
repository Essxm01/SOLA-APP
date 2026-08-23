import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const app = new ExpressServerApp();
  const validToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000001',
    role: 'ROLE_ADMIN',
    phone: 'admin@sola.com',
  });

  const validated = await app.handleHttpRequest('GET', '/api/v1/admin/auth/session', {
    authorization: `Bearer ${validToken}`,
  });
  assert(validated.statusCode === 200 && validated.body.success === true, 'valid Admin token must validate canonically');
  assert((validated.body as any).data.admin.id === '00000000-0000-0000-0000-000000000001', 'session validation must return canonical Admin identity');

  const invalid = await app.handleHttpRequest('GET', '/api/v1/admin/auth/session', {
    authorization: 'Bearer expired-or-invalid-token',
  });
  assert(invalid.statusCode === 401, 'invalid Admin token must not validate');

  const ownerToken = signAccessToken({ sub: 'owner-1', role: 'ROLE_OWNER' });
  const foreignRole = await app.handleHttpRequest('GET', '/api/v1/admin/auth/session', {
    authorization: `Bearer ${ownerToken}`,
  });
  assert(foreignRole.statusCode === 403, 'non-Admin token must not validate as Admin');

  console.log('ADMIN-TRUTHFUL-STATE-01 backend session validation tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
