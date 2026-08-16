import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Clock,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input } from './ui/Input';
import { TableSkeleton, EmptyState, AlertBanner } from './ui/StateViews';
import { getApiUrl } from '../utils/api';

export interface PropertyItem {
  id: string;
  title: string;
  unitType: string;
  address: string;
  pricePerNight: number;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
}

export interface PropertyReviewQueueProps {
  onSelectProperty: (id: string) => void;
  onStatusChange?: () => void;
}

export function PropertyReviewQueue({ onSelectProperty, onStatusChange }: PropertyReviewQueueProps) {
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'>('ALL');

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch(getApiUrl('/admin/properties/pending'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('فشل استرجاع قائمة الوحدات المعلقة');
      }

      const json = await response.json();
      if (json.success && json.data) {
        setItems(json.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الوحدات');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const translateUnitType = (type: string) => {
    const types: Record<string, string> = {
      CHALET: 'شاليه',
      VILLA: 'فيلا',
      APARTMENT: 'شقة',
      STUDIO: 'استوديو',
      CABIN: 'كابينة',
    };
    return types[type?.toUpperCase()] || type || 'وحدة عقارية';
  };

  const calculateWaitTime = (createdAt: string) => {
    if (!createdAt) return 'مؤخراً';
    const diff = new Date().getTime() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    return 'مؤخراً';
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = items.filter(item => item.status === 'PENDING_REVIEW').length;
  const publishedCount = items.filter(item => item.status === 'PUBLISHED').length;
  const rejectedCount = items.filter(item => item.status === 'REJECTED').length;

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Page Banner Header */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <Building2 className="w-4 h-4 text-[#0059FF]" />
                <span>إدارة الوحدات</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ مراجعة العقارات</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طابور مراجعة العقارات والوحدات السكنية</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-semibold">
              مراجعة طلبات النشر والإدراج المقدمة من الملاك، التأكد من استيفاء المعايير، والاعتماد للنشر الفوري.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchQueue();
              if (onStatusChange) onStatusChange();
            }}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#0059FF] text-white hover:bg-blue-700 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </Card>

      {/* KPI Operational Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">وحدات تنتظر المراجعة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingCount} <span className="text-xs font-semibold text-slate-400">وحدة</span></div>
          <div className="text-[11px] font-bold text-[#0059FF]">طابور فحص طلبات الإدراج الجديدة</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">وحدات منشورة ومعتمدة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">{publishedCount} <span className="text-xs font-semibold text-slate-400">وحدة</span></div>
          <div className="text-[11px] font-bold text-emerald-700">متاحة للحجز المباشر بالمنصة</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600">وحدات مرفوضة للتعديل</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600">{rejectedCount} <span className="text-xs font-semibold text-slate-400">وحدة</span></div>
          <div className="text-[11px] font-bold text-rose-700">تتطلب إعادة رفع الوثائق والمعلومات</div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="بحث باسم الوحدة، المالك، العنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="!bg-slate-50 focus:!bg-white"
            />
          </div>

          {/* Filter Pills */}
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
              onClick={() => setStatusFilter('PENDING_REVIEW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              قيد المراجعة ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              منشورة ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'REJECTED'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              مرفوضة ({rejectedCount})
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
            title="لا توجد وحدات عقارية بانتظار المراجعة حالياً 🎉"
            subtext="جميع العقارات والوحدات المقدمة تم البت فيها واعتتماد نشرها بالكامل بالمنصة."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-4">اسم الوحدة</th>
                  <th className="px-5 py-4">نوع العين</th>
                  <th className="px-5 py-4">الموقع والعنوان</th>
                  <th className="px-5 py-4">السعر / ليلة</th>
                  <th className="px-5 py-4">المالك</th>
                  <th className="px-5 py-4">حالة المراجعة</th>
                  <th className="px-5 py-4">مدة الانتظار</th>
                  <th className="px-5 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {item.title}
                    </td>

                    <td className="px-5 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                        {translateUnitType(item.unitType)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#0059FF]" />
                        <span>{item.address || 'غير محدد'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-extrabold text-slate-900 text-sm">
                      {item.pricePerNight?.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{item.ownerName || 'مالك بدون اسم'}</div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-mono">
                      {calculateWaitTime(item.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectProperty(item.id)}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        معاينة والبت
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
