import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
import { queryDb } from '../services/dbClient.js';
import { walletDb } from '../services/dbRepository.js';

type EnvSnapshot = Record<'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY', string | undefined>;

function snapshotEnv(): EnvSnapshot {
  return { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

async function captureRestUrl(sql: string, params: any[]) {
  const originalFetch = globalThis.fetch;
  const env = snapshotEnv();
  const calls: string[] = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return { ok: true, json: async () => [], text: async () => '' } as Response;
  }) as typeof fetch;
  try {
    await queryDb(sql, params);
    assert.equal(calls.length, 1);
    return calls[0];
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
}

async function run() {
  const ownerA = '00000000-0000-4000-8000-201013154939';
  const ownerB = '00000000-0000-4000-8000-201000000001';

  const walletUrl = await captureRestUrl(
    `SELECT owner_id AS "ownerId", currency,
            available_balance AS "availableBalance", pending_balance AS "pendingBalance",
            held_balance AS "heldBalance", reserved_for_payout_balance AS "reservedForPayout",
            updated_at AS "updatedAt"
     FROM owner_wallets WHERE owner_id = $1`,
    [ownerA],
  );
  assert.match(walletUrl, new RegExp(`owner_wallets\\?owner_id=eq\\.${ownerA}`));
  assert.doesNotMatch(walletUrl, new RegExp(ownerB));

  const ledgerUrl = await captureRestUrl(
    `SELECT id, owner_id AS "ownerId", booking_id AS "bookingId", payout_request_id AS "payoutRequestId",
            dispute_id AS "disputeId", transaction_type AS type, amount, balance_after AS "newBalance",
            idempotency_key AS "idempotencyKey", created_at AS "createdAt"
     FROM wallet_ledger_entries
     WHERE owner_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [ownerA, 50, 0],
  );
  assert.match(ledgerUrl, new RegExp(`wallet_ledger_entries\\?owner_id=eq\\.${ownerA}`));
  assert.match(ledgerUrl, /order=created_at.desc/);
  assert.match(ledgerUrl, /limit=50/);
  assert.match(ledgerUrl, /offset=0/);

  const originalSummary = walletDb.getOwnerWalletSummary;
  const originalLedger = walletDb.getOwnerLedger;
  const app = new ExpressServerApp();
  const tokenA = signAccessToken({ sub: ownerA, role: 'ROLE_OWNER', phone: '+201013154939' });
  const tokenB = signAccessToken({ sub: ownerB, role: 'ROLE_OWNER', phone: '+201000000001' });
  const observedOwnerIds: string[] = [];
  try {
    (walletDb as any).getOwnerWalletSummary = async (ownerId: string) => {
      observedOwnerIds.push(ownerId);
      return { ownerId, currency: 'EGP', availableBalance: 0, pendingBalance: 1600, heldBalance: 0, reservedForPayout: 0, totalEarnedLifeTime: 1600, totalWithdrawnLifeTime: 0 };
    };
    (walletDb as any).getOwnerLedger = async (ownerId: string) => [{ id: 'ledger-1', ownerId, bookingId: 'booking-1', type: 'DEPOSIT_HELD_IN_ESCROW', amount: 1600, newBalance: 1600, title: 'صافي عربون حجز مؤكد', statusLabel: 'معلق حتى موعد الإتاحة' }];

    const walletResponse = await app.handleHttpRequest('GET', '/api/v1/owner/wallet', { authorization: `Bearer ${tokenA}` });
    assert.equal(walletResponse.statusCode, 200);
    assert.equal(walletResponse.body.data.pendingBalance, 1600);
    assert.equal(walletResponse.body.data.availableBalance, 0);
    assert.equal(observedOwnerIds.at(-1), ownerA);

    const ledgerResponse = await app.handleHttpRequest('GET', '/api/v1/owner/wallet/ledger', { authorization: `Bearer ${tokenA}` }, undefined, new URLSearchParams('limit=50&offset=0'));
    assert.equal(ledgerResponse.statusCode, 200);
    assert.equal(ledgerResponse.body.data[0].type, 'DEPOSIT_HELD_IN_ESCROW');
    assert.equal(ledgerResponse.body.data[0].amount, 1600);

    await app.handleHttpRequest('GET', '/api/v1/owner/wallet', { authorization: `Bearer ${tokenB}` });
    assert.equal(observedOwnerIds.at(-1), ownerB, 'the JWT subject, never a client id, scopes wallet reads');

    (walletDb as any).getOwnerWalletSummary = async () => { throw new Error('database unavailable'); };
    const failedWallet = await app.handleHttpRequest('GET', '/api/v1/owner/wallet', { authorization: `Bearer ${tokenA}` });
    assert.equal(failedWallet.statusCode, 500);
    assert.equal(failedWallet.body.error?.code, 'WALLET_QUERY_FAILED');

    (walletDb as any).getOwnerLedger = async () => { throw new Error('database unavailable'); };
    const failedLedger = await app.handleHttpRequest('GET', '/api/v1/owner/wallet/ledger', { authorization: `Bearer ${tokenA}` });
    assert.equal(failedLedger.statusCode, 500);
    assert.equal(failedLedger.body.error?.code, 'WALLET_LEDGER_QUERY_FAILED');
  } finally {
    (walletDb as any).getOwnerWalletSummary = originalSummary;
    (walletDb as any).getOwnerLedger = originalLedger;
  }

  const [repositorySource, contextSource, walletViewSource] = await Promise.all([
    readFile(new URL('../services/dbRepository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../../owner-app/src/context/AppContext.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../../../owner-app/src/components/wallet/WalletFoundationView.tsx', import.meta.url), 'utf8'),
  ]);
  const walletSection = repositorySource.slice(repositorySource.indexOf('export const walletDb'), repositorySource.indexOf('// ----------------------------------------------------------------------------\n// 8. OTP'));
  assert.match(walletSection, /FROM owner_wallets WHERE owner_id = \$1/);
  assert.match(walletSection, /FROM wallet_ledger_entries/);
  assert.doesNotMatch(walletSection, /base_price_per_night|JOIN properties|DEPOSIT_CREDIT' AS/);
  assert.match(contextSource, /walletError/);
  assert.match(contextSource, /Promise\.allSettled/);
  assert.doesNotMatch(contextSource, /repo\.wallet\.getOwnerWallet\(\)\.catch\(\(\) => null\)/);
  assert.match(walletViewSource, /disabled=\{!canRequestPayout\}/);
  assert.match(walletViewSource, /refreshWallet/);

  console.log('OWNER-WALLET-01 canonical wallet and ledger regressions passed.');
}

run().catch((error) => { console.error(error); process.exit(1); });
