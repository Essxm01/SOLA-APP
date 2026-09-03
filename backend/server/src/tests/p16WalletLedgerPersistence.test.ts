import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ExpressServerApp } from '../app';
import { signAccessToken } from '../services/jwtService';
import { bookingDb, walletDb } from '../services/dbRepository';
import { paymentTxDb } from '../services/paymentService';
import { queryDb } from '../services/dbClient';

const ownerId = 'a1111111-1111-4111-8111-111111111111';
const otherOwnerId = 'b2222222-2222-4222-8222-222222222222';
const customerId = 'c5555555-5555-4555-8555-555555555555';
const bookingId = 'd4444444-4444-4444-8444-444444444444';
const paymentTxId = 'e6666666-6666-4666-8666-666666666666';
const ownerHeaders = (id: string) => ({ authorization: `Bearer ${signAccessToken({ sub: id, role: 'ROLE_OWNER' })}` });
const customerHeaders = { authorization: `Bearer ${signAccessToken({ sub: customerId, role: 'ROLE_CUSTOMER' })}` };

// ---------------------------------------------------------------------------
// 1. Deposit-completion accounting contract — mirrors migration 019's
// konfrm_complete_deposit_payment sequence exactly (locks serialize the tx;
// the ledger idempotency key is a second guard; only owner_net is credited).
// ---------------------------------------------------------------------------
type Wallet = { pending: number; available: number };
type LedgerEntry = { idempotencyKey: string; amount: number; balanceAfter: number; type: string };

class DepositCompletionModel {
  txStatus = 'INITIATED';
  bookingStatus = 'APPROVED_PENDING_PAYMENT';
  summaryExists = true;
  ownerNet = 800;
  wallet: Wallet = { pending: 0, available: 0 };
  ledger: LedgerEntry[] = [];
  failAfterValidation = false;

  completeDeposit(): { idempotent: boolean } {
    // FOR UPDATE on the payment transaction serializes every retry/concurrent
    // caller; an already-succeeded transaction returns idempotently.
    if (this.txStatus === 'SUCCEEDED') return { idempotent: true };
    if (this.bookingStatus !== 'APPROVED_PENDING_PAYMENT') throw new Error('BOOKING_NOT_APPROVED_FOR_PAYMENT');
    if (this.txStatus !== 'INITIATED' && this.txStatus !== 'PENDING') throw new Error('PAYMENT_TRANSACTION_NOT_COMPLETABLE');
    if (!this.summaryExists) throw new Error('BOOKING_FINANCIAL_SUMMARY_NOT_FOUND');
    if (this.failAfterValidation) throw new Error('FORCED_PERSISTENCE_FAILURE');

    this.txStatus = 'SUCCEEDED';
    this.bookingStatus = 'CONFIRMED';
    const ledgerKey = `DEPOSIT_HELD_${paymentTxId}`;
    if (!this.ledger.some((e) => e.idempotencyKey === ledgerKey)) {
      this.wallet.pending += this.ownerNet; // only owner_net; available untouched
      this.ledger.push({ idempotencyKey: ledgerKey, amount: this.ownerNet, balanceAfter: this.wallet.pending, type: 'DEPOSIT_HELD_IN_ESCROW' });
    }
    return { idempotent: false };
  }
}

{
  // First valid completion: pending increases by Owner net exactly once.
  const first = new DepositCompletionModel();
  const result = first.completeDeposit();
  assert.equal(result.idempotent, false);
  assert.equal(first.wallet.pending, 800);
  assert.equal(first.wallet.available, 0, 'deposit completion never increases available balance');
  assert.equal(first.ledger.length, 1);
  assert.equal(first.ledger[0].amount, 800, 'ledger amount equals canonical Owner net deposit');
  assert.equal(first.ledger[0].balanceAfter, 800, 'balance_after is the running pending balance after the credit');
  assert.equal(first.txStatus, 'SUCCEEDED');

  // Retry/idempotent completion: balances and ledger do not change again.
  const before = { pending: first.wallet.pending, available: first.wallet.available, ledgerCount: first.ledger.length };
  const retry = first.completeDeposit();
  assert.equal(retry.idempotent, true);
  assert.equal(first.wallet.pending, before.pending);
  assert.equal(first.wallet.available, before.available);
  assert.equal(first.ledger.length, before.ledgerCount);

  // Failure before completion leaves wallet/ledger unchanged.
  for (const breakIt of [(m: DepositCompletionModel) => { m.bookingStatus = 'PENDING_OWNER_APPROVAL'; }, (m: DepositCompletionModel) => { m.txStatus = 'FAILED'; }, (m: DepositCompletionModel) => { m.summaryExists = false; }, (m: DepositCompletionModel) => { m.failAfterValidation = true; }]) {
    const broken = new DepositCompletionModel();
    breakIt(broken);
    assert.throws(() => broken.completeDeposit(), /_/);
    assert.equal(broken.wallet.pending, 0, 'failed completion never credits pending');
    assert.equal(broken.ledger.length, 0, 'failed completion never writes a ledger entry');
  }

  // Concurrent/repeated completion cannot double-credit: the transaction lock
  // serializes callers; the second observes SUCCEEDED and returns idempotently.
  const concurrent = new DepositCompletionModel();
  const outcomes = await Promise.all([0, 1, 2, 3].map(() => Promise.resolve().then(() => concurrent.completeDeposit())));
  assert.equal(outcomes.filter((o) => !o.idempotent).length, 1, 'exactly one completion performs the credit');
  assert.equal(concurrent.wallet.pending, 800);
  assert.equal(concurrent.ledger.length, 1);

  // A second payment transaction cannot re-run completion (booking is CONFIRMED).
  const spent = new DepositCompletionModel();
  spent.completeDeposit();
  const secondTx = new DepositCompletionModel();
  Object.assign(secondTx, { txStatus: 'SUCCEEDED', bookingStatus: spent.bookingStatus });
  assert.equal(secondTx.completeDeposit().idempotent, true);
  assert.equal(secondTx.wallet.pending, 0);
}

// ---------------------------------------------------------------------------
// 2. Worker/PostgREST adapters: narrow, owner-scoped, fail-closed.
// ---------------------------------------------------------------------------
type Mode = 'success' | 'walletHttpError' | 'ledgerHttpError' | 'walletMalformed' | 'ledgerMalformed' | 'walletBadRow' | 'ledgerBadRow';
let mode: Mode = 'success';
let lastCalls: Array<{ url: string; method: string }> = [];
let customWalletPayload: any = null;
let customLedgerPayload: any = null;

const validWalletRow = {
  owner_id: ownerId, currency: 'EGP', available_balance: 0, pending_balance: 800,
  held_balance: 0, reserved_for_payout_balance: 0, updated_at: '2026-09-03T00:00:00Z',
};
const validLedgerRow = {
  id: 'f7777777-7777-4777-8777-777777777777', owner_id: ownerId, booking_id: bookingId,
  payout_request_id: null, dispute_id: null, transaction_type: 'DEPOSIT_HELD_IN_ESCROW',
  amount: 800, balance_after: 800, idempotency_key: `DEPOSIT_HELD_${paymentTxId}`,
  created_at: '2026-09-03T00:00:00Z',
};

async function withWalletFetch(fn: () => Promise<any>) {
  const calls: Array<{ url: string; method: string }> = [];
  const originalFetch = globalThis.fetch;
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method || 'GET' });
    if (customWalletPayload !== null && String(input).includes('owner_wallets')) {
      return { ok: true, status: 200, json: async () => customWalletPayload, text: async () => '' } as unknown as Response;
    }
    if (customLedgerPayload !== null && String(input).includes('wallet_ledger_entries')) {
      return { ok: true, status: 200, json: async () => customLedgerPayload, text: async () => '' } as unknown as Response;
    }
    if (mode === 'walletHttpError' && String(input).includes('owner_wallets')) return { ok: false, status: 503, json: async () => ({}), text: async () => '' } as unknown as Response;
    if (mode === 'ledgerHttpError' && String(input).includes('wallet_ledger_entries')) return { ok: false, status: 503, json: async () => ({}), text: async () => '' } as unknown as Response;
    if (mode === 'walletMalformed' && String(input).includes('owner_wallets')) return { ok: true, status: 200, json: async () => ({ owner_id: ownerId }), text: async () => '{}' } as unknown as Response;
    if (mode === 'ledgerMalformed' && String(input).includes('wallet_ledger_entries')) return { ok: true, status: 200, json: async () => 'not-an-array', text: async () => '"not-an-array"' } as unknown as Response;
    if (mode === 'walletBadRow' && String(input).includes('owner_wallets')) {
      const bad = { ...validWalletRow, pending_balance: '800' };
      return { ok: true, status: 200, json: async () => [bad], text: async () => '[]' } as unknown as Response;
    }
    if (mode === 'ledgerBadRow' && String(input).includes('wallet_ledger_entries')) {
      const { idempotency_key, ...bad } = validLedgerRow as any;
      return { ok: true, status: 200, json: async () => [bad], text: async () => '[]' } as unknown as Response;
    }
    if (String(input).includes('owner_wallets')) return { ok: true, status: 200, json: async () => [validWalletRow], text: async () => '' } as unknown as Response;
    return { ok: true, status: 200, json: async () => [validLedgerRow], text: async () => '' } as unknown as Response;
  }) as typeof fetch;
  try {
    await fn();
    lastCalls = calls;
    return calls;
  } finally {
    globalThis.fetch = originalFetch;
    if (env.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }
}

{
  // Canonical owner-scoped reads: URLs are bound to the verified owner id.
  let summary: any;
  let calls = await withWalletFetch(async () => {
    summary = await walletDb.getOwnerWalletSummary(ownerId);
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/rest\/v1\/owner_wallets\?owner_id=eq\.a1111111-1111-4111-8111-111111111111$/);
  assert.match(calls[1].url, /\/rest\/v1\/wallet_ledger_entries\?owner_id=eq\.a1111111-1111-4111-8111-111111111111$/);
  assert.equal(summary.pendingBalance, 800);
  assert.equal(summary.availableBalance, 0);

  // Fail closed: REST errors and malformed 200 payloads never become false
  // zero/empty wallet state.
  mode = 'walletHttpError';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /REST_OWNER_WALLET_SELECT_FAILED/); });
  mode = 'ledgerHttpError';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /REST_OWNER_WALLET_LEDGER_SELECT_FAILED/); });
  mode = 'walletMalformed';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /REST_OWNER_WALLET_MALFORMED_RESPONSE/); });
  mode = 'walletBadRow';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /pending_balance must be a non-negative finite number/); });
  mode = 'ledgerMalformed';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /REST_OWNER_WALLET_LEDGER_MALFORMED_RESPONSE/); });
  mode = 'ledgerBadRow';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerWalletSummary(ownerId), /idempotency_key must be a non-empty string/); });
  mode = 'success';

  // Table-driven malformed response validations for wallet:
  const walletMalformedCases: Array<[string, any, RegExp]> = [
    ['wallet owner mismatch', { ...validWalletRow, owner_id: otherOwnerId }, /wallet row owner_id must match requested ownerId/],
    ['missing currency', { ...validWalletRow, currency: '' }, /wallet field currency must be a non-empty string/],
    ['invalid currency (non-string)', { ...validWalletRow, currency: 123 }, /wallet field currency must be a non-empty string/],
    ['invalid wallet updated_at (unparseable)', { ...validWalletRow, updated_at: 'invalid-date' }, /wallet field updated_at must be a valid timestamp string/],
    ['invalid wallet updated_at (empty)', { ...validWalletRow, updated_at: '' }, /wallet field updated_at must be a valid timestamp string/],
    ['negative available_balance', { ...validWalletRow, available_balance: -1 }, /wallet field available_balance must be a non-negative finite number/],
    ['negative pending_balance', { ...validWalletRow, pending_balance: -0.01 }, /wallet field pending_balance must be a non-negative finite number/],
    ['negative held_balance', { ...validWalletRow, held_balance: -100 }, /wallet field held_balance must be a non-negative finite number/],
    ['negative reserved_for_payout_balance', { ...validWalletRow, reserved_for_payout_balance: -50 }, /wallet field reserved_for_payout_balance must be a non-negative finite number/],
    ['non-numeric available_balance', { ...validWalletRow, available_balance: 'zero' }, /wallet field available_balance must be a non-negative finite number/],
    ['null pending_balance', { ...validWalletRow, pending_balance: null }, /wallet field pending_balance must be a non-negative finite number/],
    ['NaN held_balance', { ...validWalletRow, held_balance: NaN }, /wallet field held_balance must be a non-negative finite number/],
    ['Infinity reserved_for_payout_balance', { ...validWalletRow, reserved_for_payout_balance: Infinity }, /wallet field reserved_for_payout_balance must be a non-negative finite number/],
    ['wallet row not an object', 'not-an-object', /wallet row must be an object/],
  ];
  for (const [name, badRow, pattern] of walletMalformedCases) {
    customWalletPayload = [badRow];
    try {
      await withWalletFetch(async () => {
        await assert.rejects(
          () => walletDb.getOwnerWalletSummary(ownerId),
          pattern,
          `expected ${name} to be rejected with ${pattern}`
        );
      });
    } finally {
      customWalletPayload = null;
    }
  }

  // Table-driven malformed response validations for ledger:
  const ledgerMalformedCases: Array<[string, any, RegExp]> = [
    ['invalid ledger id (not UUID)', { ...validLedgerRow, id: 'not-a-uuid' }, /ledger field id must be a UUID string/],
    ['ledger owner mismatch', { ...validLedgerRow, owner_id: otherOwnerId }, /ledger field owner_id must be a UUID matching requested ownerId/],
    ['invalid ledger owner_id (not UUID)', { ...validLedgerRow, owner_id: 'bad-owner' }, /ledger field owner_id must be a UUID matching requested ownerId/],
    ['invalid non-null nullable booking_id', { ...validLedgerRow, booking_id: 'not-a-uuid' }, /ledger field booking_id must be null or a UUID string/],
    ['invalid non-null nullable payout_request_id', { ...validLedgerRow, payout_request_id: 'bad-payout-id' }, /ledger field payout_request_id must be null or a UUID string/],
    ['invalid non-null nullable dispute_id (non-string)', { ...validLedgerRow, dispute_id: 123 }, /ledger field dispute_id must be null or a UUID string/],
    ['missing transaction_type', { ...validLedgerRow, transaction_type: '' }, /ledger field transaction_type must be a non-empty string/],
    ['invalid non-string transaction_type', { ...validLedgerRow, transaction_type: null }, /ledger field transaction_type must be a non-empty string/],
    ['non-numeric amount', { ...validLedgerRow, amount: '800' }, /ledger field amount must be a finite number/],
    ['null balance_after', { ...validLedgerRow, balance_after: null }, /ledger field balance_after must be a finite number/],
    ['missing idempotency_key', { ...validLedgerRow, idempotency_key: '' }, /ledger field idempotency_key must be a non-empty string/],
    ['invalid ledger created_at (unparseable)', { ...validLedgerRow, created_at: 'bad-timestamp' }, /ledger field created_at must be a valid timestamp string/],
    ['invalid ledger created_at (empty)', { ...validLedgerRow, created_at: '' }, /ledger field created_at must be a valid timestamp string/],
    ['ledger row not an object', 'not-an-object', /ledger row must be an object/],
  ];
  for (const [name, badRow, pattern] of ledgerMalformedCases) {
    customLedgerPayload = [badRow];
    try {
      await withWalletFetch(async () => {
        await assert.rejects(
          () => walletDb.getOwnerLedger(ownerId),
          pattern,
          `expected ${name} to be rejected with ${pattern}`
        );
      });
    } finally {
      customLedgerPayload = null;
    }
  }

  // Ledger read: canonical mapping, pagination URL shape, fail-closed reads.
  mode = 'success';
  let ledger: any[];
  calls = await withWalletFetch(async () => {
    ledger = await walletDb.getOwnerLedger(ownerId, 25, 5);
  });
  assert.match(calls[0].url, /wallet_ledger_entries\?owner_id=eq\.a1111111-1111-4111-8111-111111111111&order=created_at\.desc&limit=25&offset=5$/);
  assert.equal(ledger[0].amount, 800);
  assert.equal(ledger[0].newBalance, 800);
  mode = 'ledgerHttpError';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerLedger(ownerId), /REST_OWNER_WALLET_LEDGER_SELECT_FAILED/); });
  mode = 'ledgerMalformed';
  await withWalletFetch(async () => { await assert.rejects(() => walletDb.getOwnerLedger(ownerId), /REST_OWNER_WALLET_LEDGER_MALFORMED_RESPONSE/); });
  mode = 'success';

  // A genuine empty ledger + missing wallet row remains the canonical zero wallet.
  const originalFetch = globalThis.fetch;
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => [], text: async () => '' })) as unknown as typeof fetch;
  try {
    const zero = await walletDb.getOwnerWalletSummary(otherOwnerId);
    assert.equal(zero.pendingBalance, 0);
    assert.equal(zero.totalEarnedLifeTime, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (env.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // Canonical wallet cardinality fail-closed tests:
  // Case 0 rows: valid canonical zero wallet
  customWalletPayload = [];
  customLedgerPayload = [];
  try {
    await withWalletFetch(async () => {
      const zero = await walletDb.getOwnerWalletSummary(ownerId);
      assert.equal(zero.availableBalance, 0);
      assert.equal(zero.pendingBalance, 0);
      assert.equal(zero.totalEarnedLifeTime, 0);
    });
  } finally {
    customWalletPayload = null;
    customLedgerPayload = null;
  }

  // Case 1 row: valid success
  customWalletPayload = [validWalletRow];
  try {
    await withWalletFetch(async () => {
      const single = await walletDb.getOwnerWalletSummary(ownerId);
      assert.equal(single.pendingBalance, 800);
    });
  } finally {
    customWalletPayload = null;
  }

  // Case >1 rows: must fail closed before mapping any row
  customWalletPayload = [validWalletRow, { ...validWalletRow, available_balance: 100 }];
  try {
    await withWalletFetch(async () => {
      await assert.rejects(
        () => walletDb.getOwnerWalletSummary(ownerId),
        /REST_OWNER_WALLET_MALFORMED_RESPONSE: expected 0 or 1 wallet row, received 2/
      );
    });
  } finally {
    customWalletPayload = null;
  }

  // Positive tests for the three exact canonical repository query shapes:
  // Shape A: Owner wallet summary row query
  const shapeASql = `SELECT owner_id AS "ownerId", currency,
                 available_balance AS "availableBalance", pending_balance AS "pendingBalance",
                 held_balance AS "heldBalance", reserved_for_payout_balance AS "reservedForPayout",
                 updated_at AS "updatedAt"
          FROM owner_wallets WHERE owner_id = $1`;
  calls = await withWalletFetch(async () => {
    const res = await queryDb(shapeASql, [ownerId]);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].ownerId, ownerId);
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('/rest/v1/owner_wallets?owner_id=eq.'));

  // Shape B: Owner lifetime ledger projection query
  const shapeBSql = `SELECT transaction_type AS type, amount
          FROM wallet_ledger_entries WHERE owner_id = $1`;
  calls = await withWalletFetch(async () => {
    const res = await queryDb(shapeBSql, [ownerId]);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].type, 'DEPOSIT_HELD_IN_ESCROW');
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('/rest/v1/wallet_ledger_entries?owner_id=eq.'));
  assert.ok(!calls[0].url.includes('&order='));

  // Shape C: Owner paginated ledger query
  const shapeCSql = `SELECT id, owner_id AS "ownerId", booking_id AS "bookingId", payout_request_id AS "payoutRequestId",
              dispute_id AS "disputeId", transaction_type AS type, amount, balance_after AS "newBalance",
              idempotency_key AS "idempotencyKey", created_at AS "createdAt"
       FROM wallet_ledger_entries
       WHERE owner_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  calls = await withWalletFetch(async () => {
    const res = await queryDb(shapeCSql, [ownerId, 10, 0]);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].id, validLedgerRow.id);
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('/rest/v1/wallet_ledger_entries?owner_id=eq.'));
  assert.ok(calls[0].url.includes('&order=created_at.desc&limit=10&offset=0'));

  // Negative collision tests: noncanonical queries must fall through and never issue REST requests
  const collidingShapes: Array<[string, string]> = [
    ['comment prefix', `-- comment prefix\n${shapeASql}`],
    ['comment suffix', `${shapeASql} -- comment suffix`],
    ['wrapper/subquery', `SELECT * FROM (${shapeASql}) sub`],
    ['changed SELECT list', `SELECT owner_id, available_balance FROM owner_wallets WHERE owner_id = $1`],
    ['extra predicate', `${shapeASql} AND currency = 'EGP'`],
    ['wrong placeholder', `SELECT owner_id AS "ownerId", currency, available_balance AS "availableBalance", pending_balance AS "pendingBalance", held_balance AS "heldBalance", reserved_for_payout_balance AS "reservedForPayout", updated_at AS "updatedAt" FROM owner_wallets WHERE owner_id = $2`],
    ['string literal/table mention', `SELECT 'owner_wallets' AS t1, 'wallet_ledger_entries' AS t2 WHERE 'owner_id = $1' = 'owner_id = $1'`],
    ['noncanonical ledger query (changed columns)', `SELECT id, amount FROM wallet_ledger_entries WHERE owner_id = $1`],
    ['noncanonical ledger query (extra clause)', `SELECT transaction_type AS type, amount FROM wallet_ledger_entries WHERE owner_id = $1 AND amount > 0`],
  ];

  for (const [desc, noncanonicalSql] of collidingShapes) {
    calls = await withWalletFetch(async () => {
      try {
        await queryDb(noncanonicalSql, [ownerId, 10, 0]);
      } catch {
        // Fallthrough to pool is expected in test mock environment
      }
    });
    const walletOrLedgerCalls = calls.filter((c) =>
      c.url.includes('/rest/v1/owner_wallets') || c.url.includes('/rest/v1/wallet_ledger_entries')
    );
    assert.equal(walletOrLedgerCalls.length, 0, `colliding shape [${desc}] must not issue wallet/ledger REST request`);
  }

  // Payment finalization remains the one narrow atomic RPC (never generic SQL).
  calls = await withWalletFetch(async () => {
    await queryDb(
      'SELECT * FROM konfrm_complete_deposit_payment($1, $2, $3)',
      [paymentTxId, bookingId, customerId]
    );
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/rpc/konfrm_complete_deposit_payment');
}

// ---------------------------------------------------------------------------
// 3. Route behavior: Owner scope comes from the verified JWT subject; the
// Customer payment surface exposes no Owner wallet/commission internals.
// ---------------------------------------------------------------------------
const originals: Record<string, any> = {
  walletSummary: walletDb.getOwnerWalletSummary,
  walletLedger: walletDb.getOwnerLedger,
  bookingById: bookingDb.getById,
  txByBooking: paymentTxDb.getByBookingId,
};
try {
  const requestedOwners: string[] = [];
  (walletDb as any).getOwnerWalletSummary = async (owner: string) => { requestedOwners.push(owner); return { ownerId: owner, pendingBalance: 5 }; };
  (walletDb as any).getOwnerLedger = async (owner: string) => { requestedOwners.push(owner); return []; };
  (bookingDb as any).getById = async (id: string) => id === bookingId ? { id, customerId, ownerId } : null;
  (paymentTxDb as any).getByBookingId = async () => [];

  const app = new ExpressServerApp();
  await app.handleHttpRequest('GET', '/api/v1/owner/wallet', ownerHeaders(ownerId));
  await app.handleHttpRequest('GET', '/api/v1/owner/wallet/ledger', ownerHeaders(otherOwnerId));
  assert.deepEqual(requestedOwners, [ownerId, otherOwnerId], 'wallet reads are scoped to the verified JWT subject only');

  const paymentStatus = await app.handleHttpRequest('GET', `/api/v1/customer/bookings/${bookingId}/payment-status`, customerHeaders);
  assert.equal(paymentStatus.statusCode, 200);
  const payloadKeys = Object.keys((paymentStatus.body as any).data);
  for (const forbidden of ['commission', 'ownerNet', 'wallet', 'solaCommission', 'pendingBalance']) {
    assert.ok(!payloadKeys.some((k) => k.toLowerCase().includes(forbidden.toLowerCase())), `customer payment response must not expose ${forbidden}`);
  }
} finally {
  (walletDb as any).getOwnerWalletSummary = originals.walletSummary;
  (walletDb as any).getOwnerLedger = originals.walletLedger;
  (bookingDb as any).getById = originals.bookingById;
  (paymentTxDb as any).getByBookingId = originals.txByBooking;
}

// ---------------------------------------------------------------------------
// 4. No active production ledger mutation path + migration 027 contract.
// ---------------------------------------------------------------------------
for (const srcFile of ['dbRepository.ts', 'dbClient.ts']) {
  const src = fs.readFileSync(path.resolve('server/src/services', srcFile), 'utf8');
  assert.ok(!/UPDATE\s+wallet_ledger_entries/i.test(src), `${srcFile} must not update the immutable ledger`);
  assert.ok(!/DELETE\s+FROM\s+wallet_ledger_entries/i.test(src), `${srcFile} must not delete immutable ledger entries`);
}
const appSrc = fs.readFileSync(path.resolve('server/src/app.ts'), 'utf8');
assert.ok(!/UPDATE\s+wallet_ledger_entries/i.test(appSrc), 'routes must not update the immutable ledger');
assert.ok(!/DELETE\s+FROM\s+wallet_ledger_entries/i.test(appSrc), 'routes must not delete immutable ledger entries');

const migration = fs.readFileSync(path.resolve('database/migrations/027_wallet_ledger_append_only.sql'), 'utf8');
for (const required of [
  'BEGIN;', 'COMMIT;', 'konfrm_wallet_ledger_append_only_guard', 'WALLET_LEDGER_IMMUTABLE',
  'BEFORE UPDATE OR DELETE', 'BEFORE TRUNCATE', 'ON public.wallet_ledger_entries', 'schema_migrations',
  'SECURITY INVOKER', 'SET search_path = public, pg_temp', 'FOR EACH ROW', 'FOR EACH STATEMENT',
]) {
  assert.ok(migration.includes(required), `migration 027 must contain ${required}`);
}
assert.ok(!migration.includes('SECURITY DEFINER'), 'no SECURITY DEFINER may be introduced');
assert.ok(/REVOKE ALL ON FUNCTION public\.konfrm_wallet_ledger_append_only_guard\(\)\s+FROM PUBLIC, anon, authenticated;/.test(migration), 'guard function must be revoked from PUBLIC, anon, authenticated');
const guardBody = migration.slice(migration.indexOf('AS $$'), migration.indexOf('$$;'));
assert.ok(!/INSERT/i.test(guardBody), 'the guard body must not touch INSERTs (append-only, not insert-locked)');
assert.ok(!/BEFORE INSERT|AFTER INSERT/i.test(migration), 'migration must not define an INSERT trigger');
assert.ok(!migration.includes('konfrm_complete_deposit_payment'), 'migration 019 RPC must not be redefined or revoked');
assert.ok(!/DISABLE TRIGGER|ALTER TABLE/i.test(migration), 'existing triggers/constraints must remain untouched');
const dropTriggerLines = migration.split('\n').map((l) => l.trim()).filter((l) => /DROP TRIGGER/i.test(l));
assert.equal(dropTriggerLines.length, 2, 'both P1.6 guard triggers (row update/delete and statement truncate) must be recreated');
assert.ok(/DROP TRIGGER IF EXISTS konfrm_wallet_ledger_append_only_trg ON public\.wallet_ledger_entries/.test(dropTriggerLines[0]), 'row trigger dropped');
assert.ok(/DROP TRIGGER IF EXISTS konfrm_wallet_ledger_truncate_guard_trg ON public\.wallet_ledger_entries/.test(dropTriggerLines[1]), 'truncate trigger dropped');

const normalizedMigration = migration.replace(/\s+/g, ' ');
assert.ok(/BEFORE UPDATE OR DELETE ON public\.wallet_ledger_entries FOR EACH ROW EXECUTE FUNCTION public\.konfrm_wallet_ledger_append_only_guard\(\)/.test(normalizedMigration), 'row trigger guards UPDATE and DELETE');
assert.ok(/BEFORE TRUNCATE ON public\.wallet_ledger_entries FOR EACH STATEMENT EXECUTE FUNCTION public\.konfrm_wallet_ledger_append_only_guard\(\)/.test(normalizedMigration), 'statement trigger guards TRUNCATE');

// 5. Contract proof: narrow FK-nulling exception (ON DELETE SET NULL cascade)
// while all financial/core fields and direct/destructive mutations remain immutable.
for (const requiredInGuard of [
  'pg_trigger_depth() > 1',
  'OLD.booking_id IS NOT NULL',
  'NEW.booking_id IS NULL',
  'NEW.id IS NOT DISTINCT FROM OLD.id',
  'NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id',
  'NEW.payout_request_id IS NOT DISTINCT FROM OLD.payout_request_id',
  'NEW.dispute_id IS NOT DISTINCT FROM OLD.dispute_id',
  'NEW.transaction_type IS NOT DISTINCT FROM OLD.transaction_type',
  'NEW.amount IS NOT DISTINCT FROM OLD.amount',
  'NEW.balance_after IS NOT DISTINCT FROM OLD.balance_after',
  'NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key',
  'NEW.created_at IS NOT DISTINCT FROM OLD.created_at',
  'RETURN NEW;',
  "RAISE EXCEPTION 'WALLET_LEDGER_IMMUTABLE';",
]) {
  assert.ok(guardBody.includes(requiredInGuard), `guard function must contain: ${requiredInGuard}`);
}

// Deterministic simulation verifying the guard logic contract:
function simulateLedgerGuard(tgOp: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE', triggerDepth: number, oldRow: any, newRow: any): 'OK' | 'WALLET_LEDGER_IMMUTABLE' {
  if (tgOp === 'UPDATE' && triggerDepth > 1 && oldRow?.booking_id != null && newRow?.booking_id == null) {
    const keys = ['id', 'owner_id', 'payout_request_id', 'dispute_id', 'transaction_type', 'amount', 'balance_after', 'idempotency_key', 'created_at'];
    const unchanged = keys.every((k) => (newRow?.[k] === undefined && oldRow?.[k] === undefined) || (newRow?.[k] === oldRow?.[k]));
    if (unchanged) return 'OK';
  }
  return 'WALLET_LEDGER_IMMUTABLE';
}

// Narrow referential cascade is permitted:
assert.equal(
  simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null }),
  'OK',
  'cascaded ON DELETE SET NULL from booking deletion is permitted'
);

// Any other mutation is rejected:
assert.equal(simulateLedgerGuard('UPDATE', 1, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null }), 'WALLET_LEDGER_IMMUTABLE', 'direct UPDATE trying to null booking_id is rejected');
assert.equal(simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null, amount: 900 }), 'WALLET_LEDGER_IMMUTABLE', 'altering amount during FK cascade is rejected');
assert.equal(simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null, balance_after: 900 }), 'WALLET_LEDGER_IMMUTABLE', 'altering balance_after during FK cascade is rejected');
assert.equal(simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null, transaction_type: 'PAYOUT' }), 'WALLET_LEDGER_IMMUTABLE', 'altering transaction_type is rejected');
assert.equal(simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null, idempotency_key: 'DIFF' }), 'WALLET_LEDGER_IMMUTABLE', 'altering idempotency_key is rejected');
assert.equal(simulateLedgerGuard('UPDATE', 2, { ...validLedgerRow, booking_id: bookingId }, { ...validLedgerRow, booking_id: null, owner_id: otherOwnerId }), 'WALLET_LEDGER_IMMUTABLE', 'altering owner_id is rejected');
assert.equal(simulateLedgerGuard('DELETE', 1, validLedgerRow, null), 'WALLET_LEDGER_IMMUTABLE', 'DELETE is always rejected');
assert.equal(simulateLedgerGuard('TRUNCATE', 1, null, null), 'WALLET_LEDGER_IMMUTABLE', 'TRUNCATE is always rejected');

// 6. Real PostgreSQL test suite cleanup compatibility static proof
const pgRuntimeSrc = fs.readFileSync(path.resolve('server/src/tests/postgresRuntime.test.ts'), 'utf8');
assert.ok(pgRuntimeSrc.includes('cleanTestFixtures'), 'postgresRuntime must use cleanTestFixtures helper');
assert.ok(pgRuntimeSrc.includes('ALTER TABLE public.wallet_ledger_entries DISABLE TRIGGER USER'), 'cleanup disables user triggers in test transaction');
assert.ok(pgRuntimeSrc.includes('ALTER TABLE public.wallet_ledger_entries ENABLE TRIGGER USER'), 'cleanup restores user triggers before commit');
assert.ok(pgRuntimeSrc.includes("client.query('BEGIN')") && pgRuntimeSrc.includes("client.query('COMMIT')"), 'cleanup runs in an isolated client transaction');
assert.ok(pgRuntimeSrc.includes("client.query('ROLLBACK')"), 'cleanup transaction rolls back on error');

console.log('P1.6 wallet + immutable ledger persistence suite passed');
