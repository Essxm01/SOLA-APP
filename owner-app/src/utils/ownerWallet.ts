import type { OwnerWallet, WalletLedgerEntry, WalletTransactionType } from '../types';

export type WalletLedgerFilter = 'all' | 'deposit' | 'payout' | 'held';

export interface WalletLedgerPresentation {
  title: string;
  status: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
  filter: WalletLedgerFilter | null;
}

const LEDGER_PRESENTATION: Partial<Record<WalletTransactionType, WalletLedgerPresentation>> = {
  DEPOSIT_HELD_IN_ESCROW: { title: 'صافي عربون حجز مؤكد', status: 'قيد الانتظار', tone: 'warning', filter: 'deposit' },
  DEPOSIT_AVAILABLE: { title: 'رصيد أصبح متاحاً', status: 'متاح', tone: 'positive', filter: 'deposit' },
  DEPOSIT_CREDIT: { title: 'إضافة رصيد', status: 'متاح', tone: 'positive', filter: 'deposit' },
  PAYOUT_RESERVATION: { title: 'طلب سحب', status: 'قيد المعالجة', tone: 'warning', filter: 'payout' },
  PAYOUT_WITHDRAWAL: { title: 'سحب رصيد', status: 'مكتمل', tone: 'neutral', filter: 'payout' },
  PAYOUT_RELEASE: { title: 'تحرير مبلغ السحب', status: 'متاح', tone: 'positive', filter: 'payout' },
  DISPUTE_FREEZE: { title: 'رصيد مجمّد', status: 'مجمّد', tone: 'danger', filter: 'held' },
  DISPUTE_RELEASE: { title: 'تحرير رصيد مجمّد', status: 'متاح', tone: 'positive', filter: 'held' },
  REFUND_DEBIT: { title: 'تسوية استرداد', status: 'تم تسجيلها', tone: 'neutral', filter: null },
  ADJUSTMENT_CREDIT: { title: 'تسوية رصيد', status: 'تم تسجيلها', tone: 'neutral', filter: null },
  ADJUSTMENT_DEBIT: { title: 'تسوية رصيد', status: 'تم تسجيلها', tone: 'neutral', filter: null },
};

const NEUTRAL_PRESENTATION: WalletLedgerPresentation = {
  title: 'حركة مالية',
  status: 'تم تسجيلها',
  tone: 'neutral',
  filter: null,
};

export const getWalletLedgerPresentation = (entry: Pick<WalletLedgerEntry, 'type' | 'title' | 'statusLabel'>): WalletLedgerPresentation => {
  const fallback = LEDGER_PRESENTATION[entry.type] || NEUTRAL_PRESENTATION;
  return {
    ...fallback,
    title: entry.title || fallback.title,
    status: entry.statusLabel || fallback.status,
  };
};

export const filterWalletLedger = (entries: WalletLedgerEntry[], filter: WalletLedgerFilter): WalletLedgerEntry[] => {
  if (filter === 'all') return [...entries];
  return entries.filter((entry) => getWalletLedgerPresentation(entry).filter === filter);
};

export const getWalletDisplayAmount = (amount: number, isHidden: boolean): string => (
  isHidden ? '••••' : Math.max(0, Number(amount) || 0).toLocaleString('en-US')
);

export const getWalletViewState = (wallet: OwnerWallet | null, walletError: string | null): 'loading' | 'error' | 'ready' => {
  if (walletError) return 'error';
  return wallet ? 'ready' : 'loading';
};

export const validatePayoutAmount = ({
  amount,
  availableBalance,
  hasPayoutMethod,
  minimumAmount,
}: {
  amount: number;
  availableBalance: number;
  hasPayoutMethod: boolean;
  minimumAmount: number;
}): string | null => {
  if (!Number.isFinite(amount) || amount <= 0) return 'أدخل مبلغ السحب المطلوب.';
  if (amount < minimumAmount) return `الحد الأدنى لطلب السحب هو ${minimumAmount.toLocaleString('en-US')} ج.م.`;
  if (amount > availableBalance) return 'المبلغ المطلوب يتجاوز رصيدك المتاح للسحب.';
  if (!hasPayoutMethod) return 'أضف أو اختر وسيلة سحب أولاً.';
  return null;
};

export const createPayoutSubmissionGate = () => {
  let inFlight = false;
  return async <T>(submit: () => Promise<T>): Promise<{ started: boolean; value?: T }> => {
    if (inFlight) return { started: false };
    inFlight = true;
    try {
      return { started: true, value: await submit() };
    } finally {
      inFlight = false;
    }
  };
};
