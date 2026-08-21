/**
 * Sola Vacation Rentals — Human-First Arabic Status Formatter
 * Location: customer-app/src/utils/statusFormatter.ts
 * Master Source of Truth: TASK 2A.6 & HUMAN_FIRST_UX_PRINCIPLES.md
 */

export interface HumanStatusInfo {
  label: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  primaryActionLabel?: string;
}

export function formatBookingStatusHuman(status: string): HumanStatusInfo {
  switch (status) {
    case 'PENDING_OWNER_APPROVAL':
      return {
        label: 'طلبك قيد المراجعة لدى المالك',
        badgeBg: '#FEF3C7',
        badgeText: '#D97706',
        description: 'تم إرسال طلب الحجز إلى المالك بنجاح. سيتم إشعارك بمجرد الموافقة لتأكيد الحجز بدفع العربون.',
      };

    case 'APPROVED_PENDING_PAYMENT':
      return {
        label: 'وافق المالك على طلبك — أكّد حجزك الآن',
        badgeBg: '#DBEAFE',
        badgeText: '#1D4ED8',
        description: 'قام المالك بالموافقة على إقامتك! يرجى دفع مبلغ العربون خلال المهلة المحددة لتثبيت الحجز رسمياً.',
        primaryActionLabel: 'ادفع العربون الآن',
      };

    case 'CONFIRMED':
      return {
        label: 'تم تأكيد حجزك بنجاح 🎉',
        badgeBg: '#D1FAE5',
        badgeText: '#047857',
        description: 'تم استلام العربون وتأكيد حجزك رسمياً في النظام. نتمنى لك إقامة ممتعة في الساحل الشمالي!',
      };

    case 'REJECTED':
      return {
        label: 'اعتذر المالك عن قبول الحجز',
        badgeBg: '#FEE2E2',
        badgeText: '#B91C1C',
        description: 'تعذر على المالك قبول طلبك في التواريخ المحددة. يمكنك تصفح وحدات أخرى متاحة في نفس المنطقة.',
      };

    case 'EXPIRED':
      return {
        label: 'انتهت المهلة الزمنية لطلب الحجز',
        badgeBg: '#F3F4F6',
        badgeText: '#4B5563',
        description: 'تجاوز طلب الحجز المهلة الزمنية المحددة (ساعتان). يمكنك تقديم طلب حجز جديد لمتابعة الإقامة.',
      };

    case 'CANCELLED_BY_GUEST':
      return {
        label: 'تم إلغاء الحجز بناءً على طلبك',
        badgeBg: '#F1F5F9',
        badgeText: '#64748B',
        description: 'تم إلغاء طلب الحجز مع تطبيق سياسة الإلغاء المعتمدة لصالحك.',
      };

    case 'CANCELLED_BY_OWNER':
      return {
        label: 'تم إلغاء الحجز من قبل المالك',
        badgeBg: '#FEE2E2',
        badgeText: '#991B1B',
        description: 'تم إلغاء الحجز واسترداد المبالغ المستحقة بالكامل طبقاً لضمان كونفرم.',
      };

    default:
      return {
        label: 'حالة الحجز قيد المتابعة',
        badgeBg: '#E2E8F0',
        badgeText: '#475569',
        description: 'تجري متابعة حالة الحجز حالياً مع السيرفر.',
      };
  }
}
