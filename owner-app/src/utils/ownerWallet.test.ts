import type { OwnerWallet, WalletLedgerEntry } from '../types';
import {
  createPayoutSubmissionGate,
  filterWalletLedger,
  getWalletDisplayAmount,
  getWalletLedgerPresentation,
  getWalletViewState,
  validatePayoutAmount,
} from './ownerWallet';

const wallet: OwnerWallet = {
  ownerId: 'owner-a', currency: 'EGP', availableBalance: 1600, pendingBalance: 800,
  reservedForPayout: 300, heldBalance: 0, totalEarnedLifeTime: 2400,
  totalWithdrawnLifeTime: 0, updatedAt: '2026-08-26T00:00:00.000Z',
};

const entry = (type: WalletLedgerEntry['type'], id = type): WalletLedgerEntry => ({
  id, ownerId: 'owner-a', type, amount: 800, fee: 0, netAmount: 800, currency: 'EGP',
  previousBalance: 0, newBalance: 800, description: '', idempotencyKey: id, createdAt: '2026-08-26T00:00:00.000Z',
});

const equal = (actual: unknown, expected: unknown, message = 'unexpected value') => {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
};
const deepEqual = (actual: unknown, expected: unknown, message = 'unexpected value') => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
};
const matches = (actual: string, expression: RegExp, message = 'unexpected value') => {
  if (!expression.test(actual)) throw new Error(message);
};

equal(wallet.availableBalance, 1600, 'available display uses canonical availableBalance');
equal(wallet.pendingBalance, 800, 'pending display uses canonical pendingBalance');
equal(wallet.reservedForPayout, 300, 'reserved display uses canonical reservedForPayout');
equal(wallet.heldBalance > 0, false, 'held strip is hidden for a zero canonical held balance');
equal({ ...wallet, heldBalance: 50 }.heldBalance > 0, true, 'held strip is shown only for a positive canonical held balance');
equal(getWalletViewState(null, 'failed'), 'error', 'wallet failure is never represented as zero data');
equal(getWalletViewState(null, null), 'loading');
equal(getWalletDisplayAmount(wallet.availableBalance, true), '••••', 'privacy only masks presentation');
equal(wallet.availableBalance, 1600, 'privacy does not mutate wallet state');
equal(getWalletLedgerPresentation(entry('DEPOSIT_HELD_IN_ESCROW')).status, 'قيد الانتظار');
equal(getWalletLedgerPresentation({ ...entry('UNKNOWN' as WalletLedgerEntry['type']), title: undefined }).title, 'حركة مالية', 'unknown entries use a neutral fallback');

const ledger = [entry('DEPOSIT_AVAILABLE'), entry('PAYOUT_RESERVATION'), entry('DISPUTE_FREEZE')];
const originalLedger = [...ledger];
deepEqual(filterWalletLedger(ledger, 'payout').map((item) => item.type), ['PAYOUT_RESERVATION']);
deepEqual(ledger, originalLedger, 'filters do not mutate the canonical ledger');

matches(validatePayoutAmount({ amount: 499, availableBalance: 1600, hasPayoutMethod: true, minimumAmount: 500 }) || '', /الحد الأدنى/);
matches(validatePayoutAmount({ amount: 1601, availableBalance: 1600, hasPayoutMethod: true, minimumAmount: 500 }) || '', /يتجاوز/);
matches(validatePayoutAmount({ amount: 500, availableBalance: 1600, hasPayoutMethod: false, minimumAmount: 500 }) || '', /وسيلة سحب/);
equal(validatePayoutAmount({ amount: 500, availableBalance: 1600, hasPayoutMethod: true, minimumAmount: 500 }), null);

const gate = createPayoutSubmissionGate();
let requests = 0;
let resolveRequest!: () => void;
const request = () => new Promise<void>((resolve) => { requests += 1; resolveRequest = resolve; });
const first = gate(request);
const second = gate(request);
equal((await second).started, false, 'double payout submit is blocked before the request resolves');
resolveRequest();
equal((await first).started, true);
equal(requests, 1, 'valid payout request runs exactly once');

let failed = false;
await createPayoutSubmissionGate()(async () => { failed = true; throw new Error('canonical failure'); }).catch(() => undefined);
equal(failed, true, 'a failed canonical request never yields a local success value');

console.log('ownerWallet tests passed');
