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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchQueue = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(`/admin/payouts/pending?page=${pageNum}&limit=10`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً لبوابة الإدارة.');
      }

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
    const matchesSearch =
      item.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.payoutMethod?.maskedAccountNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDateLatin = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Page Banner Header */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <CreditCard className="w-4 h-4 text-[#0059FF]" />
                <span>المعاملات المالية</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ طلبات السحب</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلبات سحب الأرباح للملاك</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-semibold">
              مراجعة وتأفيذ تحويلات الأرباح المعلقة للملاك الموثقين عبر التحويل البنكي أو المحفظة الإلكترونية.
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
      </Card>

      {/* KPI Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">الطلبات المعلقة بالقائمة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{pagination.totalItems} <span className="text-xs font-semibold text-slate-400">طلبات</span></div>
          <div className="text-[11px] font-bold text-[#0059FF]">بانتظار المعالجة والتحويل الإداري</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">إجمالي المبالغ المطلوبة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">{totalGrossAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-400">ج.م</span></div>
          <div className="text-[11px] font-bold text-emerald-700">مستحقات أرباح الملاك الجاهزة للسحب</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">معايير الأمان المالية</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">100%</div>
          <div className="text-[11px] font-bold text-[#0059FF]">تشفير حماية بيانات الحسابات المالية</div>
        </div>

      </div>

      {/* Filter & Search Controls */}
      <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="بحث برقم الطلب، اسم المالك، الحساب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="!bg-slate-50 focus:!bg-white"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              الكل ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              قيد المعالجة
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'COMPLETED'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              مكتملة
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'REJECTED'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              مرفوضة
            </button>
          </div>

        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <AlertBanner type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Main Table Workspace */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden p-0">
        {loading ? (
          <TableSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات سحب أرباح معلقة حالياً 🎉"
            subtext="جميع مستحقات وأرباح الملاك تم معالجتها بالكامل وتحويلها إلى الحسابات البنكية."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-4">رقم الطلب</th>
                  <th className="px-5 py-4">المالك</th>
                  <th className="px-5 py-4">وسيلة التحويل</th>
                  <th className="px-5 py-4">المبلغ المطلوب</th>
                  <th className="px-5 py-4">حالة الطلب</th>
                  <th className="px-5 py-4">تاريخ الطلب</th>
                  <th className="px-5 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.payoutRequestId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#0059FF]">
                      {item.requestNumber}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{item.owner?.fullName || 'مالك بدون اسم'}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.owner?.phoneNumber}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.payoutMethod?.methodType === 'BANK_ACCOUNT' ? 'حساب بنكي' : 'محفظة إلكترونية'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 dir-ltr text-right">
                        {item.payoutMethod?.maskedAccountNumber}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-slate-900 text-sm">
                      {item.financials?.grossAmountEgp?.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-mono">
                      {formatDateLatin(item.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectPayoutDetail && onSelectPayoutDetail(item.payoutRequestId)}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        معالجة وسحب
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
