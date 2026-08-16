import React, { useState } from 'react';
import { CustomerPaymentService, InitiatePaymentResult } from '../services/customerPaymentService';
import { formatBookingStatusHuman } from '../utils/statusFormatter';

export interface BookingDetails {
  id: string;
  bookingNumber: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  depositAmountEgp: number;
  remainingBalanceEgp: number;
  totalBookingValueEgp: number;
  status: 'PENDING_OWNER_APPROVAL' | 'APPROVED_PENDING_PAYMENT' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED_BY_GUEST' | 'CANCELLED_BY_OWNER';
}

interface CustomerCheckoutModalProps {
  booking: BookingDetails;
  authToken: string;
  onPaymentSuccess?: () => void;
  onCancelBooking?: () => void;
}

export type CheckoutStep = 'IDLE' | 'INITIALIZING' | 'CHECKOUT_MODAL' | 'POLLING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

export const CustomerCheckoutModal: React.FC<CustomerCheckoutModalProps> = ({
  booking,
  authToken,
  onPaymentSuccess,
  onCancelBooking,
}) => {
  const [step, setStep] = useState<CheckoutStep>('IDLE');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(`idemp_ui_${booking.id}_${Date.now()}`);
  const [initResult, setInitResult] = useState<InitiatePaymentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const humanStatus = formatBookingStatusHuman(booking.status);

  // 1. Initiate Payment Request (Server Authority)
  const handleInitiatePayment = async () => {
    if (booking.status !== 'APPROVED_PENDING_PAYMENT') return;
    if (isSubmitting) return; // Double-click prevention

    setIsSubmitting(true);
    setStep('INITIALIZING');
    setErrorMessage('');

    try {
      const res = await CustomerPaymentService.initiatePayment(booking.id, idempotencyKey, authToken);
      setInitResult(res);
      setStep('CHECKOUT_MODAL');
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر التواصل مع بوابة الدفع، يرجى إعادة المحاولة.');
      setStep('FAILED');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Poll Server Payment Status (Server Authority Only)
  const pollServerPaymentStatus = async () => {
    setStep('POLLING');
    try {
      const status = await CustomerPaymentService.getPaymentStatus(booking.id, authToken);

      if (status.paymentStatus === 'SUCCEEDED') {
        setStep('CONFIRMED');
        if (onPaymentSuccess) onPaymentSuccess();
      } else if (status.paymentStatus === 'FAILED') {
        setStep('FAILED');
        setErrorMessage('لم تكتمل عملية الدفع البنكية. يمكن إعادة المحاولة الآن.');
      } else if (status.paymentStatus === 'EXPIRED') {
        setStep('EXPIRED');
        setErrorMessage('انتهت المهلة المحددة لدفع العربون.');
      } else {
        setStep('CHECKOUT_MODAL');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر التحقق من السيرفر. يرجى محاولة الاستعلام مجدداً.');
      setStep('FAILED');
    }
  };

  // 3. Retry Handler (Fresh Idempotency Key)
  const handleRetry = () => {
    const newKey = `idemp_ui_${booking.id}_${Date.now()}`;
    setIdempotencyKey(newKey);
    setStep('IDLE');
    setErrorMessage('');
  };

  return (
    <div style={{
      maxWidth: '520px',
      margin: '1.5rem auto',
      padding: '2rem',
      backgroundColor: '#FFFFFF',
      borderRadius: '20px',
      boxShadow: '0 12px 36px rgba(0, 89, 255, 0.07)',
      border: '1px solid #E2E8F0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl',
      textAlign: 'right',
    }}>
      {/* Human-First Header Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            تفاصيل حجز العقار
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>رقم الحجز: {booking.bookingNumber}</span>
        </div>
        <span style={{
          padding: '0.4rem 0.9rem',
          borderRadius: '20px',
          fontSize: '0.825rem',
          fontWeight: 700,
          backgroundColor: humanStatus.badgeBg,
          color: humanStatus.badgeText,
        }}>
          {humanStatus.label}
        </span>
      </div>

      {/* Human-First Status Description Banner */}
      <div style={{
        backgroundColor: '#F8FAFC',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        borderLeft: `4px solid ${humanStatus.badgeText}`,
        fontSize: '0.875rem',
        color: '#334155',
        lineHeight: '1.6',
      }}>
        {humanStatus.description}
      </div>

      {/* Clear Financial Summary Breakdown */}
      <div style={{ backgroundColor: '#FAFAF9', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #F5F5F4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: '#44403C', fontSize: '0.9rem' }}>
          <span>الوحدة:</span>
          <strong style={{ color: '#1C1917' }}>{booking.propertyTitle}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: '#44403C', fontSize: '0.9rem' }}>
          <span>مدة الإقامة:</span>
          <span>{booking.totalNights} ليالي ({booking.checkIn} ➔ {booking.checkOut})</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: '#44403C', fontSize: '0.9rem' }}>
          <span>الإجمالي الكلي:</span>
          <span>{booking.totalBookingValueEgp.toLocaleString()} ج.م</span>
        </div>
        <hr style={{ border: 'none', borderTop: '1px dashed #D6D3D1', margin: '0.75rem 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: '#0059FF' }}>
          <span>العربون المطلوب الآن (ليلة واحدة):</span>
          <span>{booking.depositAmountEgp.toLocaleString()} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#78716C', marginTop: '0.35rem' }}>
          <span>المتبقي عند الدخول (كاش للمالك):</span>
          <span>{booking.remainingBalanceEgp.toLocaleString()} ج.م</span>
        </div>
      </div>

      {/* Step Renderings */}
      {step === 'IDLE' && (
        <div>
          {booking.status === 'APPROVED_PENDING_PAYMENT' && (
            <button
              onClick={handleInitiatePayment}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#0059FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 89, 255, 0.25)',
                transition: 'transform 0.1s ease',
              }}
            >
              {isSubmitting ? 'جاري تجهيز بوابة الدفع...' : 'ادفع العربون واضمن حجزك الآن'}
            </button>
          )}

          {booking.status === 'PENDING_OWNER_APPROVAL' && (
            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#FFFBEB', borderRadius: '10px', color: '#B45309', fontSize: '0.85rem' }}>
              ⏳ يراجع المالك طلبك الآن. سيتم إشعارك مباشرة بمجرد الموافقة.
            </div>
          )}

          {booking.status === 'CONFIRMED' && (
            <div style={{ backgroundColor: '#F0FDF4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
              <h4 style={{ color: '#166534', margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700 }}>
                تعليمات ميعاد الوصول والدخول:
              </h4>
              <ul style={{ margin: 0, paddingRight: '1.25rem', color: '#15803D', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <li>موعد تسجيل الوصول: ابتداءً من الساعة 2:00 ظهراً يوم {booking.checkIn}.</li>
                <li>يرجى إبراز بطاقة الرقم القومي ومطابقتها مع بيانات الحجز.</li>
                <li>يتم دفع باقي المبلغ ({booking.remainingBalanceEgp.toLocaleString()} ج.م) نقداً عند الاستلام.</li>
              </ul>
            </div>
          )}

          {onCancelBooking && (booking.status === 'PENDING_OWNER_APPROVAL' || booking.status === 'APPROVED_PENDING_PAYMENT') && (
            <button
              onClick={onCancelBooking}
              style={{
                width: '100%',
                marginTop: '0.75rem',
                padding: '0.65rem',
                backgroundColor: 'transparent',
                color: '#94A3B8',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              إلغاء طلب الحجز
            </button>
          )}
        </div>
      )}

      {step === 'INITIALIZING' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          <p style={{ color: '#0059FF', fontWeight: 700, margin: 0 }}>جاري تجهيز بوابة الدفع البنكية الآمنة...</p>
        </div>
      )}

      {step === 'CHECKOUT_MODAL' && (
        <div style={{ backgroundColor: '#EFF6FF', padding: '1.25rem', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E40AF', marginTop: 0 }}>
            بوابة الدفع الآمنة (Paymob Sandbox Checkout)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#1E3A8A', marginBottom: '1rem' }}>
            مرجع الدفع: <code>{initResult?.merchantOrderId}</code>
          </p>

          <button
            onClick={pollServerPaymentStatus}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#0059FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            تأكيد إتمام الدفع والاستعلام من السيرفر
          </button>
        </div>
      )}

      {step === 'POLLING' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔄</div>
          <p style={{ color: '#0059FF', fontWeight: 700, margin: 0 }}>جاري تأكيد نجاح العملية مع السيرفر...</p>
        </div>
      )}

      {step === 'CONFIRMED' && (
        <div style={{ backgroundColor: '#ECFDF5', padding: '1.5rem', borderRadius: '14px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h3 style={{ color: '#065F46', margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800 }}>
            مبارك! تم تأكيد حجزك رسمياً
          </h3>
          <p style={{ color: '#047857', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            تم استلام مبلغ العربون ({booking.depositAmountEgp.toLocaleString()} ج.م) وحجز الوحدة باسمك.
          </p>
        </div>
      )}

      {step === 'FAILED' && (
        <div style={{ backgroundColor: '#FEF2F2', padding: '1.25rem', borderRadius: '14px', border: '1px solid #FCA5A5', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{ color: '#991B1B', margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700 }}>
            تعذر إتمام العملية
          </h3>
          <p style={{ color: '#7F1D1D', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMessage}
          </p>
          <button
            onClick={handleRetry}
            style={{
              padding: '0.75rem 1.75rem',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إعادة محاولة الدفع
          </button>
        </div>
      )}

      {step === 'EXPIRED' && (
        <div style={{ backgroundColor: '#FFFBEB', padding: '1.25rem', borderRadius: '14px', border: '1px solid #FDE68A', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⌛</div>
          <h3 style={{ color: '#92400E', margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700 }}>
            انتهت مهلة الدفع
          </h3>
          <p style={{ color: '#78350F', fontSize: '0.85rem', margin: 0 }}>
            تجاوز الطلب مهلة 2 ساعة. يرجى تقديم طلب حجز جديد لتأكيد إقامتك.
          </p>
        </div>
      )}
    </div>
  );
};
