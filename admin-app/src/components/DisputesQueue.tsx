import { useState, useEffect } from 'react';
import {
  Scale,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Lock,
  ArrowUpRight,
  Building
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input } from './ui/Input';
import { TableSkeleton, EmptyState, AlertBanner } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface DisputesQueueProps {
  onSelectDispute: (disputeId: string) => void;
}

export function DisputesQueue({ onSelectDispute }: DisputesQueueProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl('/admin/disputes/pending'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('فشل استرجاع قائمة انتظار النزاعات المرفوعة للإدارة');
      }

      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data.items)) {
        setItems(json.data.items);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل النزاعات');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const totalFrozenEgp = items.reduce((acc, curr) => acc + (curr.frozenHoldEgp || 0), 0);
  const escalatedCount = items.filter(i => i.status === 'ESCALATED_TO_ADMIN' || i.status === 'OPENED').length;
  const resolvingCount = items.filter(i => i.status === 'RESOLVING_PENDING_GATEWAY').length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.disputeNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.renter?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

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
                <Scale className="w-4 h-4 text-[#0059FF]" />
                <span>مركز البت والرقابة</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ إدارة النزاعات</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة النزاعات وقضايا الحجز</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-semibold">
              المراجعة الإدارية للنزاعات المصعدة، الفحص المالي، ومتابعة مبالغ التحفظ المالي بين المالك والمستأجر.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#0059FF] text-white hover:bg-blue-700 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث النزاعات</span>
          </button>
        </div>
      </Card>

      {/* KPI Operational Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">النزاعات المصعدة للبت</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{escalatedCount} <span className="text-xs font-semibold text-slate-400">نزاع</span></div>
          <div className="text-[11px] font-bold text-amber-700">تتطلب قرار إداري بمهلة 72 ساعة</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">إجمالي المبالغ التحفظية المحجوزة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600">{totalFrozenEgp.toLocaleString()} <span className="text-xs font-semibold text-slate-400">ج.م</span></div>
          <div className="text-[11px] font-bold text-rose-700">مبالغ متحفظ عليها لصالح حسم النزاع</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">استردادات قيد المعالجة البنكية</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{resolvingCount} <span className="text-xs font-semibold text-slate-400">معاملات</span></div>
          <div className="text-[11px] font-bold text-[#0059FF]">بانتظار تأكيد بوابة الدفع الإلكتروني</div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="بحث برقم النزاع، الوحدة، المالك، المستأجر..."
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
              onClick={() => setStatusFilter('ESCALATED_TO_ADMIN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ESCALATED_TO_ADMIN'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              مصعدة للإدارة
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVING_PENDING_GATEWAY')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'RESOLVING_PENDING_GATEWAY'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              قيد البنك
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'RESOLVED'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              تم الحسم
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
            title="لا توجد نزاعات مفتوحة حالياً 🎉"
            subtext="جميع قضايا النزاع والحجز تم الفصل والبت فيها بالكامل بين الملاك والمستأجرين."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-4">رقم النزاع</th>
                  <th className="px-5 py-4">الوحدة العقارية</th>
                  <th className="px-5 py-4">أطراف النزاع</th>
                  <th className="px-5 py-4">المبلغ المحجوز</th>
                  <th className="px-5 py-4">حالة النزاع</th>
                  <th className="px-5 py-4">تاريخ الفتح</th>
                  <th className="px-5 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.disputeId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-[#0059FF]">
                      {item.disputeNumber}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.property?.title || 'عقار غير محدد'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.bookingId}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-900 font-bold flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">المالك:</span>
                        <span>{item.owner?.fullName || 'مالك'}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400">المستأجر:</span>
                        <span>{item.renter?.fullName || 'مستأجر'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-rose-600 text-sm">
                      {item.frozenHoldEgp?.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
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
                        onClick={() => onSelectDispute(item.disputeId)}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        البت والحسم
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
