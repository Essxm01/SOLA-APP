import type { AdvancedOwnerAnalytics } from '../types';

/**
 * Generates and downloads a UTF-8 BOM encoded CSV Financial Statement
 * Compatible with Microsoft Excel, Google Sheets, and Arabic text editors.
 */
export const exportFinancialAnalyticsCSV = (analytics: AdvancedOwnerAnalytics): void => {
  const { financialSummary, qualityIndex, propertyMetrics, timeRange, generatedAt } = analytics;
  const totalOwnerNetEarnings = financialSummary.totalOwnerNetEarned + financialSummary.totalExpectedArrivalCash;

  const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for Excel Arabic support
  const rows: string[][] = [];

  // 1. HEADER & METADATA
  rows.push(['منصة صولا لإدارة العطلات والوحدات الساحلية - Sola Vacation Rentals']);
  rows.push(['كشف الحساب والتقرير المالي المتقدم (Financial Statement)']);
  rows.push(['تاريخ إصدار التقرير', new Date(generatedAt).toLocaleString('ar-EG')]);
  rows.push(['النطاق الزمني المختار', getTimeRangeLabel(timeRange)]);
  rows.push([]);

  // 2. FINANCIAL SUMMARY SECTION
  rows.push(['--- الملخص المالي الإجمالي (Financial Summary) ---']);
  rows.push(['اسم المؤشر المالي', 'القيمة بالجنيه المصري (EGP)', 'ملاحظات وتوضيحات']);
  rows.push([
    'إجمالي قيمة الحجوزات (Gross Revenue)',
    financialSummary.totalGrossRevenue.toString(),
    'إجمالي قيمة الليالي المحجوزة المؤكدة',
  ]);
  rows.push([
    'إجمالي العربون المحصل إلكترونياً (Deposits Collected)',
    financialSummary.totalDepositsCollected.toString(),
    'عربون الليلة الأولى المحصل عبر المنصة',
  ]);
  rows.push([
    'عمولة Sola المخصومة (Sola Commission)',
    financialSummary.totalSolaCommissionsPaid.toString(),
    '20% من قيمة العربون المحصل إلكترونياً حصراً',
  ]);
  rows.push([
    'صافي عربون المنصة للمالك (Owner Net Deposit)',
    financialSummary.totalOwnerNetEarned.toString(),
    'عربون الليلة الأولى المحول بعد خصم عمولة Sola الـ 20%',
  ]);
  rows.push([
    'كاش الوصول المتوقع تسليمه (Expected Cash on Arrival)',
    financialSummary.totalExpectedArrivalCash.toString(),
    'المتبقي يسلم كاش مباشرة عند التسلّم (0% عمولة)',
  ]);
  rows.push([
    'إجمالي صافي أرباح المالك الإجمالية (Total Owner Net Earned)',
    totalOwnerNetEarnings.toString(),
    'إجمالي أرباح المالك الصافية شاملة العربون الصافي وكاش الوصول',
  ]);
  rows.push([
    'إجمالي عدد الحجوزات المؤكدة',
    financialSummary.totalBookingsCount.toString(),
    'عدد الحجوزات المؤكدة والمكتملة في الفترة',
  ]);
  rows.push([]);

  // 3. HOSPITALITY & OPERATIONAL KPIS
  rows.push(['--- مؤشرات الضيافة والأداء التشغيلي (Hospitality & Quality Metrics) ---']);
  rows.push(['اسم المؤشر التشغيلي', 'القيمة المسجلة', 'وحدة القياس']);
  rows.push(['نسبة الإشغال (Occupancy Rate)', `${financialSummary.occupancyRatePercentage}%`, 'نسبة مئوية']);
  rows.push(['متوسط السعر اليومي (ADR)', `${financialSummary.averageDailyRate} ج.م`, 'جنيه مصري / ليلة']);
  rows.push(['متوسط الإيراد لكل وحدة متاحة (RevPAR)', `${financialSummary.revenuePerAvailableRoom} ج.م`, 'جنيه مصري / وحدة']);
  rows.push(['متوسط مدة الإقامة (ALOS)', `${qualityIndex.averageLengthOfStayNights} ليالي`, 'ليلة لكل حجز']);
  rows.push(['متوسط مهلة الحجز المسبق (Lead Time)', `${qualityIndex.averageLeadTimeDays} أيام`, 'يوم قبل الوصول']);
  rows.push(['معدل قبول طلبات الحجز (Approval Rate)', `${qualityIndex.approvalRatePercentage}%`, 'نسبة مئوية']);
  rows.push(['متوسط سرعة استجابة المالك (Response Time)', `${qualityIndex.averageOwnerResponseTimeMinutes} دقيقة`, 'دقيقة']);
  rows.push(['نسبة النزاعات المفتوحة (Dispute Ratio)', `${qualityIndex.disputeRatioPercentage}%`, 'نسبة مئوية']);
  rows.push([]);

  // 4. MULTI-PROPERTY BREAKDOWN TABLE
  rows.push(['--- مقارنة أداء الوحدات الساحلية (Multi-Property Performance Breakdown) ---']);
  rows.push([
    'الترتيب',
    'عنوان الوحدة الساحلية',
    'الموقع',
    'عدد الحجوزات',
    'الليالي المحجوزة',
    'الإيراد الإجمالي (Gross)',
    'صافي أرباح المالك (Net)',
    'نسبة الإشغال %',
    'ADR (ج.م)',
  ]);

  for (const prop of propertyMetrics) {
    rows.push([
      `#${prop.rank}`,
      prop.propertyTitle,
      prop.locationName,
      prop.totalBookingsCount.toString(),
      prop.totalBookedNights.toString(),
      prop.totalGrossRevenue.toString(),
      prop.ownerNetEarnings.toString(),
      `${prop.occupancyRatePercentage}%`,
      prop.averageDailyRate.toString(),
    ]);
  }

  // Convert array of rows into CSV text content
  const csvContent = BOM + rows.map((e) => e.map(escapeCSVField).join(',')).join('\n');

  // Trigger browser file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Sola_Financial_Statement_${timeRange}_${formatFilenameDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Triggers native browser print formatted report (Printable HTML / PDF export)
 */
export const exportFinancialAnalyticsPDF = (analytics: AdvancedOwnerAnalytics): void => {
  const { financialSummary, propertyMetrics, timeRange, generatedAt } = analytics;
  const totalOwnerNetEarnings = financialSummary.totalOwnerNetEarned + financialSummary.totalExpectedArrivalCash;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير صولا المالي - Financial Statement (${timeRange})</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; direction: rtl; text-align: right; padding: 24px; color: #0f172a; background: #fff; }
        .header { border-bottom: 2px solid #0059FF; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .brand { font-size: 20px; font-weight: 900; color: #0059FF; }
        .title { font-size: 14px; color: #64748b; margin-top: 4px; }
        .date { font-size: 11px; color: #94a3b8; font-family: monospace; }
        .grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
        .card-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
        .card-val { font-size: 16px; font-weight: 900; color: #0f172a; font-family: monospace; }
        .card-val.net { color: #047857; }
        .card-val.sola { color: #0059FF; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: right; }
        th { background: #f1f5f9; font-weight: 800; color: #1e293b; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; pt: 12px; font-size: 10px; color: #94a3b8; text-align: center; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">منصة صولا لإدارة العطلات Sola Vacation Rentals</div>
          <div class="title">كشف الحساب والتقرير المالي المتقدم - ${getTimeRangeLabel(timeRange)}</div>
        </div>
        <div class="date">تاريخ الإصدار: ${new Date(generatedAt).toLocaleString('ar-EG')}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-label">إجمالي قيمة الحجوزات (Gross Revenue)</div>
          <div class="card-val">${financialSummary.totalGrossRevenue.toLocaleString()} ج.م</div>
        </div>
        <div class="card">
          <div class="card-label">إجمالي صافي أرباح المالك (Total Owner Net Earned)</div>
          <div class="card-val net">${totalOwnerNetEarnings.toLocaleString()} ج.م</div>
        </div>
        <div class="card">
          <div class="card-label">العرابين المحصلة إلكترونياً (Deposits Collected)</div>
          <div class="card-val sola">${financialSummary.totalDepositsCollected.toLocaleString()} ج.م</div>
        </div>
        <div class="card">
          <div class="card-label">عمولة Sola المخصومة (20% من العربون)</div>
          <div class="card-val" style="color: #e11d48;">${financialSummary.totalSolaCommissionsPaid.toLocaleString()} ج.م</div>
        </div>
        <div class="card">
          <div class="card-label">صافي عربون المنصة للمالك (Owner Net Deposit)</div>
          <div class="card-val">${financialSummary.totalOwnerNetEarned.toLocaleString()} ج.م</div>
        </div>
        <div class="card">
          <div class="card-label">كاش الوصول المتوقع (Expected Cash on Arrival)</div>
          <div class="card-val" style="color: #b45309;">${financialSummary.totalExpectedArrivalCash.toLocaleString()} ج.م</div>
        </div>
      </div>
        <div class="card">
          <div class="card-label">نسبة الإشغال / متوسط السعر اليومي</div>
          <div class="card-val">${financialSummary.occupancyRatePercentage}% | ADR: ${financialSummary.averageDailyRate.toLocaleString()} ج.م</div>
        </div>
      </div>

      <div style="font-weight: 800; font-size: 13px; margin-top: 16px; color: #0f172a;">مقارنة أداء الوحدات الساحلية</div>
      <table>
        <thead>
          <tr>
            <th>الترتيب</th>
            <th>الوحدة الساحلية</th>
            <th>الموقع</th>
            <th>الحجوزات</th>
            <th>الليالي</th>
            <th>الإيراد الإجمالي</th>
            <th>صافي المالك</th>
            <th>نسبة الإشغال</th>
          </tr>
        </thead>
        <tbody>
          ${propertyMetrics
            .map(
              (p) => `
            <tr>
              <td>#${p.rank}</td>
              <td>${p.propertyTitle}</td>
              <td>${p.locationName}</td>
              <td>${p.totalBookingsCount}</td>
              <td>${p.totalBookedNights}</td>
              <td>${p.totalGrossRevenue.toLocaleString()} ج.م</td>
              <td>${p.ownerNetEarnings.toLocaleString()} ج.م</td>
              <td>${p.occupancyRatePercentage}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        تم استخراج هذا التقرير تلقائياً من نظام Sola Owner Analytics • وثيقة مالية موثقة
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const escapeCSVField = (field: string): string => {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

const getTimeRangeLabel = (range: string): string => {
  switch (range) {
    case 'season':
      return 'موسم الصيف';
    case 'month':
      return 'الشهر الحالي';
    case 'quarter':
      return 'الربع الحالي';
    case 'year':
      return 'السنة الحالية';
    default:
      return 'كافة الفترات';
  }
};

const formatFilenameDate = (d: Date): string => {
  return d.toISOString().slice(0, 10);
};
