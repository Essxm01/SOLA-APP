export const criticalRpcSignatures = [
  'konfrm_complete_deposit_payment(uuid,uuid,uuid)',
  'konfrm_register_owner(text,text)',
  'konfrm_submit_owner_kyc(uuid,jsonb)',
  'konfrm_review_owner_kyc(uuid,text,text)',
] as const;

export type CriticalRpcSignature = typeof criticalRpcSignatures[number];

export interface CriticalRpcPrivilegeMetadata {
  signature: string;
  securityDefiner: boolean;
  publicExecute: boolean;
  anonExecute: boolean;
  authenticatedExecute: boolean;
  serviceRoleExecute: boolean;
}

export interface PrivilegeViolation {
  signature: string;
  reason: string;
}

/**
 * Pure evaluator for the live/read-only ACL audit. Keeping the expected
 * privilege contract here makes accidental public re-grants testable without
 * executing a mutating RPC or requiring a live database in unit tests.
 */
export function assessCriticalRpcPrivilegeContract(
  metadata: CriticalRpcPrivilegeMetadata[],
): PrivilegeViolation[] {
  const bySignature = new Map(metadata.map((entry) => [entry.signature, entry]));
  const violations: PrivilegeViolation[] = [];

  for (const signature of criticalRpcSignatures) {
    const entry = bySignature.get(signature);
    if (!entry) {
      violations.push({ signature, reason: 'FUNCTION_METADATA_MISSING' });
      continue;
    }
    if (!entry.securityDefiner) violations.push({ signature, reason: 'SECURITY_DEFINER_REQUIRED' });
    if (entry.publicExecute) violations.push({ signature, reason: 'PUBLIC_EXECUTE_FORBIDDEN' });
    if (entry.anonExecute) violations.push({ signature, reason: 'ANON_EXECUTE_FORBIDDEN' });
    if (entry.authenticatedExecute) violations.push({ signature, reason: 'AUTHENTICATED_EXECUTE_FORBIDDEN' });
    if (!entry.serviceRoleExecute) violations.push({ signature, reason: 'SERVICE_ROLE_EXECUTE_REQUIRED' });
  }

  return violations;
}

/**
 * SELECT-only PostgreSQL audit query for a later Founder-approved live
 * application/verification gate. `acldefault` captures implicit PUBLIC
 * defaults when `proacl` is null; no function is invoked by this query.
 */
export const criticalRpcPrivilegeAuditSql = `
SELECT
  p.oid::regprocedure::text AS signature,
  p.prosecdef AS "securityDefiner",
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) AS "publicExecute",
  has_function_privilege('anon', p.oid, 'EXECUTE') AS "anonExecute",
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS "authenticatedExecute",
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS "serviceRoleExecute"
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.oid::regprocedure::text = ANY($1::text[])
ORDER BY signature;
`;
