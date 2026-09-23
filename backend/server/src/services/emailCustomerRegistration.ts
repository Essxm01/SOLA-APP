import { randomUUID } from 'node:crypto';
import { queryDb } from './dbClient.js';

export interface EmailCustomerRegistrationInput {
  userId?: string;
  email: string;
  fullName: string;
  verifiedAt: string;
}

export interface EmailCustomerRegistrationResult {
  user: any;
  created: boolean;
}

function mapUserRow(row: any): any {
  if (!row || typeof row !== 'object') throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_MALFORMED');
  return {
    id: row.id,
    phoneNumber: row.phone_number ?? row.phoneNumber ?? null,
    phoneVerifiedAt: row.phone_verified_at ?? row.phoneVerifiedAt ?? null,
    fullName: row.full_name ?? row.fullName ?? null,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? row.avatarUrl ?? null,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

async function readSupabaseUserById(userId: string, url: string, headers: Record<string, string>): Promise<any> {
  const userResponse = await fetch(
    `${url.replace(/\/$/, '')}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&deleted_at=is.null&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
    { headers },
  );
  if (!userResponse.ok) throw new Error(`EMAIL_CUSTOMER_REGISTRATION_USER_READ_FAILED: HTTP ${userResponse.status}`);
  const userRaw: any = await userResponse.json().catch(() => null);
  if (!Array.isArray(userRaw) || userRaw.length !== 1) throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_READ_MALFORMED');
  return mapUserRow(userRaw[0]);
}

async function recoverCommittedSupabaseEmailWinner(
  input: Required<EmailCustomerRegistrationInput>,
  url: string,
  headers: Record<string, string>,
): Promise<EmailCustomerRegistrationResult | null> {
  try {
    const baseUrl = url.replace(/\/$/, '');
    const identifierResponse = await fetch(
      `${baseUrl}/rest/v1/user_identifiers?identifier_type=eq.EMAIL&normalized_value=eq.${encodeURIComponent(input.email)}&verified_at=not.is.null&select=user_id`,
      { headers },
    );
    if (!identifierResponse.ok) return null;
    const identifierRaw: any = await identifierResponse.json().catch(() => null);
    if (!Array.isArray(identifierRaw) || identifierRaw.length !== 1 || typeof identifierRaw[0]?.user_id !== 'string') return null;
    const user = await readSupabaseUserById(identifierRaw[0].user_id, baseUrl, headers);
    if (user.email !== input.email || user.phoneNumber !== null) return null;
    return { user, created: false };
  } catch {
    return null;
  }
}

async function registerViaSupabaseRest(input: Required<EmailCustomerRegistrationInput>, url: string, key: string): Promise<EmailCustomerRegistrationResult> {
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/konfrm_create_email_customer_v2`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: input.userId,
        p_email: input.email,
        p_full_name: input.fullName,
        p_verified_at: input.verifiedAt,
      }),
    });
  } catch (error) {
    const recovered = await recoverCommittedSupabaseEmailWinner(input, url, headers);
    if (recovered) return recovered;
    throw error;
  }

  if (!rpcResponse.ok) {
    const body = await rpcResponse.text().catch(() => '');
    const originalError = new Error(`EMAIL_CUSTOMER_REGISTRATION_RPC_FAILED: HTTP ${rpcResponse.status} — ${body.slice(0, 240)}`);
    const recovered = await recoverCommittedSupabaseEmailWinner(input, url, headers);
    if (recovered) return recovered;
    throw originalError;
  }
  const rpcRaw: any = await rpcResponse.json().catch(() => null);
  if (!Array.isArray(rpcRaw) || rpcRaw.length !== 1 || typeof rpcRaw[0]?.user_id !== 'string' || typeof rpcRaw[0]?.created !== 'boolean') {
    throw new Error('EMAIL_CUSTOMER_REGISTRATION_RPC_MALFORMED');
  }

  const user = await readSupabaseUserById(rpcRaw[0].user_id, url, headers);
  return { user, created: rpcRaw[0].created };
}

async function registerViaPostgres(input: Required<EmailCustomerRegistrationInput>): Promise<EmailCustomerRegistrationResult> {
  const rpc = await queryDb(
    `SELECT user_id AS "userId", created
     FROM public.konfrm_create_email_customer_v2($1, $2, $3, $4)`,
    [input.userId, input.email, input.fullName, input.verifiedAt],
  );
  if (rpc.rows.length !== 1 || typeof rpc.rows[0]?.userId !== 'string' || typeof rpc.rows[0]?.created !== 'boolean') {
    throw new Error('EMAIL_CUSTOMER_REGISTRATION_RPC_MALFORMED');
  }
  const userResult = await queryDb(
    'SELECT id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1',
    [rpc.rows[0].userId],
  );
  if (userResult.rows.length !== 1) throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_READ_MALFORMED');
  return { user: mapUserRow(userResult.rows[0]), created: rpc.rows[0].created };
}

/**
 * Runtime adapter for the migration-032 atomic email registration function.
 * Workers use the service-role Supabase REST RPC path; Node/Postgres runtimes
 * use queryDb. The function itself owns concurrency serialization and creates
 * user + verified EMAIL identifier in one transaction. If the Worker RPC loses
 * a real registration race at the REST/database boundary, the adapter may only
 * recover by re-reading a verified canonical EMAIL identifier and its active,
 * non-deleted email-only user. Otherwise the original failure remains visible.
 */
export async function createCanonicalEmailCustomer(input: EmailCustomerRegistrationInput): Promise<EmailCustomerRegistrationResult> {
  const normalizedEmail = input.email.trim();
  const cleanName = input.fullName.trim().replace(/\s+/g, ' ');
  if (!normalizedEmail || !cleanName || !input.verifiedAt) throw new Error('INVALID_EMAIL_CUSTOMER_REGISTRATION_INPUT');
  const resolved: Required<EmailCustomerRegistrationInput> = {
    userId: input.userId || randomUUID(),
    email: normalizedEmail,
    fullName: cleanName,
    verifiedAt: input.verifiedAt,
  };

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (supabaseUrl && supabaseKey) return registerViaSupabaseRest(resolved, supabaseUrl, supabaseKey);
  return registerViaPostgres(resolved);
}
