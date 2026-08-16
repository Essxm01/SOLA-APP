import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input } from './ui/Input';
import { TableSkeleton, EmptyState, AlertBanner } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface PayoutItem {
  payoutRequestId: string;
  requestNumber: string;
  owner: {
    ownerId: string;
    fullName: string;
    phoneNumber: string;
  };
  payoutMethod: {
    methodType: string;
    accountTitle: string;
    maskedAccountNumber: string;
  };
  financials: {
    grossAmountEgp: number;
  };
  status: string;
  createdAt: string;
}

export interface PaginationInfo {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayoutsQueueProps {
  onSelectPayoutDetail?: (payoutId: string) => void;
}

export function PayoutsQueue({ onSelectPayoutDetail }: PayoutsQueueProps = {}) {
  const [items, setItems] = useState<PayoutItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ totalItems: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchQueue = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl(`/admin/payouts/pending?page=${pageNum}&limit=10`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('فشل استرجاع قائمة انتظار طلبات سحب الأرباح');
      }

      const json = await response.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setPagination(json.data.pagination || { totalItems: 0, page: 1, limit: 10, totalPages: 0 });
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل طلبات سحب الأرباح');
      setItems([]);
      setPagination({ totalItems: 0, page: 1, limit: 10, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(1);
  }, []);

  const totalGrossAmount = items.reduce((acc, item) => acc + (item.financials?.grossAmountEgp || 0), 0);

  const filteredItems = items.filter((item) => {
    return (
      item.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.payoutMethod?.maskedAccountNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Top Banner Header — White-First Design System Standard */}
      <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>FLOW-ADM-07 & 08 Payouts</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">/ المعالجة التنفيذية للمستحقات</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلبات سحب الأرباح للملاك (Payout Execution Queue)</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
              مراجعة طلبات سحب الأرباح المعلقة للملاك الموثقين، تنفيذ التحويل البنكي أو المحفظة الإلكترونية وفقاً لنظام Sola.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchQueue(pagination.page)}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#0059FF] text-white hover:bg-blue-700 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card accentBorder="blue" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">الطلبات المعلقة بالقائمة</p>
              <h3 className="text-2xl font-black text-slate-900">{pagination.totalItems} <span className="text-xs font-semibold text-slate-400">طلبات</span></h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-[#0059FF] border border-blue-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-bold text-blue-700">بانتظار المعالجة الإدارية والتحويل</div>
        </Card>

        <Card accentBorder="emerald" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المبالغ المطلوبة بالصفحة</p>
              <h3 className="text-2xl font-black text-emerald-700">{totalGrossAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-400">ج.م</span></h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-200">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-bold text-emerald-700">المبلغ الإجمالي الشامل (Gross Amount EGP)</div>
        </Card>

        <Card accentBorder="amber" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">أسبقية التنفيذ الزمني</p>
              <h3 className="text-xl font-black text-slate-900">Deterministic FIFO</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-bold text-amber-800">مرتب بـ `created_at ASC, id ASC`</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              type="text"
              placeholder="ابحث برقم الطلب، اسم المالك، المعرف المشفر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Data Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات سحب أرباح معلقة حالياً 🎉"
            subtext="جميع مستحقات الملاك المعتمدة تم معالجتها بالكامل."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-3.5">رقم الطلب</th>
                  <th className="px-5 py-3.5">المالك ورقم الهاتف</th>
                  <th className="px-5 py-3.5">وسيلة التحويل</th>
                  <th className="px-5 py-3.5">المعرف المشفر (Masked Account)</th>
                  <th className="px-5 py-3.5">المبلغ الإجمالي</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.payoutRequestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#0059FF] text-xs">
                      {item.requestNumber}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{item.owner?.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.owner?.phoneNumber}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {item.payoutMethod?.methodType}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-800 dir-ltr text-right">
                      {item.payoutMethod?.maskedAccountNumber}
                    </td>
                    <td className="px-5 py-4 font-mono font-black text-emerald-700 text-sm">
                      {item.financials?.grossAmountEgp?.toLocaleString()} ج.م
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (onSelectPayoutDetail) {
                            onSelectPayoutDetail(item.payoutRequestId);
                          }
                        }}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        فتح المعالجة التنفيذية
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
