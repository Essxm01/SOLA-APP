import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeaderBar } from '../layout/HeaderBar';
import { ActionCards } from './ActionCards';
import { QuickActions } from './QuickActions';
import { RecentBookingsSection } from './RecentBookingsSection';
import { PropertiesSummarySection } from './PropertiesSummarySection';
import { WalletSummarySection } from './WalletSummarySection';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import { Button } from '../ui/Button';
import { AlertCircle, Building, Plus, RefreshCw } from 'lucide-react';

export const OwnerDashboardView: React.FC = () => {
  const { isLoading, error, refreshData, openAddPropertyWizard, properties } = useApp();

  return (
    <div className="min-h-full w-full bg-[var(--konfrm-surface-canvas)] pb-32 dir-rtl">
      {/* Top Header */}
      <HeaderBar />

      <div className="mx-auto max-w-md space-y-5 px-4 py-4">
        {/* Loading State */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          /* Error State */
          <div className="space-y-3.5 rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-xs">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">تعذر تحميل البيانات الرئيسية</h3>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={refreshData}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              className="bg-[#0059FF] font-bold text-xs rounded-xl shadow-xs"
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : properties.length === 0 ? (
          /* New-Owner Zero-Property Onboarding State */
          <div className="space-y-5">
            <ActionCards />

            <div className="rounded-2xl border border-blue-200/80 bg-white p-5 text-center shadow-xs space-y-3.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0059FF]">
                <Building className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">ابدأ بإضافة أول وحدة</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  أضف بيانات وحدتك الساحلية والأسعار وأرسلها للمراجعة لتصبح جاهزة للحجز للضيوف.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => openAddPropertyWizard()}
                icon={<Plus className="h-4 w-4" />}
                className="w-full bg-[#0059FF] hover:bg-blue-700 font-extrabold text-xs py-2.5 rounded-xl shadow-xs"
              >
                إضافة أول وحدة الآن
              </Button>
            </div>

            <WalletSummarySection />
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

