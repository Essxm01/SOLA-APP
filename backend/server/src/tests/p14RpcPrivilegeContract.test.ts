import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assessCriticalRpcPrivilegeContract,
  criticalRpcSignatures,
  type CriticalRpcPrivilegeMetadata,
} from '../security/criticalRpcPrivilegeContract.js';

const root = new URL('../../../../', import.meta.url);

function secureFixture(): CriticalRpcPrivilegeMetadata[] {
  return criticalRpcSignatures.map((signature) => ({
    signature,
    securityDefiner: true,
    publicExecute: false,
    anonExecute: false,
    authenticatedExecute: false,
    serviceRoleExecute: true,
  }));
}

async function run() {
  assert.deepEqual(assessCriticalRpcPrivilegeContract(secureFixture()), []);

  const unsafe = secureFixture();
  unsafe[0] = { ...unsafe[0], publicExecute: true, anonExecute: true, authenticatedExecute: true };
  const unsafeViolations = assessCriticalRpcPrivilegeContract(unsafe);
  assert.deepEqual(
    unsafeViolations.map((violation) => violation.reason),
    ['PUBLIC_EXECUTE_FORBIDDEN', 'ANON_EXECUTE_FORBIDDEN', 'AUTHENTICATED_EXECUTE_FORBIDDEN'],
  );

  const missingServiceRole = secureFixture();
  missingServiceRole[1] = { ...missingServiceRole[1], serviceRoleExecute: false };
  assert.deepEqual(
    assessCriticalRpcPrivilegeContract(missingServiceRole).map((violation) => violation.reason),
    ['SERVICE_ROLE_EXECUTE_REQUIRED'],
  );

  const [migration, disputeMigration] = await Promise.all([
    readFile(new URL('backend/database/migrations/021_harden_critical_rpc_privileges.sql', root), 'utf8'),
    readFile(new URL('backend/database/migrations/009_flow_adm_09_disputes_execution.sql', root), 'utf8'),
  ]);

  for (const signature of criticalRpcSignatures) {
    const [name] = signature.split('(');
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(`, 'i'));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(`, 'i'));
  }
  assert.match(migration, /FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.rls_auto_enable\(\) FROM PUBLIC, anon, authenticated, service_role/i);
  assert.match(migration, /ALTER FUNCTION public\.prevent_dispute_evidence_mutation\(\)\s+SET search_path = pg_catalog/i);
  assert.doesNotMatch(migration, /ALTER DEFAULT PRIVILEGES/i);
  assert.doesNotMatch(migration, /CREATE POLICY|ALTER TABLE .* DISABLE ROW LEVEL SECURITY|FORCE ROW LEVEL SECURITY/i);
  assert.match(disputeMigration, /CREATE OR REPLACE FUNCTION prevent_dispute_evidence_mutation\(\)[\s\S]*RAISE EXCEPTION/i);
  assert.match(disputeMigration, /CREATE TRIGGER trg_prevent_evidence_mutation[\s\S]*BEFORE UPDATE OR DELETE/i);

  console.log('P14.1 critical RPC privilege contract checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
