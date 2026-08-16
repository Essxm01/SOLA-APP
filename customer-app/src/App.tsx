import { useState } from 'react';
import { CustomerCheckoutModal, BookingDetails } from './components/CustomerCheckoutModal';

export function App() {
  const [booking, setBooking] = useState<BookingDetails>({
    id: '00000000-0000-0000-0000-000000000001',
    bookingNumber: 'BK-990011',
    propertyTitle: 'شاليه فاخر رأس الحكمة — الساحل الشمالي',
    checkIn: '2026-09-10',
    checkOut: '2026-09-15',
    totalNights: 5,
    depositAmountEgp: 5000,
    remainingBalanceEgp: 20000,
    totalBookingValueEgp: 25000,
    status: 'APPROVED_PENDING_PAYMENT',
  });

  const [authToken] = useState<string>('demo_customer_access_token');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '2rem 1rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0059FF', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          SOLA — VACATION RENTALS (صولا)
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          تطبيق العملاء والنزلاء — رحلة حجز مريحة وآمنة في الساحل الشمالي
        </p>

        {/* State Simulator Toolbar for E2E Verification */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setBooking((p) => ({ ...p, status: 'PENDING_OWNER_APPROVAL' }))}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: booking.status === 'PENDING_OWNER_APPROVAL' ? '#FEF3C7' : '#FFFFFF' }}
          >
            1. بانتظار موافقة المالك
          </button>
          <button
            onClick={() => setBooking((p) => ({ ...p, status: 'APPROVED_PENDING_PAYMENT' }))}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: booking.status === 'APPROVED_PENDING_PAYMENT' ? '#DBEAFE' : '#FFFFFF' }}
          >
            2. موافقة المالك (بانتظار العربون)
          </button>
          <button
            onClick={() => setBooking((p) => ({ ...p, status: 'CONFIRMED' }))}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: booking.status === 'CONFIRMED' ? '#D1FAE5' : '#FFFFFF' }}
          >
            3. تم التأكيد
          </button>
          <button
            onClick={() => setBooking((p) => ({ ...p, status: 'REJECTED' }))}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: booking.status === 'REJECTED' ? '#FEE2E2' : '#FFFFFF' }}
          >
            4. اعتذار المالك
          </button>
          <button
            onClick={() => setBooking((p) => ({ ...p, status: 'EXPIRED' }))}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: booking.status === 'EXPIRED' ? '#F3F4F6' : '#FFFFFF' }}
          >
            5. انتهت المهلة
          </button>
        </div>
      </header>

      <main>
        <CustomerCheckoutModal
          booking={booking}
          authToken={authToken}
          onPaymentSuccess={() => {
            setBooking((prev) => ({ ...prev, status: 'CONFIRMED' }));
          }}
          onCancelBooking={() => {
            setBooking((prev) => ({ ...prev, status: 'CANCELLED_BY_GUEST' }));
          }}
        />
      </main>
    </div>
  );
}

export default App;
