import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Clock,
  ArrowUpRight,
  MapPin
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
    return types[type?.toUpperCase()] || type;
  };

  const calculateWaitTime = (createdAt: string) => {
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

  const getStatusCount = (status: string) => {
    if (status === 'ALL') return items.length;
    return items.filter(item => item.status === status).length;
  };

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Top Banner Header */}
      <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <Building2 className="w-4 h-4 text-[#0059FF]" />
                <span>مراجعة الوحدات</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">/ طلبات النشر والإدراج</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">طابور مراجعة الوحدات العقارية</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
              قائمة بالوحدات العقارية المقدمة من الملاك بانتظار المراجعة والاعتماد للنشر في المنصة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
                fetchQueue();
                if(onStatusChange) onStatusChange();
            }}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#0059FF] text-white hover:bg-blue-700 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="ابحث باسم الوحدة، المالك، أو الموقع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PENDING_REVIEW', label: 'قيد المراجعة' },
              { id: 'PUBLISHED', label: 'منشورة' },
              { id: 'REJECTED', label: 'مرفوضة' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                  statusFilter === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {getStatusCount(tab.id)}
                </span>
              </button>
            ))}
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
            title="لا توجد وحدات مطابقة حالياً 🎉"
            subtext="جميع الوحدات تم البت فيها أو لا توجد نتائج للبحث."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-3.5">الوحدة</th>
                  <th className="px-5 py-3.5">الموقع</th>
                  <th className="px-5 py-3.5">سعر الليلة</th>
                  <th className="px-5 py-3.5">المالك</th>
                  <th className="px-5 py-3.5">تاريخ التقديم</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => onSelectProperty(item.id)}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#0059FF] text-sm">{item.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{translateUnitType(item.unitType)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-700 font-semibold max-w-[200px] truncate" title={item.address}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.address}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-black text-emerald-700 text-sm">
                      {item.pricePerNight?.toLocaleString()} ج.م
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{item.ownerName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                         {item.verificationStatus}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="font-mono">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</div>
                      <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-bold">
                        <Clock className="w-3 h-3" />
                        {calculateWaitTime(item.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProperty(item.id);
                        }}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        فتح للمراجعة
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
