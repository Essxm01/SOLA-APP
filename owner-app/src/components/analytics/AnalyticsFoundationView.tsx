import React from 'react';
import { useApp } from '../../context/AppContext';
import type { AnalyticsTimeRange } from '../../types';
import { Button } from '../ui/Button';
import {
  exportFinancialAnalyticsCSV,
  exportFinancialAnalyticsPDF,
} from '../../utils/exportEngine';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Filter,
  PieChart,
  Percent,
  RefreshCw,
  Download,
  Printer,
} from 'lucide-react';

export const AnalyticsFoundationView: React.FC = () => {
  const {
    advancedAnalytics,
    analyticsTimeRange,
    setAnalyticsTimeRange,
    getAdvancedAnalytics,
    isLoading,
  } = useApp();

  const handleTimeRangeChange = async (range: AnalyticsTimeRange) => {
    setAnalyticsTimeRange(range);
    await getAdvancedAnalytics(range);
  };

  if (!advancedAnalytics) {
    return (
      <div className="p-6 text-center space-y-3 dir-rtl bg-white rounded-2xl border border-slate-200 shadow-xs">
        <PieChart className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
        <h3 className="text-sm font-bold text-slate-700">جاري تحميل تقارير التحليلات المتقدمة...</h3>
        <p className="text-xs text-slate-500">يتم تجميع مؤشرات الإشغال والأداء المالي للوحدات الساحلية.</p>
      </div>
    );
  }

  const { financialSummary, qualityIndex, propertyMetrics, topPerformingProperty } = advancedAnalytics;
  const hasBookings = financialSummary.totalBookingsCount > 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  return (
    <div className="space-y-4 dir-rtl text-right animate-fade-in">
      {/* FILTER & PERIOD SELECTOR BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#0059FF]" />
            <span>نطاق تصفية التقارير والتحليلات</span>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFinancialAnalyticsCSV(advancedAnalytics)}
              icon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
              className="text-xs py-1 px-2.5 bg-emerald-50/50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              CSV 📊
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFinancialAnalyticsPDF(advancedAnalytics)}
              icon={<Printer className="w-3.5 h-3.5 text-[#0059FF]" />}
              className="text-xs py-1 px-2.5 bg-blue-50/50 border-blue-200 text-[#0059FF] hover:bg-blue-100"
            >
              طباعة / PDF 📄
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => getAdvancedAnalytics(analyticsTimeRange)}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              className="text-xs py-1 px-2.5"
            >
              تحديث
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          {[
            { id: 'all', label: 'كافة الفترات' },
            { id: 'season', label: 'موسم الصيف ☀️' },
            { id: 'month', label: 'الشهر الحالي 📅' },
            { id: 'quarter', label: `الربع الحالي (Q${currentQuarter})` },
            { id: 'year', label: `السنة الحالية (${currentYear})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTimeRangeChange(item.id as AnalyticsTimeRange)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                analyticsTimeRange === item.id
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP PERFORMING PROPERTY HIGHLIGHT BANNER */}
      {topPerformingProperty && topPerformingProperty.totalGrossRevenue > 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-md space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-blue-800/80 pb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>الوحدة الأكثر إيراداً وأداءً (Top Performing Property)</span>
            </span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
              المرتبة #1 🏆
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h3 className="font-extrabold text-sm text-white">{topPerformingProperty.propertyTitle}</h3>
              <p className="text-slate-300 text-xs">{topPerformingProperty.locationName}</p>
            </div>

            <div className="text-left font-mono">
              <span className="text-xs text-slate-300 block">إجمالي إيراد الوحدة</span>
              <span className="text-base font-black text-amber-400">
                {topPerformingProperty.totalGrossRevenue.toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL & REVENUE SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Owner Net Earnings */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>صافي أرباح المالك الصافية</span>
          </span>
          <span className="text-lg font-black text-emerald-700 font-mono block">
            {financialSummary.totalOwnerNetEarned.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-slate-400 block font-semibold">
            شاملة عربون المالك والمتبقي عند الوصول
          </span>
        </div>

        {/* Card 2: Sola Deposits Collected */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#0059FF]" />
            <span>العرابين المحصلة إلكترونياً</span>
          </span>
          <span className="text-lg font-black text-[#0059FF] font-mono block">
            {financialSummary.totalDepositsCollected.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-slate-400 block font-semibold">
            عمولة Sola المخصومة: {financialSummary.totalSolaCommissionsPaid.toLocaleString()} ج.م (20%)
          </span>
        </div>

        {/* Card 3: Expected Cash on Arrival */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-amber-600" />
            <span>كاش الوصول المتوقع</span>
          </span>
          <span className="text-lg font-black text-amber-700 font-mono block">
            {financialSummary.totalExpectedArrivalCash.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-slate-400 block font-semibold">
            يحصل كاش عند التسلّم مباشرة (0% عمولة)
          </span>
        </div>

        {/* Card 4: Gross Revenue */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <PieChart className="w-3.5 h-3.5 text-purple-600" />
            <span>إجمالي قيمة الحجوزات (Gross)</span>
          </span>
          <span className="text-lg font-black text-slate-900 font-mono block">
            {financialSummary.totalGrossRevenue.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-slate-400 block font-semibold">
            إجمالي قيمة الليالي المحجوزة
          </span>
        </div>
      </div>

      {/* HOSPITALITY KPIS GRID (Occupancy, ADR, RevPAR, ALOS, Lead Time) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <BarChart3 className="w-4 h-4 text-[#0059FF]" />
          <span>مؤشرات أداء الضيافة والإشغال (Hospitality KPIs)</span>
        </h3>

        {!hasBookings ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 italic">
            ℹ️ لا توجد بيانات كافية للحساب في هذه الفترة الزمنية.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 block font-bold">نسبة الإشغال</span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {financialSummary.occupancyRatePercentage}%
              </span>
              <span className="text-[9px] text-slate-400 block">من إجمالي الأيام المتاحة</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 block font-bold">متوسط السعر (ADR)</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {financialSummary.averageDailyRate.toLocaleString()} ج.م
              </span>
              <span className="text-[9px] text-slate-400 block">لليلة الواحدة المحجوزة</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 block font-bold">إيراد الغرفة (RevPAR)</span>
              <span className="text-base font-black text-[#0059FF] font-mono">
                {financialSummary.revenuePerAvailableRoom.toLocaleString()} ج.م
              </span>
              <span className="text-[9px] text-slate-400 block">لكل وحدة متاحة</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5 col-span-1.5">
              <span className="text-[10px] text-slate-500 block font-bold">متوسط الإقامة (ALOS)</span>
              <span className="text-base font-black text-indigo-700 font-mono flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{qualityIndex.averageLengthOfStayNights} ليالي</span>
              </span>
              <span className="text-[9px] text-slate-400 block">لكل حجز مؤكد</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5 col-span-1.5">
              <span className="text-[10px] text-slate-500 block font-bold">متوسط مهلة الحجز (Lead Time)</span>
              <span className="text-base font-black text-purple-700 font-mono flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{qualityIndex.averageLeadTimeDays} أيام مسبقاً</span>
              </span>
              <span className="text-[9px] text-slate-400 block">قبل موعد التسكين</span>
            </div>
          </div>
        )}
      </div>

      {/* OPERATIONAL QUALITY INDEX GRID */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>مؤشرات الجودة التشغيلية والاستجابة (Operational Insights)</span>
        </h3>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] text-slate-500 block font-bold">معدل قبول الطلبات</span>
            <span className="text-base font-black text-emerald-700 font-mono flex items-center justify-center gap-0.5">
              <Percent className="w-3.5 h-3.5" />
              <span>{qualityIndex.approvalRatePercentage}%</span>
            </span>
            <span className="text-[9px] text-slate-400 block">
              {qualityIndex.totalRequestsReceivedCount === 0 ? 'لا توجد طلبات مسجلة' : `${qualityIndex.approvedRequestsCount} من ${qualityIndex.totalRequestsReceivedCount}`}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] text-slate-500 block font-bold">متوسط زمن الاستجابة</span>
            <span className="text-base font-black text-slate-900 font-mono flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{qualityIndex.averageOwnerResponseTimeMinutes === 0 ? '0' : qualityIndex.averageOwnerResponseTimeMinutes} دقيقة</span>
            </span>
            <span className="text-[9px] text-slate-400 block">للقبول أو الرفض</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] text-slate-500 block font-bold">نسبة النزاعات المفتوحة</span>
            <span className={`text-base font-black font-mono flex items-center justify-center gap-0.5 ${qualityIndex.disputeRatioPercentage > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{qualityIndex.disputeRatioPercentage}%</span>
            </span>
            <span className="text-[9px] text-slate-400 block">{qualityIndex.totalDisputesOpenedCount} نزاع مسجل</span>
          </div>
        </div>
      </div>

      {/* MULTI-PROPERTY COMPARISON & RANKING TABLE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Building className="w-4 h-4 text-[#0059FF]" />
          <span>مقارنة أداء الوحدات الساحلية وترتيبها (Multi-Property Ranking)</span>
        </h3>

        {propertyMetrics.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 italic">
            ℹ️ لا توجد وحدات نشطة في هذه الفترة الزمنية.
          </div>
        ) : (
          <div className="space-y-2">
            {propertyMetrics.map((item) => (
              <div
                key={item.propertyId}
                className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    item.rank === 1 ? 'bg-amber-400 text-slate-900' : item.rank === 2 ? 'bg-slate-300 text-slate-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    #{item.rank}
                  </span>

                  <div>
                    <span className="font-extrabold text-slate-900 block">{item.propertyTitle}</span>
                    <span className="text-[11px] text-slate-500">{item.locationName} • {item.totalBookingsCount} حجوزات ({item.totalBookedNights} ليلة)</span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="font-extrabold text-[#0059FF] text-xs block">
                    {item.totalGrossRevenue.toLocaleString()} ج.م
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    إشغال: {item.occupancyRatePercentage}% • ADR: {item.averageDailyRate.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
