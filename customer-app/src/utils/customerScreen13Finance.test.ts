import { getScreen13FinancePresentation } from './customerScreen13Finance';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const pending = getScreen13FinancePresentation('PENDING_OWNER_APPROVAL');
assert(pending.depositLabel === 'العربون بعد موافقة المالك', 'pending deposit wording is contextual');
assert(pending.remainingLabel === 'المتبقي بعد العربون', 'pending remaining wording is contextual');
assert(pending.showPendingNotice, 'pending explains that no payment is due now');

const approved = getScreen13FinancePresentation('APPROVED_PENDING_PAYMENT');
assert(approved.depositLabel === 'العربون المطلوب', 'approved shows required deposit');
assert(approved.remainingLabel === 'المتبقي بعد دفع العربون', 'approved shows post-deposit remaining');

const confirmed = getScreen13FinancePresentation('CONFIRMED');
assert(confirmed.depositLabel === 'العربون المدفوع', 'confirmed shows paid deposit');
assert(confirmed.remainingLabel === 'المتبقي من قيمة الإقامة', 'confirmed shows stay remainder');

for (const status of ['REJECTED', 'CANCELLED_BY_GUEST', 'CANCELLED_BY_OWNER', 'EXPIRED', 'COMPLETED', 'UNSUPPORTED']) {
  const historical = getScreen13FinancePresentation(status);
  assert(historical.historicalOnly, `${status} is historical-only`);
  assert(!historical.showDeposit && !historical.showRemaining, `${status} has no future payment wording`);
}

console.log('customerScreen13Finance tests passed');
