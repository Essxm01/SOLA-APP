/**
 * Sola Vacation Rentals — PostgreSQL Database Pool Client
 * Location: server/src/services/dbClient.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import 'dotenv/config';
import pg from 'pg';

let currentPool: pg.Pool | null = null;
let currentConnectionString = '';

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('MISSING_DATABASE_URL_ENVIRONMENT_VARIABLE');
  }
  
  if (!currentPool || currentConnectionString !== connectionString) {
    if (currentPool) {
      currentPool.end().catch(() => {});
    }
    const useSsl = connectionString.includes('supabase') || connectionString.includes('pooler') || (!connectionString.includes('127.0.0.1') && !connectionString.includes('localhost'));
    currentPool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    currentConnectionString = connectionString;
  }
  return currentPool;
}

export const dbPool = {
  query: <T extends pg.QueryResultRow = any>(text: string, params?: any[]) => queryDb<T>(text, params)
};

function safeParse<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function mapBookingRestRow(booking: any) {
  return {
    id: booking.id,
    bookingNumber: booking.booking_number,
    propertyId: booking.property_id,
    ownerId: booking.owner_id,
    customerId: booking.customer_id,
    guestName: booking.guest_name,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    nights: booking.nights,
    guestsCount: booking.total_guests,
    status: booking.status,
    createdAt: booking.created_at,
    confirmedAt: booking.confirmed_at,
    rejectedAt: booking.rejected_at,
  };
}

function mapConversationRestRow(conversation: any) {
  return {
    id: conversation.id,
    bookingId: conversation.booking_id,
    propertyId: conversation.property_id,
    customerId: conversation.customer_id,
    ownerId: conversation.owner_id,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

function mapBookingMessageRestRow(message: any) {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    senderRole: message.sender_role,
    text: message.text,
    timestamp: message.created_at,
  };
}

function mapPaymentRestRow(transaction: any) {
  return {
    ...transaction,
    id: transaction.id,
    bookingId: transaction.booking_id,
    customerId: transaction.customer_id,
    ownerId: transaction.owner_id,
    merchantOrderId: transaction.merchant_order_id,
    providerTransactionId: transaction.provider_transaction_id,
    amountCents: transaction.amount_cents,
    amountEgp: Number(transaction.amount_cents || 0) / 100,
    paymentMethod: transaction.payment_method,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

// Migration 026 create-booking RPC result fields: booking columns that are
// NOT NULL in the schema, and the six financial-summary values (numeric, so
// they must arrive as finite numbers — never null/undefined/NaN).
const BOOKING_REQUEST_RPC_REQUIRED_FIELDS = [
  'id', 'bookingNumber', 'propertyId', 'ownerId', 'guestName',
  'checkIn', 'checkOut', 'nights', 'guestsCount', 'status', 'createdAt',
] as const;
const BOOKING_REQUEST_RPC_SNAKE_FALLBACK: Record<string, string> = {
  bookingNumber: 'booking_number',
  propertyId: 'property_id',
  ownerId: 'owner_id',
  guestName: 'guest_name',
  checkIn: 'check_in',
  checkOut: 'check_out',
  guestsCount: 'guestsCount',
  createdAt: 'created_at',
};
const BOOKING_REQUEST_RPC_SUMMARY_NUMERIC_FIELDS = [
  'summaryTotalBookingValue', 'summaryDepositAmount', 'summarySolaCommissionAmount',
  'summaryOwnerNetDepositAmount', 'summaryRemainingBalance', 'summaryCommissionOnRemainingBalance',
] as const;

async function queryViaSupabaseRest(text: string, params: any[] | undefined, url: string, key: string): Promise<pg.QueryResult<any> | null> {
  const headers: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // P1.5: booking request + canonical financial summary are created by ONE
  // Postgres transaction (migration 026). The matcher is exact and
  // collision-safe: only the canonical repository query shape
  // `SELECT * FROM konfrm_create_booking_request($1, ... $18)` enters this
  // adapter branch; any comment, wrapper, different argument count, or SQL
  // that merely mentions the function name must fall through. Worker code
  // must never fall back to sequential booking + summary REST writes with
  // compensating deletes.
  const canonicalRpcMatch = sql
    .replace(/\s+/g, ' ')
    .match(/^SELECT \* FROM konfrm_create_booking_request\(([^()]*)\)$/i);
  const rpcPlaceholders = canonicalRpcMatch
    ? canonicalRpcMatch[1].split(',').map((p) => p.trim())
    : [];
  const isCanonicalCreateRpc =
    !!canonicalRpcMatch &&
    rpcPlaceholders.length === 18 &&
    rpcPlaceholders.every((p, i) => p.toLowerCase() === `$${i + 1}`);
  if (isCanonicalCreateRpc) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_create_booking_request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_id: params?.[0],
        p_booking_number: params?.[1],
        p_property_id: params?.[2],
        p_owner_id: params?.[3],
        p_customer_id: params?.[4],
        p_guest_name: params?.[5],
        p_guest_phone: params?.[6],
        p_check_in: params?.[7],
        p_check_out: params?.[8],
        p_nights: params?.[9],
        p_total_guests: params?.[10],
        p_status: params?.[11],
        p_total_booking_value: params?.[12],
        p_deposit_amount: params?.[13],
        p_sola_commission_amount: params?.[14],
        p_owner_net_deposit_amount: params?.[15],
        p_remaining_balance: params?.[16],
        p_commission_on_remaining_balance: params?.[17] ?? 0,
      }),
    });
    if (!res.ok) {
      // Preserve bounded trigger/DB error evidence (e.g. the Migration 025
      // DATE_MANUALLY_BLOCKED conflict code) for truthful route mapping.
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_REQUEST_CREATE_RPC_FAILED: HTTP ${res.status} — ${body.slice(0, 240)}`);
    }
    const raw: any = await res.json().catch(() => null);
    if (!Array.isArray(raw)) {
      throw new Error('REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE: expected a JSON array with the created row');
    }
    if (raw.length !== 1) {
      throw new Error(`REST_BOOKING_REQUEST_CREATE_RPC_ROW_COUNT: expected exactly one created booking row, got ${raw.length}`);
    }
    const r = raw[0];
    if (!r || typeof r !== 'object') {
      throw new Error('REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE: created row is not an object');
    }
    // Migration 026 returns one flat row: booking fields + summary fields.
    // Validate every field consumed below BEFORE returning success — a partial
    // row must fail closed, never become a false 201 with missing values.
    // DB contract: every bookings column returned here is NOT NULL except
    // customer_id (nullable, ON DELETE SET NULL), which must still be present.
    const requiredNonNullable = BOOKING_REQUEST_RPC_REQUIRED_FIELDS;
    for (const key of requiredNonNullable) {
      const v = r[key] ?? r[BOOKING_REQUEST_RPC_SNAKE_FALLBACK[key]];
      if (v === undefined || v === null) {
        throw new Error(`REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE: created row missing required field ${key}`);
      }
    }
    if (r.customerId === undefined && r.customer_id === undefined) {
      throw new Error('REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE: created row missing required field customerId');
    }
    for (const key of BOOKING_REQUEST_RPC_SUMMARY_NUMERIC_FIELDS) {
      const v = r[key];
      if (v === undefined || v === null || typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`REST_BOOKING_REQUEST_CREATE_MALFORMED_RESPONSE: summary field ${key} must be a finite number`);
      }
    }
    const row = {
      id: r.id,
      bookingNumber: r['bookingNumber'] ?? r.booking_number,
      propertyId: r['propertyId'] ?? r.property_id,
      ownerId: r['ownerId'] ?? r.owner_id,
      customerId: r['customerId'] ?? r.customer_id,
      guestName: r['guestName'] ?? r.guest_name,
      checkIn: r['checkIn'] ?? r.check_in,
      checkOut: r['checkOut'] ?? r.check_out,
      nights: r.nights,
      guestsCount: r['guestsCount'] ?? r.total_guests,
      status: r.status,
      createdAt: r['createdAt'] ?? r.created_at,
      financialSummary: {
        totalBookingValue: r.summaryTotalBookingValue,
        depositAmount: r.summaryDepositAmount,
        solaCommissionAmount: r.summarySolaCommissionAmount,
        ownerNetDepositAmount: r.summaryOwnerNetDepositAmount,
        remainingBalance: r.summaryRemainingBalance,
        commissionOnRemainingBalance: r.summaryCommissionOnRemainingBalance,
      },
    };
    return { rows: [row], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  // PAYMENT-01: the only Worker-safe finalization path is the narrow,
  // atomic Postgres RPC. Never fall through to a pg transaction in Workers.
  if (lowerSql.includes('konfrm_complete_deposit_payment')) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_complete_deposit_payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_payment_transaction_id: params?.[0],
        p_booking_id: params?.[1],
        p_customer_id: params?.[2],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_PAYMENT_FINALIZATION_RPC_FAILED: HTTP ${res.status} — ${body.slice(0, 240)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = Array.isArray(raw) ? raw : [raw];
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // P1.3: property image metadata and upload-intent state are committed by
  // one Postgres transaction. Keep this explicit RPC mapping narrow; Worker
  // code must never emulate this transaction with REST PATCH/POST calls.
  if (lowerSql.includes('konfrm_commit_property_media')) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_commit_property_media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_upload_intent_id: params?.[0],
        p_owner_id: params?.[1],
        p_property_id: params?.[2],
        p_object_key: params?.[3],
        p_file_url: params?.[4],
        p_file_name: params?.[5],
        p_mime_type: params?.[6],
        p_file_size_bytes: params?.[7],
        p_sort_order: params?.[8],
        p_sha256_checksum: params?.[9] ?? null,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_MEDIA_COMMIT_RPC_FAILED: HTTP ${res.status} — ${body.slice(0, 240)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (rows.length !== 1) throw new Error('REST_PROPERTY_MEDIA_COMMIT_RPC_ZERO_ROWS');
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  if (lowerSql.includes('konfrm_register_owner')) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_register_owner`, {
      method: 'POST', headers, body: JSON.stringify({ p_phone_number: params?.[0], p_full_name: params?.[1] }),
    });
    if (!res.ok) throw new Error(`REST_OWNER_REGISTRATION_RPC_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => null);
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  if (lowerSql.includes('konfrm_submit_owner_kyc')) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_submit_owner_kyc`, {
      method: 'POST', headers, body: JSON.stringify({ p_owner_id: params?.[0], p_documents: params?.[1] }),
    });
    if (!res.ok) throw new Error(`REST_OWNER_KYC_SUBMISSION_RPC_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => null);
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  if (lowerSql.includes('konfrm_review_owner_kyc')) {
    const res = await fetch(`${url}/rest/v1/rpc/konfrm_review_owner_kyc`, {
      method: 'POST', headers, body: JSON.stringify({ p_owner_id: params?.[0], p_decision: params?.[1], p_rejection_reason: params?.[2] ?? null }),
    });
    if (!res.ok) throw new Error(`REST_OWNER_KYC_REVIEW_RPC_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => null);
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // OWNER-WALLET-01: canonical owner wallet, scoped solely by the verified
  // owner id supplied by the repository. Keep this strict to avoid pg fallback
  // in the deployed Worker.
  if (lowerSql.startsWith('select') && lowerSql.includes('from owner_wallets') && /\bowner_id\s*=\s*\$1\b/i.test(sql)) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/owner_wallets?owner_id=eq.${encodeURIComponent(ownerId)}`, { headers });
    if (!res.ok) throw new Error(`REST_OWNER_WALLET_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map((wallet: any) => ({
      ownerId: wallet.owner_id,
      currency: wallet.currency,
      availableBalance: wallet.available_balance,
      pendingBalance: wallet.pending_balance,
      heldBalance: wallet.held_balance,
      reservedForPayout: wallet.reserved_for_payout_balance,
      updatedAt: wallet.updated_at,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // OWNER-WALLET-01: immutable ledger reads. Support only the repository's
  // owner-scoped, newest-first query and its unpaginated lifetime projection.
  if (lowerSql.startsWith('select') && lowerSql.includes('from wallet_ledger_entries') && /\bowner_id\s*=\s*\$1\b/i.test(sql)) {
    const ownerId = params?.[0];
    let queryUrl = `${url}/rest/v1/wallet_ledger_entries?owner_id=eq.${encodeURIComponent(ownerId)}`;
    if (lowerSql.includes('order by created_at desc')) queryUrl += '&order=created_at.desc';
    if (/\blimit\s+\$2\b/i.test(sql)) queryUrl += `&limit=${encodeURIComponent(String(params?.[1] ?? 50))}`;
    if (/\boffset\s+\$3\b/i.test(sql)) queryUrl += `&offset=${encodeURIComponent(String(params?.[2] ?? 0))}`;
    const res = await fetch(queryUrl, { headers });
    if (!res.ok) throw new Error(`REST_OWNER_WALLET_LEDGER_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map((entry: any) => ({
      id: entry.id,
      ownerId: entry.owner_id,
      bookingId: entry.booking_id,
      payoutRequestId: entry.payout_request_id,
      disputeId: entry.dispute_id,
      type: entry.transaction_type,
      amount: entry.amount,
      newBalance: entry.balance_after,
      idempotencyKey: entry.idempotency_key,
      createdAt: entry.created_at,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // ADMIN-TRUTHFUL-STATE-01: exact canonical notification read. This is not
  // a general notification matcher; it supports the repository's owner-scoped
  // newest-first query only, and throws rather than fabricating an empty list.
  if (lowerSql.startsWith('select') && lowerSql.includes('from notifications') && /\bowner_id\s*=\s*\$1\b/i.test(sql) && lowerSql.includes('order by created_at desc')) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/notifications?owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_ADMIN_NOTIFICATIONS_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map((notification: any) => ({
      id: notification.id,
      ownerId: notification.owner_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.is_read,
      actionRoute: notification.action_route,
      createdAt: notification.created_at,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // ADMIN-TRUTHFUL-STATE-01: strict Worker-safe projections for the five
  // canonical Admin overview aggregate queries. Each count is read directly
  // from Supabase REST; a failed count throws and can never become a zero.
  const countRows = async (table: string, query: string): Promise<number> => {
    const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
      method: 'HEAD',
      headers: { ...headers, Prefer: 'count=exact' },
    });
    if (!response.ok) throw new Error(`REST_ADMIN_OVERVIEW_COUNT_FAILED: ${table} HTTP ${response.status}`);
    const total = response.headers.get('content-range')?.split('/').pop();
    const parsed = Number(total);
    if (!Number.isFinite(parsed)) throw new Error(`REST_ADMIN_OVERVIEW_COUNT_INVALID: ${table}`);
    return parsed;
  };

  if (lowerSql.startsWith('select') && lowerSql.includes('from properties where deleted_at is null') && lowerSql.includes('pendingproperties') && lowerSql.includes('publishedproperties') && lowerSql.includes('rejectedproperties')) {
    const [pendingProperties, publishedProperties, rejectedProperties, totalProperties] = await Promise.all([
      countRows('properties', 'deleted_at=is.null&status=eq.PENDING_REVIEW'),
      countRows('properties', 'deleted_at=is.null&status=eq.PUBLISHED'),
      countRows('properties', 'deleted_at=is.null&status=eq.DRAFT&verification_status=eq.REJECTED'),
      countRows('properties', 'deleted_at=is.null'),
    ]);
    return { rows: [{ pendingProperties, publishedProperties, rejectedProperties, totalProperties }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  // P1.3 property repository summary (Owner/Admin property overview).
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties where deleted_at is null') && lowerSql.includes('pendingreview') && lowerSql.includes('published') && lowerSql.includes('rejected')) {
    const [pendingReview, published, rejected, total] = await Promise.all([
      countRows('properties', 'deleted_at=is.null&status=eq.PENDING_REVIEW'),
      countRows('properties', 'deleted_at=is.null&status=eq.PUBLISHED'),
      countRows('properties', 'deleted_at=is.null&status=eq.DRAFT&verification_status=eq.REJECTED'),
      countRows('properties', 'deleted_at=is.null'),
    ]);
    return { rows: [{ pendingReview, published, rejected, total }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from bookings') && lowerSql.includes('pendingbookings') && lowerSql.includes('confirmedbookings')) {
    const [pendingBookings, confirmedBookings, totalBookings] = await Promise.all([
      countRows('bookings', 'status=eq.PENDING_OWNER_APPROVAL'),
      countRows('bookings', 'status=eq.CONFIRMED'),
      countRows('bookings', ''),
    ]);
    return { rows: [{ pendingBookings, confirmedBookings, totalBookings }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from owners') && lowerSql.includes('pendingverifications') && lowerSql.includes('verifiedowners')) {
    const [pendingVerifications, verifiedOwners, totalOwners] = await Promise.all([
      countRows('owners', 'verification_status=eq.PENDING_VERIFICATION'),
      countRows('owners', 'verification_status=eq.VERIFIED'),
      countRows('owners', ''),
    ]);
    return { rows: [{ pendingVerifications, verifiedOwners, totalOwners }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from payout_requests') && lowerSql.includes('pendingpayouts') && lowerSql.includes('completedpayouts')) {
    const [pendingPayouts, completedPayouts] = await Promise.all([
      countRows('payout_requests', 'status=eq.PENDING_ADMIN_PROCESSING'),
      countRows('payout_requests', 'status=eq.COMPLETED'),
    ]);
    const payoutRes = await fetch(`${url}/rest/v1/payout_requests?select=net_amount&status=eq.COMPLETED`, { headers });
    if (!payoutRes.ok) throw new Error(`REST_ADMIN_OVERVIEW_PAYOUTS_SELECT_FAILED: HTTP ${payoutRes.status}`);
    const completedRows: any = await payoutRes.json().catch(() => []);
    const totalPaidOutEgp = (Array.isArray(completedRows) ? completedRows : []).reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
    const totalPayoutRows = await countRows('payout_requests', '');
    return { rows: [{ pendingPayouts, completedPayouts, totalPaidOutEgp, totalPayouts: totalPayoutRows }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from disputes') && lowerSql.includes('opendisputes') && lowerSql.includes('resolveddisputes')) {
    const [open, escalated, waiting, resolvedDisputes, totalDisputes] = await Promise.all([
      countRows('disputes', 'status=eq.OPEN'),
      countRows('disputes', 'status=eq.ESCALATED_TO_ADMIN'),
      countRows('disputes', 'status=eq.WAITING_FOR_MORE_EVIDENCE'),
      countRows('disputes', 'status=eq.RESOLVED'),
      countRows('disputes', ''),
    ]);
    return { rows: [{ openDisputes: open + escalated + waiting, resolvedDisputes, totalDisputes }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] };
  }

  // 0A. SELECT users WHERE phone_number = $1 (canonical users table only — DATA-02)
  if (lowerSql.includes('from users') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(
      `${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phone)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(`REST_USERS_SELECT_BY_PHONE_FAILED: HTTP ${res.status}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0B. SELECT users WHERE id = $1 (canonical users table only — DATA-02)
  if (lowerSql.includes('from users') && lowerSql.includes('where id = $1')) {
    const userId = params?.[0];
    const res = await fetch(
      `${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(`REST_USERS_SELECT_BY_ID_FAILED: HTTP ${res.status}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0C0. Pending owner KYC queue. This is intentionally stricter than the
  // generic owner matcher and only selects canonical PENDING package rows.
  if (lowerSql.startsWith('select') && lowerSql.includes('from owners o') && lowerSql.includes('owner_verification_documents') && lowerSql.includes("pending_verification")) {
    const ownersRes = await fetch(`${url}/rest/v1/owners?verification_status=eq.PENDING_VERIFICATION`, { headers });
    if (!ownersRes.ok) throw new Error(`REST_PENDING_OWNER_KYC_SELECT_FAILED: HTTP ${ownersRes.status}`);
    const owners: any[] = await ownersRes.json().catch(() => []);
    const rows: any[] = [];
    for (const owner of owners) {
      const docsRes = await fetch(`${url}/rest/v1/owner_verification_documents?owner_id=eq.${encodeURIComponent(owner.id)}&status=eq.PENDING&order=uploaded_at.desc`, { headers });
      if (!docsRes.ok) throw new Error(`REST_PENDING_OWNER_KYC_DOCUMENTS_FAILED: HTTP ${docsRes.status}`);
      const docs: any[] = await docsRes.json().catch(() => []);
      for (const doc of docs) rows.push({
        ownerId: owner.id, fullName: owner.full_name, phoneNumber: owner.phone_number,
        verificationStatus: owner.verification_status, documentId: doc.id,
        documentType: doc.document_type, storageKey: doc.storage_key, docStatus: doc.status,
        uploadedAt: doc.uploaded_at, submissionId: doc.submission_id,
      });
    }
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 0C. SELECT owners WHERE id = $1
  if (lowerSql.includes('from owners') && lowerSql.includes('where id = $1')) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(ownerId)}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      ownerOnboardingCompletedAt: o.owner_onboarding_completed_at,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0D. SELECT owners WHERE phone_number = $1
  if (lowerSql.includes('from owners') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(`${url}/rest/v1/owners?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      ownerOnboardingCompletedAt: o.owner_onboarding_completed_at,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from owner_verification_documents') && /\bowner_id\s*=\s*\$1\b/i.test(sql)) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/owner_verification_documents?owner_id=eq.${encodeURIComponent(ownerId)}&order=uploaded_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_OWNER_KYC_DOCUMENTS_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any[] = await res.json().catch(() => []);
    const rows = raw.map((doc: any) => ({
      id: doc.id, ownerId: doc.owner_id, documentType: doc.document_type, storageKey: doc.storage_key,
      mimeType: doc.mime_type, fileSizeBytes: doc.file_size_bytes, submissionId: doc.submission_id,
      status: doc.status, rejectionReason: doc.rejection_reason, uploadedAt: doc.uploaded_at, reviewedAt: doc.reviewed_at,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 0E. UPDATE an existing canonical owner profile. This route deliberately
  // does not use the owners upsert compatibility handler.
  if (lowerSql.startsWith('update owners') && /\bwhere\s+id\s*=\s*\$1\b/i.test(sql)) {
    const ownerId = params?.[0];
    const fullName = params?.[1];
    const email = params?.[2];
    const avatarUrl = params?.[3];
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fullName) payload.full_name = fullName;
    if (email === '__NULL__') payload.email = null;
    else if (email) payload.email = email;
    if (avatarUrl) payload.avatar_url = avatarUrl;
    const res = await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(ownerId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`REST_OWNER_PROFILE_UPDATE_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(o => ({
      id: o.id, phoneNumber: o.phone_number, fullName: o.full_name, email: o.email,
      avatarUrl: o.avatar_url, status: o.status, verificationStatus: o.verification_status,
      createdAt: o.created_at, updatedAt: o.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 00. INSERT INTO users (strict, no synthetic fallbacks — DATA-02)
  if (lowerSql.startsWith('insert into users')) {
    const id = params?.[0] || crypto.randomUUID();
    const phoneNumber = params?.[1];
    const fullName = params?.[2] || null;
    const email = params?.[3] || null;
    const avatarUrl = params?.[4] || null;
    const status = params?.[5] || 'ACTIVE';
    const nowIso = new Date().toISOString();

    // Check if user already exists by phone_number to avoid 409 conflict
    const checkRes = await fetch(
      `${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phoneNumber)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!checkRes.ok) {
      throw new Error(`REST_USERS_CHECK_PHONE_FAILED: HTTP ${checkRes.status}`);
    }
    const checkRaw: any = await checkRes.json().catch(() => []);
    const existingUsers: any[] = Array.isArray(checkRaw) ? checkRaw : [];

    if (existingUsers.length > 0) {
      // User exists: PATCH to update fields if provided (upsert semantics)
      const existingUser = existingUsers[0];
      const patchBody: any = { updated_at: nowIso };
      if (fullName) patchBody.full_name = fullName;
      if (email !== null && email !== undefined) patchBody.email = email;
      if (avatarUrl) patchBody.avatar_url = avatarUrl;

      const patchRes = await fetch(
        `${url}/rest/v1/users?id=eq.${encodeURIComponent(existingUser.id)}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(patchBody),
        }
      );
      if (!patchRes.ok) {
        throw new Error(`REST_USERS_UPSERT_PATCH_FAILED: HTTP ${patchRes.status}`);
      }
      const patchRaw: any = await patchRes.json().catch(() => []);
      const patchRows: any[] = Array.isArray(patchRaw) ? patchRaw : [];
      if (patchRows.length === 0) {
        throw new Error('REST_USERS_UPSERT_PATCH_ZERO_ROWS: No row returned after PATCH');
      }
      const mapped = patchRows.map(u => ({
        id: u.id,
        phoneNumber: u.phone_number,
        phoneVerifiedAt: u.phone_verified_at,
        fullName: u.full_name,
        email: u.email,
        avatarUrl: u.avatar_url,
        status: u.status,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));
      return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
    }

    // No existing user: INSERT a new canonical row
    const payload: any = {
      id,
      phone_number: phoneNumber,
      phone_verified_at: null,
      status,
      created_at: nowIso,
      updated_at: nowIso,
    };
    if (fullName) payload.full_name = fullName;
    if (email !== null && email !== undefined) payload.email = email;
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const insertRes = await fetch(`${url}/rest/v1/users`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!insertRes.ok) {
      const errBody = await insertRes.text().catch(() => '');
      throw new Error(`REST_USERS_INSERT_FAILED: HTTP ${insertRes.status} — ${errBody.slice(0, 200)}`);
    }
    const raw: any = await insertRes.json().catch(() => []);
    const arr = Array.isArray(raw) ? raw : (raw && raw.id ? [raw] : []);
    if (arr.length === 0) {
      throw new Error('REST_USERS_INSERT_ZERO_ROWS: No row returned after POST');
    }
    const mapped = arr.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0E. UPDATE users SET phone_verified_at = NOW(), updated_at = NOW() WHERE id = $1
  if (lowerSql.startsWith('update users') && lowerSql.includes('set phone_verified_at =')) {
    const userId = params?.[0];
    const nowIso = new Date().toISOString();
    const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ phone_verified_at: nowIso, updated_at: nowIso }),
    });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0F. UPDATE users SET full_name = ... WHERE id = $1 (strict, no owner fallback, no synthetic rows — DATA-02)
  if (lowerSql.startsWith('update users') && lowerSql.includes('full_name')) {
    const userId = params?.[0];
    const fullName = params?.[1];
    // email param[2]: '__NULL__' sentinel means set to SQL NULL; undefined = don't change
    const emailParam = params?.[2];
    const avatarUrl = params?.[3] || null;
    const nowIso = new Date().toISOString();

    const patchBody: any = { updated_at: nowIso };
    if (fullName !== undefined && fullName !== null && fullName !== '') patchBody.full_name = fullName;
    // Handle email null semantics: __NULL__ = set to NULL, string = set to value, undefined = omit
    if (emailParam === '__NULL__') {
      patchBody.email = null;
    } else if (emailParam !== undefined && emailParam !== null && emailParam !== '') {
      patchBody.email = emailParam;
    }
    if (avatarUrl) patchBody.avatar_url = avatarUrl;

    const patchRes = await fetch(
      `${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(patchBody),
      }
    );
    if (!patchRes.ok) {
      throw new Error(`REST_USERS_UPDATE_FAILED: HTTP ${patchRes.status}`);
    }
    const raw: any = await patchRes.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    if (rows.length === 0) {
      throw new Error(`REST_USERS_UPDATE_ZERO_ROWS: No row returned after PATCH for id=${userId}`);
    }
    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 1P. SELECT public property inventory: only canonically published and verified.
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && lowerSql.includes("status = 'published'") && lowerSql.includes("verification_status = 'verified'")) {
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=eq.PUBLISHED&verification_status=eq.VERIFIED&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_PUBLIC_PROPERTIES_SELECT_FAILED: HTTP ${res.status}`);
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id, ownerId: p.owner_id, title: p.title, unitType: p.unit_type, propertyType: p.property_type,
      address: p.address, bedrooms: p.bedrooms, bathrooms: p.bathrooms, maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night, basePricePerNight: p.base_price_per_night,
      description: p.description || null, region: p.region || null, resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null, bedsCount: p.beds_count || null, amenities: p.amenities || [], houseRules: p.house_rules || {},
      status: p.status, verificationStatus: p.verification_status, createdAt: p.created_at, updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 1A. SELECT properties WHERE owner_id = $1 (Strict regex matching)
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && (/\b(p\.)?owner_id\s*=\s*\$1\b/i.test(text))) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null&order=created_at.desc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTIES_SELECT_BY_OWNER_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 1B. SELECT properties WHERE id = $1 (Single Property - Strict regex matching)
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && (/\b(p\.)?id\s*=\s*\$1\b/i.test(text)) && !(/\b(p\.)?owner_id\s*=\s*\$1\b/i.test(text))) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&deleted_at=is.null`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTIES_SELECT_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 2. INSERT INTO properties
  if (lowerSql.startsWith('insert into properties')) {
    const safeParse = (v: any, fallback: any) => {
      if (!v) return fallback;
      if (typeof v === 'object') return v;
      try {
        return JSON.parse(v);
      } catch {
        return fallback;
      }
    };

    const payload: any = {
      id: params?.[0] || crypto.randomUUID(),
      owner_id: params?.[1],
      title: params?.[2],
      unit_type: params?.[3],
      property_type: params?.[4],
      address: params?.[5] || '',
      bedrooms: Number(params?.[6]),
      bathrooms: Number(params?.[7]),
      max_guests: Number(params?.[8]),
      base_price_per_night: Number(params?.[9]),
      description: params?.[10] || null,
      region: params?.[11] || null,
      resort_name: params?.[12] || null,
      area_sq_m: params?.[13] ? Number(params[13]) : null,
      beds_count: params?.[14] ? Number(params[14]) : null,
      amenities: safeParse(params?.[15], []),
      house_rules: safeParse(params?.[16], {}),
      status: params?.[17] || 'DRAFT',
      verification_status: params?.[18] || 'UNVERIFIED',
    };

    const res = await fetch(`${url}/rest/v1/properties`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      description: p.description,
      region: p.region,
      resortName: p.resort_name,
      areaSqM: p.area_sq_m,
      bedsCount: p.beds_count,
      amenities: p.amenities,
      houseRules: p.house_rules,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3A. P1.3 exact owner lifecycle state write. This is deliberately before
  // the generic owner PATCH parser because COALESCE expressions are not
  // generic assignment syntax. A missing returned row is never success.
  if (lowerSql.startsWith('update properties') && lowerSql.includes('set status = coalesce($3, status)') && lowerSql.includes('verification_status = coalesce($4, verification_status)') && lowerSql.includes('where id = $1 and owner_id = $2 and deleted_at is null')) {
    const propId = params?.[0];
    const ownerId = params?.[1];
    const payload: any = { updated_at: new Date().toISOString() };
    if (params?.[2] !== null && params?.[2] !== undefined) payload.status = params[2];
    if (params?.[3] !== null && params?.[3] !== undefined) payload.verification_status = params[3];
    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null`, {
      method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (rows.length === 0) throw new Error('REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_ZERO_ROWS');
    if (rows.length > 1) throw new Error('REST_PROPERTY_OWNER_LIFECYCLE_UPDATE_MULTIPLE_ROWS');
    const mapped = rows.map((p: any) => ({ id: p.id, ownerId: p.owner_id, title: p.title, status: p.status, verificationStatus: p.verification_status, updatedAt: p.updated_at }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3B. UPDATE properties WHERE id = $1 AND owner_id = $2 (Strict M03 Dynamic REST PATCH)
  if (lowerSql.startsWith('update properties') && lowerSql.includes('where id = $1 and owner_id = $2')) {
    const propId = params?.[0];
    const ownerId = params?.[1];
    const patchBody: any = { updated_at: new Date().toISOString() };

    // Extract SET clause tokens e.g. "title = $3, unit_type = $4, updated_at = NOW()"
    const setMatch = text.match(/SET\s+([\s\S]+?)\s+WHERE/i);
    if (setMatch) {
      const assignments = setMatch[1].split(',');
      for (const assignment of assignments) {
        const trimmed = assignment.trim();
        const colMatch = trimmed.match(/^([a-z0-9_]+)\s*=\s*\$(\d+)/i);
        if (colMatch) {
          const colName = colMatch[1].toLowerCase();
          const paramNum = parseInt(colMatch[2], 10);
          const rawVal = params?.[paramNum - 1];
          if (colName === 'amenities' || colName === 'house_rules') {
            patchBody[colName] = safeParse(rawVal, colName === 'amenities' ? [] : {});
          } else {
            patchBody[colName] = rawVal;
          }
        }
      }
    }

    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(patchBody)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTIES_UPDATE_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error(`REST_PROPERTIES_UPDATE_ZERO_ROWS: No row returned after update for property id=${propId}`);
    }

    const mapped = arr.map((p: any) => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      description: p.description,
      region: p.region,
      resortName: p.resort_name,
      areaSqM: p.area_sq_m,
      bedsCount: p.beds_count,
      amenities: p.amenities,
      houseRules: p.house_rules,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3B. UPDATE properties SET status = ...
  if (lowerSql.startsWith('update properties') && (lowerSql.includes('set status =') || lowerSql.includes('verification_status ='))) {
    const propId = params?.[0];
    const status = params?.[1];
    const verificationStatus = params?.[2];
    const payload: any = { updated_at: new Date().toISOString() };
    if (status) payload.status = status;
    if (verificationStatus) payload.verification_status = verificationStatus;

    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`REST_PROPERTY_UPDATE_STATUS_FAILED: HTTP ${res.status}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      status: p.status,
      verificationStatus: p.verification_status,
      updatedAt: p.updated_at
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 4. INSERT INTO owners ON CONFLICT
  if (lowerSql.startsWith('insert into owners')) {
    const payload = {
      id: params?.[0],
      phone_number: params?.[1],
      full_name: params?.[2],
      email: params?.[3] || null,
      avatar_url: params?.[4] || null,
      status: params?.[5] || 'ACTIVE',
      verification_status: params?.[6] || 'UNVERIFIED'
    };
    const res = await fetch(`${url}/rest/v1/owners`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });
    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }


  // 6. Admin Property rejected list: the schema-valid representation is
  // DRAFT plus a rejected verification state, not a REJECTED status value.
  if (lowerSql.includes('from properties p') && lowerSql.includes("p.status = 'draft'") && lowerSql.includes("p.verification_status = 'rejected'") && lowerSql.includes('order by p.created_at desc')) {
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=eq.DRAFT&verification_status=eq.REJECTED&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_ADMIN_REJECTED_PROPERTIES_FAILED: HTTP ${res.status}`);
    const rows: any[] = await res.json().catch(() => []);
    return { rows: rows.map(p => ({ ...p, ownerId: p.owner_id, pricePerNight: p.base_price_per_night, verificationStatus: p.verification_status })), command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 6. Admin Pending Properties Queue. Rejected properties remain visible as
  // historical outcome context but are not pending review until resubmitted.
  if (lowerSql.includes('from properties') && (lowerSql.includes('pending_review') || lowerSql.includes('rejected'))) {
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&or=(status.eq.PENDING_REVIEW,and(status.eq.DRAFT,verification_status.eq.REJECTED))&order=created_at.asc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_ADMIN_PENDING_PROPERTIES_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ownerName: 'مالك صولا',
      ownerPhone: '',
      ownerVerificationStatus: 'UNVERIFIED'
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6B0. SELECT active property image by upload intent (idempotent media commit)
  if (lowerSql.includes('from property_images') && lowerSql.includes('upload_intent_id = $1')) {
    const intentId = params?.[0];
    const res = await fetch(`${url}/rest/v1/property_images?upload_intent_id=eq.${encodeURIComponent(intentId)}&status=eq.ACTIVE`, { headers });
    if (!res.ok) throw new Error(`REST_PROPERTY_IMAGE_BY_INTENT_SELECT_FAILED: HTTP ${res.status}`);
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(img => ({
      id: img.id, propertyId: img.property_id, ownerId: img.owner_id, objectKey: img.object_key,
      fileUrl: img.file_url, fileName: img.file_name, mimeType: img.mime_type,
      fileSize: img.file_size_bytes, sortOrder: img.sort_order, uploadIntentId: img.upload_intent_id,
      sha256Checksum: img.sha256_checksum, status: img.status, uploadedAt: img.uploaded_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6B. Exact Owner image lookup includes deleted rows solely to make public
  // object cleanup retryable after the canonical metadata soft-delete.
  if (lowerSql.includes('from property_images') && lowerSql.includes('where id = $1 and owner_id = $2')) {
    const imageId = params?.[0];
    const ownerId = params?.[1];
    const res = await fetch(`${url}/rest/v1/property_images?id=eq.${encodeURIComponent(imageId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, { headers });
    if (!res.ok) throw new Error(`REST_PROPERTY_IMAGE_OWNER_SELECT_FAILED: HTTP ${res.status}`);
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(img => ({ id: img.id, propertyId: img.property_id, ownerId: img.owner_id, objectKey: img.object_key, fileUrl: img.file_url, fileName: img.file_name, mimeType: img.mime_type, fileSize: img.file_size_bytes, sortOrder: img.sort_order, uploadIntentId: img.upload_intent_id, sha256Checksum: img.sha256_checksum, status: img.status, uploadedAt: img.uploaded_at, deletedAt: img.deleted_at }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6C. SELECT FROM property_images WHERE property_id = $1
  if (lowerSql.includes('from property_images') && lowerSql.includes('property_id = $1')) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/property_images?property_id=eq.${encodeURIComponent(propId)}&status=eq.ACTIVE&order=sort_order.asc,uploaded_at.asc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTY_IMAGES_SELECT_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(img => ({
      id: img.id,
      propertyId: img.property_id,
      ownerId: img.owner_id,
      objectKey: img.object_key,
      fileUrl: img.file_url,
      fileName: img.file_name,
      mimeType: img.mime_type,
      fileSize: img.file_size_bytes,
      sortOrder: img.sort_order,
      uploadIntentId: img.upload_intent_id,
      sha256Checksum: img.sha256_checksum,
      status: img.status,
      uploadedAt: img.uploaded_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6C. INSERT INTO upload_intents (M03 Upload Intent Creation & Conflict Handling)
  if (lowerSql.startsWith('insert into upload_intents')) {
    const intentNumber = params?.[0];
    const ownerId = params?.[1];
    const propertyId = params?.[2];
    const objectKey = params?.[3];
    const expectedMimeType = params?.[4];
    const expectedSizeBytes = params?.[5] ? Number(params[5]) : null;
    const idempotencyKey = params?.[6];
    const expiresAt = params?.[7];

    const payload = {
      intent_number: intentNumber,
      owner_id: ownerId,
      property_id: propertyId,
      object_key: objectKey,
      expected_mime_type: expectedMimeType,
      expected_size_bytes: expectedSizeBytes,
      idempotency_key: idempotencyKey,
      expires_at: expiresAt,
      status: 'PENDING_UPLOAD',
    };

    const res = await fetch(`${url}/rest/v1/upload_intents`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_UPLOAD_INTENT_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error('REST_UPLOAD_INTENT_INSERT_ZERO_ROWS: No row returned after intent insert');
    }

    const mapped = arr.map((r: any) => ({
      id: r.id,
      intentNumber: r.intent_number,
      ownerId: r.owner_id,
      propertyId: r.property_id,
      objectKey: r.object_key,
      expectedMimeType: r.expected_mime_type,
      expectedSizeBytes: r.expected_size_bytes ? Number(r.expected_size_bytes) : null,
      idempotencyKey: r.idempotency_key,
      status: r.status,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6D. SELECT FROM upload_intents WHERE id = $1
  if (lowerSql.includes('from upload_intents') && lowerSql.includes('where id = $1')) {
    const id = params?.[0];
    const res = await fetch(`${url}/rest/v1/upload_intents?id=eq.${encodeURIComponent(id)}`, { headers });
    if (!res.ok) {
      throw new Error(`REST_UPLOAD_INTENT_SELECT_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      intentNumber: r.intent_number,
      ownerId: r.owner_id,
      propertyId: r.property_id,
      objectKey: r.object_key,
      expectedMimeType: r.expected_mime_type,
      expectedSizeBytes: r.expected_size_bytes ? Number(r.expected_size_bytes) : null,
      idempotencyKey: r.idempotency_key,
      status: r.status,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6E. UPDATE upload_intents SET status = 'COMMITTED' WHERE id = $1
  if (lowerSql.startsWith('update upload_intents') && lowerSql.includes('status = \'committed\'') && lowerSql.includes('where id = $1')) {
    const id = params?.[0];
    const ownerId = params?.[1];
    const propertyId = params?.[2];
    const objectKey = params?.[3];
    const filters = [`id=eq.${encodeURIComponent(id)}`, 'status=eq.PENDING_UPLOAD'];
    if (ownerId) filters.push(`owner_id=eq.${encodeURIComponent(ownerId)}`);
    if (propertyId) filters.push(`property_id=eq.${encodeURIComponent(propertyId)}`);
    if (objectKey) filters.push(`object_key=eq.${encodeURIComponent(objectKey)}`);
    filters.push(`expires_at=gt.${encodeURIComponent(new Date().toISOString())}`);
    const res = await fetch(`${url}/rest/v1/upload_intents?${filters.join('&')}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'COMMITTED' }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_UPLOAD_INTENT_COMMIT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error(`REST_UPLOAD_INTENT_COMMIT_ZERO_ROWS: No row returned for intent commit id=${id}`);
    }

    const mapped = arr.map((r: any) => ({
      id: r.id,
      status: r.status,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6F. SELECT expired upload_intents
  if (lowerSql.includes('from upload_intents') && lowerSql.includes('status = \'pending_upload\'')) {
    const res = await fetch(`${url}/rest/v1/upload_intents?status=eq.PENDING_UPLOAD&expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=id,object_key`, { headers });
    if (!res.ok) {
      throw new Error(`REST_UPLOAD_INTENTS_EXPIRED_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      objectKey: r.object_key,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6G. INSERT INTO property_images (imageDb.addImage)
  if (lowerSql.startsWith('insert into property_images')) {
    const propertyId = params?.[0];
    const ownerId = params?.[1];
    const objectKey = params?.[2];
    const fileUrl = params?.[3];
    const fileName = params?.[4];
    const mimeType = params?.[5];
    const fileSize = params?.[6] ? Number(params[6]) : null;
    const sortOrder = params?.[7] !== undefined ? Number(params[7]) : 0;
    const uploadIntentId = params?.[8] || null;
    const sha256Checksum = params?.[9] || null;

    const payload = {
      property_id: propertyId,
      owner_id: ownerId,
      object_key: objectKey,
      file_url: fileUrl,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      sort_order: sortOrder,
      upload_intent_id: uploadIntentId,
      sha256_checksum: sha256Checksum,
      status: 'ACTIVE',
    };

    const res = await fetch(`${url}/rest/v1/property_images`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_IMAGES_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error('REST_PROPERTY_IMAGES_INSERT_ZERO_ROWS: No row returned after image insert');
    }

    const mapped = arr.map((img: any) => ({
      id: img.id,
      propertyId: img.property_id,
      ownerId: img.owner_id,
      objectKey: img.object_key,
      fileUrl: img.file_url,
      fileName: img.file_name,
      mimeType: img.mime_type,
      fileSize: img.file_size_bytes,
      sortOrder: img.sort_order,
      uploadIntentId: img.upload_intent_id,
      sha256Checksum: img.sha256_checksum,
      status: img.status,
      uploadedAt: img.uploaded_at || img.created_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6H. UPDATE property_images SET status = 'DELETED' (imageDb.deleteImage)
  if (lowerSql.startsWith('update property_images') && lowerSql.includes('status = \'deleted\'')) {
    const imageId = params?.[0];
    const ownerId = params?.[1];

    const res = await fetch(`${url}/rest/v1/property_images?id=eq.${encodeURIComponent(imageId)}&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.ACTIVE`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'DELETED', deleted_at: new Date().toISOString() })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_IMAGE_DELETE_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map((r: any) => ({
      id: r.id,
      objectKey: r.object_key,
      propertyId: r.property_id,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 7A. INSERT a canonical customer booking request.
  if (lowerSql.startsWith('insert into bookings') && lowerSql.includes('customer_id')) {
    const payload = {
      id: params?.[0],
      booking_number: params?.[1],
      property_id: params?.[2],
      owner_id: params?.[3],
      customer_id: params?.[4],
      guest_name: params?.[5],
      guest_phone: params?.[6],
      check_in: params?.[7],
      check_out: params?.[8],
      nights: Number(params?.[9]),
      total_guests: Number(params?.[10]),
      status: params?.[11],
    };
    const res = await fetch(`${url}/rest/v1/bookings`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_INSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((b: any) => ({
      id: b.id,
      bookingNumber: b.booking_number,
      propertyId: b.property_id,
      ownerId: b.owner_id,
      customerId: b.customer_id,
      guestName: b.guest_name,
      checkIn: b.check_in,
      checkOut: b.check_out,
      nights: b.nights,
      guestsCount: b.total_guests,
      status: b.status,
      createdAt: b.created_at,
    }));
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7B. INSERT canonical server-calculated booking financial summary.
  if (lowerSql.startsWith('insert into booking_financial_summaries')) {
    const payload = {
      booking_id: params?.[0],
      total_booking_value: Number(params?.[1]),
      deposit_amount: Number(params?.[2]),
      sola_commission_amount: Number(params?.[3]),
      owner_net_deposit_amount: Number(params?.[4]),
      remaining_balance: Number(params?.[5]),
      commission_on_remaining_balance: Number(params?.[6]),
    };
    const res = await fetch(`${url}/rest/v1/booking_financial_summaries`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_FINANCIAL_SUMMARY_INSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((summary: any) => ({
      bookingId: summary.booking_id,
      totalBookingValue: summary.total_booking_value,
      depositAmount: summary.deposit_amount,
      solaCommissionAmount: summary.sola_commission_amount,
      ownerNetDepositAmount: summary.owner_net_deposit_amount,
      remainingBalance: summary.remaining_balance,
      commissionOnRemainingBalance: summary.commission_on_remaining_balance,
      createdAt: summary.created_at,
    }));
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7C. SELECT a booking financial summary by booking id.
  if (lowerSql.includes('from booking_financial_summaries') && /\bbooking_id\s*=\s*\$1\b/i.test(text)) {
    const bookingId = params?.[0];
    const res = await fetch(`${url}/rest/v1/booking_financial_summaries?booking_id=eq.${encodeURIComponent(bookingId)}`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_FINANCIAL_SUMMARY_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map((summary: any) => ({
      bookingId: summary.booking_id,
      totalBookingValue: summary.total_booking_value,
      depositAmount: summary.deposit_amount,
      solaCommissionAmount: summary.sola_commission_amount,
      ownerNetDepositAmount: summary.owner_net_deposit_amount,
      remainingBalance: summary.remaining_balance,
      commissionOnRemainingBalance: summary.commission_on_remaining_balance,
      createdAt: summary.created_at,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7D. SELECT owner-scoped booking requests. Keep this before generic availability matching.
  if (lowerSql.startsWith('select') && lowerSql.includes('from bookings') && /\bowner_id\s*=\s*\$1\b/i.test(text) && !lowerSql.includes('property_id = $1')) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/bookings?owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKINGS_SELECT_BY_OWNER_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7E. SELECT a single booking by id. The exact id predicate prevents owner_id collisions.
  if (lowerSql.startsWith('select') && lowerSql.includes('from bookings') && /\bid\s*=\s*\$1\b/i.test(text) && !/\b(owner_id|customer_id|property_id)\s*=\s*\$1\b/i.test(text)) {
    const bookingId = params?.[0];
    const res = await fetch(`${url}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_SELECT_BY_ID_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7F. SELECT customer-scoped bookings. Customer ID is the sole authority; never fall back to a phone match.
  if (lowerSql.startsWith('select') && lowerSql.includes('from bookings') && /\bcustomer_id\s*=\s*\$1\b/i.test(text)) {
    const customerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/bookings?customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKINGS_SELECT_BY_CUSTOMER_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7G. Owner decision. PATCH requires the pending state and exact owner ownership in the REST predicate.
  if (lowerSql.startsWith('update bookings') && /\bid\s*=\s*\$1\b/i.test(text) && /\bowner_id\s*=\s*\$2\b/i.test(text) && /\bstatus\s*=\s*'pending_owner_approval'/i.test(text)) {
    const bookingId = params?.[0];
    const ownerId = params?.[1];
    const status = params?.[2];
    const res = await fetch(`${url}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.PENDING_OWNER_APPROVAL`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status, ...(status === 'REJECTED' ? { rejected_at: new Date().toISOString() } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_STATUS_UPDATE_FAILED: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingRestRow);
    return { rows, command: 'UPDATE', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7H. Compensating delete is limited to a just-created customer-owned pending request when summary persistence fails.
  if (lowerSql.startsWith('delete from bookings') && /\bid\s*=\s*\$1\b/i.test(text) && /\bcustomer_id\s*=\s*\$2\b/i.test(text) && /\bstatus\s*=\s*'pending_owner_approval'/i.test(text)) {
    const bookingId = params?.[0];
    const customerId = params?.[1];
    const res = await fetch(`${url}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&customer_id=eq.${encodeURIComponent(customerId)}&status=eq.PENDING_OWNER_APPROVAL`, {
      method: 'DELETE',
      headers: { ...headers, 'Prefer': 'return=representation' },
    });
    if (!res.ok) throw new Error(`REST_BOOKING_COMPENSATING_DELETE_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingRestRow);
    return { rows, command: 'DELETE', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7I. Lookup the one conversation associated with a booking before attempting creation.
  if (lowerSql.startsWith('select') && lowerSql.includes('from booking_conversations') && /\bwhere\s+booking_id\s*=\s*\$1\s*(?:order by|$)/i.test(lowerSql.replace(/\s+/g, ' '))) {
    const bookingId = params?.[0];
    const res = await fetch(`${url}/rest/v1/booking_conversations?booking_id=eq.${encodeURIComponent(bookingId)}`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_CONVERSATION_LOOKUP_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapConversationRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7J. Idempotent one-conversation-per-booking upsert.
  if (lowerSql.startsWith('insert into booking_conversations') && lowerSql.includes('on conflict (booking_id)')) {
    const payload = {
      booking_id: params?.[0],
      property_id: params?.[1],
      customer_id: params?.[2],
      owner_id: params?.[3],
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${url}/rest/v1/booking_conversations?on_conflict=booking_id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_CONVERSATION_UPSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(mapConversationRestRow);
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7K. Participant-scoped conversation reads. The REST predicate includes both the conversation and verified participant.
  if (lowerSql.startsWith('select') && lowerSql.includes('from booking_conversations') && /\bid\s*=\s*\$1\b/i.test(text) && /\b(customer_id|owner_id)\s*=\s*\$2\b/i.test(text)) {
    const participantColumn = /\bcustomer_id\s*=\s*\$2\b/i.test(text) ? 'customer_id' : 'owner_id';
    const res = await fetch(`${url}/rest/v1/booking_conversations?id=eq.${encodeURIComponent(params?.[0])}&${participantColumn}=eq.${encodeURIComponent(params?.[1])}`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_CONVERSATION_PARTICIPANT_READ_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapConversationRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7L. Owner conversation inbox is owner-scoped.
  if (lowerSql.startsWith('select') && lowerSql.includes('from booking_conversations') && /\bowner_id\s*=\s*\$1\b/i.test(text)) {
    const res = await fetch(`${url}/rest/v1/booking_conversations?owner_id=eq.${encodeURIComponent(params?.[0])}&order=updated_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_CONVERSATIONS_SELECT_BY_OWNER_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapConversationRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7M. Message history is retrieved only after the route has verified the participant-scoped conversation.
  if (lowerSql.startsWith('select') && lowerSql.includes('from booking_messages') && /\bconversation_id\s*=\s*\$1\b/i.test(text)) {
    const res = await fetch(`${url}/rest/v1/booking_messages?conversation_id=eq.${encodeURIComponent(params?.[0])}&order=created_at.asc`, { headers });
    if (!res.ok) throw new Error(`REST_BOOKING_MESSAGES_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapBookingMessageRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7N. Text messages are persisted with the sender identity inferred by the verified backend route.
  if (lowerSql.startsWith('insert into booking_messages')) {
    const payload = {
      conversation_id: params?.[0],
      sender_id: params?.[1],
      sender_role: params?.[2],
      text: params?.[3],
    };
    const res = await fetch(`${url}/rest/v1/booking_messages`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_BOOKING_MESSAGE_INSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(mapBookingMessageRestRow);
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7. SELECT bookings for Property Availability & Overlap Checks (Canonical Blocking Statuses)
  if (lowerSql.includes('from bookings') && lowerSql.includes('property_id = $1') && !lowerSql.includes('customer_id')) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/bookings?property_id=eq.${encodeURIComponent(propId)}&select=check_in,check_out,status`, { headers });
    // Availability checks must fail closed: a REST error or unexpected payload
    // must throw, never silently become an empty (fully available) result.
    if (!res.ok) {
      throw new Error(`REST_BOOKING_AVAILABILITY_QUERY_FAILED: HTTP ${res.status}`);
    }
    const raw: any = await res.json().catch(() => null);
    // PostgREST collection SELECTs must return a JSON array; any other 200
    // shape is unexpected and must throw instead of normalizing to [raw].
    if (!Array.isArray(raw)) {
      throw new Error('REST_BOOKING_AVAILABILITY_MALFORMED_RESPONSE: expected a JSON array of booking rows');
    }
    for (const b of raw) {
      if (!b || typeof b.check_in !== 'string' || typeof b.check_out !== 'string' || typeof b.status !== 'string') {
        throw new Error('REST_BOOKING_AVAILABILITY_MALFORMED_RESPONSE: booking row missing required check_in/check_out/status fields');
      }
    }
    const mapped = raw
      .filter((b: any) => b.status === 'APPROVED_PENDING_PAYMENT' || b.status === 'CONFIRMED')
      .map((b: any) => ({
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status,
      }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 7A. SELECT property_availability rows for a property (manual blocks + price overrides)
  if (lowerSql.includes('from property_availability') && lowerSql.includes('property_id = $1') && !lowerSql.includes('insert into')) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/property_availability?property_id=eq.${encodeURIComponent(propId)}&select=id,property_id,date,is_booked,custom_price_per_night,note&order=date.asc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_AVAILABILITY_QUERY_FAILED: HTTP ${res.status}`);
    }
    const raw: any = await res.json().catch(() => null);
    // Collection reads require the PostgREST array shape with decision-grade
    // fields; an empty array remains a legitimate zero-row result.
    if (!Array.isArray(raw)) {
      throw new Error('REST_AVAILABILITY_MALFORMED_RESPONSE: expected a JSON array of availability rows');
    }
    for (const r of raw) {
      if (!r || typeof r.id !== 'string' || typeof r.date !== 'string' || typeof r.is_booked !== 'boolean') {
        throw new Error('REST_AVAILABILITY_MALFORMED_RESPONSE: availability row missing required id/date/is_booked fields');
      }
    }
    const rows: any[] = raw.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      date: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
      isBooked: r.is_booked === true,
      customPricePerNight: r.custom_price_per_night ?? null,
      note: r.note ?? null,
    }));
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7B-av. INSERT ... ON CONFLICT upsert of one manual availability date.
  // Never touches custom_price_per_night, so price overrides survive toggles.
  if (lowerSql.startsWith('insert into property_availability') && lowerSql.includes('on conflict (property_id, date)')) {
    const bodyPayload: any = {
      property_id: params?.[0],
      date: params?.[1],
      is_booked: params?.[2],
      note: params?.[3] ?? null,
    };
    const res = await fetch(`${url}/rest/v1/property_availability?on_conflict=property_id,date`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(bodyPayload),
    });
    if (!res.ok) {
      // Preserve bounded trigger/DB error evidence so canonical conflict codes
      // (e.g. DATE_COVERED_BY_ACTIVE_BOOKING) survive to the route mapping.
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_AVAILABILITY_UPSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 300)}`);
    }
    const raw: any = await res.json().catch(() => null);
    if (!Array.isArray(raw)) {
      throw new Error('REST_AVAILABILITY_UPSERT_MALFORMED_RESPONSE: expected a JSON array of returned rows');
    }
    const rows: any[] = raw.filter(Boolean).map((r: any) => {
      if (!r || typeof r.id !== 'string' || typeof r.date !== 'string' || typeof r.is_booked !== 'boolean') {
        throw new Error('REST_AVAILABILITY_UPSERT_MALFORMED_RESPONSE: returned row missing required id/date/is_booked fields');
      }
      return {
        id: r.id,
        propertyId: r.property_id,
        date: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
        isBooked: r.is_booked === true,
        customPricePerNight: r.custom_price_per_night ?? null,
        note: r.note ?? null,
      };
    });
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 7B. SELECT bookings for Customer App (Customer ID or Phone)
  if (lowerSql.includes('from bookings') && (lowerSql.includes('customer_id') || lowerSql.includes('guest_phone'))) {
    const customerId = params?.[0];
    const phone = params?.[1];
    let queryUrl = `${url}/rest/v1/bookings?order=created_at.desc`;
    if (customerId && phone) {
      queryUrl += `&or=(customer_id.eq.${encodeURIComponent(customerId)},guest_phone.eq.${encodeURIComponent(phone)})`;
    } else if (customerId) {
      queryUrl += `&customer_id=eq.${encodeURIComponent(customerId)}`;
    } else if (phone) {
      queryUrl += `&guest_phone=eq.${encodeURIComponent(phone)}`;
    }

    const res = await fetch(queryUrl, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(b => ({
      id: b.id,
      bookingNumber: b.booking_number,
      propertyId: b.property_id,
      ownerId: b.owner_id,
      customerId: b.customer_id,
      guestName: b.guest_name,
      guestPhone: b.guest_phone,
      checkIn: b.check_in,
      checkOut: b.check_out,
      nights: b.nights,
      totalGuests: b.total_guests,
      status: b.status,
      createdAt: b.created_at,
      confirmedAt: b.confirmed_at,
      pricePerNight: 5000,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // PAYMENT-01.1 INSERT payment transaction (prototype initiation).
  if (lowerSql.startsWith('insert into payment_transactions')) {
    const payload = {
      booking_id: params?.[0],
      customer_id: params?.[1],
      owner_id: params?.[2],
      provider: params?.[3],
      merchant_order_id: params?.[4],
      amount_cents: Number(params?.[5]),
      currency: params?.[6],
      payment_method: params?.[7],
      status: 'INITIATED',
      idempotency_key: params?.[8],
      paymob_payment_token: params?.[9] || null,
      paymob_checkout_url: params?.[10] || null,
      raw_request_payload: params?.[11] ? safeParse(params[11], params[11]) : null,
    };
    const res = await fetch(`${url}/rest/v1/payment_transactions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_PAYMENT_TRANSACTION_INSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 240)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(mapPaymentRestRow);
    return { rows, command: 'INSERT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // PAYMENT-01.2 strict payment transaction reads. Keep these predicates
  // separate so booking/customer filters cannot collide with one another.
  if (lowerSql.startsWith('select') && lowerSql.includes('from payment_transactions') && /\bidempotency_key\s*=\s*\$1\b/i.test(sql)) {
    const keyValue = params?.[0];
    const res = await fetch(`${url}/rest/v1/payment_transactions?idempotency_key=eq.${encodeURIComponent(keyValue)}`, { headers });
    if (!res.ok) throw new Error(`REST_PAYMENT_TRANSACTION_SELECT_BY_IDEMPOTENCY_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapPaymentRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from payment_transactions') && /\bmerchant_order_id\s*=\s*\$1\b/i.test(sql)) {
    const orderId = params?.[0];
    const res = await fetch(`${url}/rest/v1/payment_transactions?merchant_order_id=eq.${encodeURIComponent(orderId)}`, { headers });
    if (!res.ok) throw new Error(`REST_PAYMENT_TRANSACTION_SELECT_BY_ORDER_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapPaymentRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  if (lowerSql.startsWith('select') && lowerSql.includes('from payment_transactions') && /\bbooking_id\s*=\s*\$1\b/i.test(sql)) {
    const bookingId = params?.[0];
    const res = await fetch(`${url}/rest/v1/payment_transactions?booking_id=eq.${encodeURIComponent(bookingId)}&order=created_at.desc`, { headers });
    if (!res.ok) throw new Error(`REST_PAYMENT_TRANSACTION_SELECT_BY_BOOKING_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : []).map(mapPaymentRestRow);
    return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
  }

  // 17. SELECT payment_transactions for Customer
  if (lowerSql.startsWith('select') && lowerSql.includes('from payment_transactions') && /\bcustomer_id\s*=\s*\$1\b/i.test(sql)) {
    const customerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/payment_transactions?customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(mapPaymentRestRow);
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 8. SELECT published properties for Customer Exploration / Search
  if (lowerSql.includes('from properties') && (lowerSql.includes('published') || lowerSql.includes('status = $1') || lowerSql.includes('status ='))) {
    const statusVal = params?.[0] || 'PUBLISHED';
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=eq.${encodeURIComponent(statusVal)}&order=created_at.desc`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ownerName: 'مالك صولا',
      ownerPhone: '',
      ownerVerificationStatus: 'UNVERIFIED',
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 9. SELECT FROM otp_challenges WHERE phone_number = $1
  if (lowerSql.includes('from otp_challenges') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [];

    // Fallback check in user_sessions if otp_challenges table is not yet present
    if (rows.length === 0) {
      const fallbackRes = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}&is_revoked=eq.false`, { headers });
      const fallbackRaw: any = await fallbackRes.json().catch(() => []);
      const fallbackRows: any[] = Array.isArray(fallbackRaw) ? fallbackRaw : [];
      if (fallbackRows.length > 0) {
        try {
          const parsed = JSON.parse(fallbackRows[0].device_info || '{}');
          rows = [{
            phone_number: phone,
            code: parsed.code,
            expires_at: fallbackRows[0].expires_at || parsed.expiresAt,
            request_count: parsed.requestCount || 1,
            failed_attempts: parsed.failedAttempts || 0,
            created_at: fallbackRows[0].created_at,
            updated_at: fallbackRows[0].created_at,
          }];
        } catch {}
      }
    }

    const mapped = rows.map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 10. INSERT / UPSERT INTO otp_challenges
  if (lowerSql.startsWith('insert into otp_challenges')) {
    const phone = params?.[0];
    const code = params?.[1];
    const expiresAt = params?.[2];
    const requestCount = params?.[3] || 1;
    const failedAttempts = params?.[4] || 0;

    const payload = {
      phone_number: phone,
      code,
      expires_at: expiresAt,
      request_count: requestCount,
      failed_attempts: failedAttempts,
      updated_at: new Date().toISOString(),
    };

    let res = await fetch(`${url}/rest/v1/otp_challenges`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });

    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [raw];

    // If otp_challenges table is missing, persist into user_sessions as robust fallback
    if (!res.ok) {
      const fallbackPayload = {
        id: crypto.randomUUID(),
        owner_id: '00000000-0000-4000-8000-201012345678', // known valid fallback UUID
        refresh_token_hash: 'otp_' + phone,
        device_info: JSON.stringify({ code, expiresAt, requestCount, failedAttempts }),
        is_revoked: false,
        expires_at: expiresAt,
      };
      await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}`, { method: 'DELETE', headers }).catch(() => {});
      await fetch(`${url}/rest/v1/user_sessions`, { method: 'POST', headers, body: JSON.stringify(fallbackPayload) }).catch(() => {});
      rows = [{ ...payload, created_at: new Date().toISOString() }];
    }

    const mapped = rows.filter(r => r && r.phone_number).map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 11. UPDATE otp_challenges SET failed_attempts
  if (lowerSql.startsWith('update otp_challenges')) {
    const phone = params?.[0];
    const failedAttempts = params?.[1];
    const nowIso = new Date().toISOString();

    const res = await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ failed_attempts: failedAttempts, updated_at: nowIso }),
    });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 12. DELETE FROM otp_challenges
  if (lowerSql.startsWith('delete from otp_challenges')) {
    const phone = params?.[0];
    await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}`, { method: 'DELETE', headers }).catch(() => {});
    return { rows: [], command: 'DELETE', rowCount: 1, oid: 0, fields: [] };
  }

  // 13. INSERT INTO user_sessions
  if (lowerSql.startsWith('insert into user_sessions')) {
    const id = params?.[0] || crypto.randomUUID();
    const userId = params?.[1];
    const ownerId = params?.[2] ?? null;
    const surface = params?.[3] || 'CUSTOMER';
    const role = params?.[4] || 'ROLE_CUSTOMER';
    const refreshTokenHash = params?.[5];
    const clientDeviceInfo = params?.[6] || '';
    const ipAddress = params?.[7] || null;
    const expiresAt = params?.[8];

    const payload = {
      id,
      user_id: userId,
      owner_id: ownerId,
      surface,
      role,
      refresh_token_hash: refreshTokenHash,
      device_info: clientDeviceInfo,
      ip_address: ipAddress,
      is_revoked: false,
      expires_at: expiresAt,
    };

    const res = await fetch(`${url}/rest/v1/user_sessions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`REST_SESSION_INSERT_FAILED: HTTP ${res.status} — ${body.slice(0, 240)}`);
    }
    const raw: any = await res.json().catch(() => []);
    const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
    if (rows.length !== 1) throw new Error('REST_SESSION_INSERT_DID_NOT_RETURN_CANONICAL_ROW');
    const mapped = rows.map(s => ({
      id: s.id || id,
      userId: s.user_id || userId,
      ownerId: s.owner_id ?? ownerId,
      surface,
      role,
      refreshTokenHash: s.refresh_token_hash || refreshTokenHash,
      deviceInfo: s.device_info || clientDeviceInfo,
      ipAddress: s.ip_address || ipAddress,
      isRevoked: s.is_revoked ?? false,
      expiresAt: s.expires_at || expiresAt,
      createdAt: s.created_at || new Date().toISOString(),
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 14. SELECT FROM user_sessions WHERE refresh_token_hash = $1
  if (lowerSql.includes('from user_sessions') && lowerSql.includes('refresh_token_hash = $1')) {
    const hash = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent(hash)}`, { headers });
    if (!res.ok) throw new Error(`REST_SESSION_SELECT_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(s => {
      return {
        id: s.id,
        userId: s.user_id,
        ownerId: s.owner_id,
        surface: s.surface,
        role: s.role,
        refreshTokenHash: s.refresh_token_hash,
        deviceInfo: s.device_info,
        ipAddress: s.ip_address,
        isRevoked: s.is_revoked === true || s.is_revoked === 'true',
        expiresAt: s.expires_at,
        createdAt: s.created_at,
      };
    });
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 15. UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1
  if (lowerSql.startsWith('update user_sessions') && lowerSql.includes('is_revoked = true') && lowerSql.includes('refresh_token_hash = $1')) {
    const hash = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent(hash)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ is_revoked: true }),
    });
    if (!res.ok) throw new Error(`REST_SESSION_REVOKE_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    return { rows: [], command: 'UPDATE', rowCount: Array.isArray(raw) ? raw.length : 0, oid: 0, fields: [] };
  }

  // 16. UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1
  if (lowerSql.startsWith('update user_sessions') && lowerSql.includes('is_revoked = true') && lowerSql.includes('user_id = $1')) {
    const userId = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?owner_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ is_revoked: true }),
    });
    if (!res.ok) throw new Error(`REST_SESSION_REVOKE_ALL_FAILED: HTTP ${res.status}`);
    const raw: any = await res.json().catch(() => []);
    return { rows: [], command: 'UPDATE', rowCount: Array.isArray(raw) ? raw.length : 0, oid: 0, fields: [] };
  }

  return null;
}

/**
 * Execute parameterized SQL query against PostgreSQL sola_db
 */
export async function queryDb<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const restResult = await queryViaSupabaseRest(text, params, supabaseUrl, supabaseKey);
      if (restResult) {
        return restResult;
      }
    } catch (restErr: any) {
      throw new Error(`REST_QUERY_ERROR: ${restErr?.message || String(restErr)}`);
    }
  }

  try {
    return await getDbPool().query<T>(text, params);
  } catch (poolErr: any) {
    throw new Error(`POOL_QUERY_ERROR: ${poolErr?.message || String(poolErr)} (sql: ${text.slice(0, 80).replace(/\s+/g, ' ')})`);
  }
}
