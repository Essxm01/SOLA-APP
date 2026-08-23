import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeaderBar } from '../layout/HeaderBar';
import { ActionCards } from './ActionCards';
import { QuickActions } from './QuickActions';
import { RecentBookingsSection } from './RecentBookingsSection';
import { PropertiesSummarySection } from './PropertiesSummarySection';
import { WalletSummarySection } from './WalletSummarySection';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const OwnerDashboardView: React.FC = () => {
  const { isLoading, error, refreshData, openAddPropertyWizard, properties } = useApp();

  return (
    <div className="min-h-full w-full bg-[var(--konfrm-surface-canvas)] pb-8 dir-rtl">
      {/* Top Header */}
      <HeaderBar />

      <div className="mx-auto max-w-md space-y-7 px-[var(--konfrm-space-page-x)] py-5">
        {/* Loading State */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          /* Error State */
          <div className="space-y-3 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-semantic-danger)] bg-[var(--konfrm-surface-primary)] p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-[var(--konfrm-semantic-danger)]" />
            <h3 className="text-base font-bold text-[var(--konfrm-text-primary)]">تعذر تحميل الصفحة الرئيسية</h3>
            <p className="text-sm text-[var(--konfrm-text-secondary)]">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={refreshData}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : properties.length === 0 ? (
          /* Empty Dashboard State */
          <div className="space-y-4">
            <EmptyState
              type="dashboard"
              title="ابدأ بإضافة أول وحدة"
              description="أضف بيانات وحدتك وأرسلها للمراجعة لتصبح جاهزة للظهور للمستأجرين."
              actionText="إضافة وحدة"
              onAction={() => openAddPropertyWizard()}
            />
          </div>
        ) : (
          /* Populated Dashboard Content */
          <>
            <ActionCards />
            <RecentBookingsSection />
            <PropertiesSummarySection />
            <WalletSummarySection />
            <QuickActions />
          </>
        )}
      </div>
    </div>
  );
};
