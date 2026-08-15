import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeaderBar } from '../layout/HeaderBar';
import { ActionCards } from './ActionCards';
import { QuickActions } from './QuickActions';
import { RecentBookingsSection } from './RecentBookingsSection';
import { PropertiesSummarySection } from './PropertiesSummarySection';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const OwnerDashboardView: React.FC = () => {
  const { isLoading, error, isEmptyDashboard, refreshData, openAddPropertyWizard } =
    useApp();

  return (
    <div className="min-h-full w-full bg-slate-100/60 pb-8 dir-rtl">
      {/* Top Header */}
      <HeaderBar />

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Loading State */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          /* Error State */
          <div className="bg-white rounded-2xl p-6 border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">تعذر تحميل بيانات اللوحة</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={refreshData}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : isEmptyDashboard ? (
          /* Empty Dashboard State */
          <div className="space-y-4">
            <EmptyState
              type="dashboard"
              title="مرحباً بك في Sola Owner App! 🏝️"
              description="حسابك جاهز لإضافة وحدتك الساحلية الأولى في مراسي أو الجونة أو العين السخنة واستقبال الحجوزات الأولية."
              actionText="إضافة وحدة ساحلية جديدة ➕"
              onAction={() => openAddPropertyWizard()}
            />
          </div>
        ) : (
          /* Populated Dashboard Content */
          <>
            <ActionCards />
            <QuickActions />
            <RecentBookingsSection />
            <PropertiesSummarySection />
          </>
        )}
      </div>
    </div>
  );
};
