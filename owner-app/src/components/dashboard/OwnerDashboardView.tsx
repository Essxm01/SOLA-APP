import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeaderBar } from '../layout/HeaderBar';
import { ActionCards } from './ActionCards';
import { QuickActions } from './QuickActions';
import { RecentBookingsSection } from './RecentBookingsSection';
import { PropertiesSummarySection } from './PropertiesSummarySection';
import { WalletSummarySection } from './WalletSummarySection';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import { AlertCircle, Building2, Plus, RefreshCw } from 'lucide-react';

export const OwnerDashboardView: React.FC = () => {
  const { isLoading, error, refreshData, openAddPropertyWizard, properties } = useApp();

  return (
    <main className="min-h-full w-full bg-[var(--konfrm-surface-canvas)] pb-28 text-right" dir="rtl">
      <HeaderBar />

      <div className="mx-auto w-full max-w-[430px] px-[var(--konfrm-space-page-horizontal)] py-5">
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <section className="mx-auto flex min-h-[48vh] max-w-sm flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--konfrm-radius-card)] bg-rose-50 text-rose-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-[18px] font-extrabold text-[var(--konfrm-text-primary)]">تعذر تحميل الصفحة الرئيسية</h2>
            <p className="mt-2 max-w-[280px] text-[14px] leading-6 text-[var(--konfrm-text-secondary)]">تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={() => void refreshData()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] px-4 text-[14px] font-bold text-[var(--konfrm-text-inverse)]">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </section>
        ) : properties.length === 0 ? (
          <div className="space-y-[var(--konfrm-space-section-gap)]">
            <ActionCards />
            <section className="rounded-[var(--konfrm-radius-elevated-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-5 [box-shadow:var(--konfrm-shadow-subtle)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-[20px] font-extrabold tracking-[-0.01em] text-[var(--konfrm-text-primary)]">ابدأ بإضافة أول وحدة</h2>
              <p className="mt-2 max-w-[310px] text-[14px] leading-6 text-[var(--konfrm-text-secondary)]">أضف بيانات وحدتك وأرسلها للمراجعة لتصبح جاهزة للظهور للمستأجرين.</p>
              <button type="button" onClick={() => openAddPropertyWizard()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-color-primary)] px-4 text-[15px] font-bold text-[var(--konfrm-text-inverse)]">
                <Plus className="h-5 w-5" />
                إضافة وحدة
              </button>
            </section>
            <WalletSummarySection />
          </div>
        ) : (
          <div className="space-y-[var(--konfrm-space-section-gap)]">
            <ActionCards />
            <RecentBookingsSection />
            <PropertiesSummarySection />
            <WalletSummarySection />
            <QuickActions />
          </div>
        )}
      </div>
    </main>
  );
};
