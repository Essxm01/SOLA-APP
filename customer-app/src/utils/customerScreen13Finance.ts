export type Screen13FinancePresentation = {
  showDeposit: boolean;
  depositLabel: string | null;
  showRemaining: boolean;
  remainingLabel: string | null;
  showPendingNotice: boolean;
  historicalOnly: boolean;
};

/** Status is the only authority for customer-facing financial wording. */
export function getScreen13FinancePresentation(status: string): Screen13FinancePresentation {
  switch (status) {
    case 'PENDING_OWNER_APPROVAL':
      return {
        showDeposit: true,
        depositLabel: 'العربون بعد موافقة المالك',
        showRemaining: true,
        remainingLabel: 'المتبقي بعد العربون',
        showPendingNotice: true,
        historicalOnly: false,
      };
    case 'APPROVED_PENDING_PAYMENT':
      return {
        showDeposit: true,
        depositLabel: 'العربون المطلوب',
        showRemaining: true,
        remainingLabel: 'المتبقي بعد دفع العربون',
        showPendingNotice: false,
        historicalOnly: false,
      };
    case 'CONFIRMED':
      return {
        showDeposit: true,
        depositLabel: 'العربون المدفوع',
        showRemaining: true,
        remainingLabel: 'المتبقي من قيمة الإقامة',
        showPendingNotice: false,
        historicalOnly: false,
      };
    case 'REJECTED':
    case 'CANCELLED_BY_GUEST':
    case 'CANCELLED_BY_OWNER':
    case 'EXPIRED':
    case 'COMPLETED':
      return {
        showDeposit: false,
        depositLabel: null,
        showRemaining: false,
        remainingLabel: null,
        showPendingNotice: false,
        historicalOnly: true,
      };
    default:
      return {
        showDeposit: false,
        depositLabel: null,
        showRemaining: false,
        remainingLabel: null,
        showPendingNotice: false,
        historicalOnly: true,
      };
  }
}
