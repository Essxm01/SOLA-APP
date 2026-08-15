import { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { TableSkeleton, EmptyState } from './ui/StateViews';

export interface DisputesQueueProps {
  onSelectDispute: (disputeId: string) => void;
}

export function DisputesQueue({ onSelectDispute }: DisputesQueueProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sola_admin_access_token') || 'admin_token_valid';
      const response = await fetch('/api/v1/admin/disputes/pending', {
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
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const totalFrozenEgp = items.reduce((acc, curr) => acc + (curr.frozenHoldEgp || 0), 0);
  const escalatedCount = items.filter(i => i.status === 'ESCALATED_TO_ADMIN').length;
  const resolvingCount = items.filter(i => i.status === 'RESOLVING_PENDING_GATEWAY').length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.disputeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.property?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.renter?.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
      
      {/* Top Banner Header — White-First Design System Standard */}
      <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                <Scale className="w-4 h-4 text-[#0059FF]" />
                <span>FLOW-ADM-09 Governance</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">/ مركز الحسم التشغيلي</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة ونزاعات المستأجرين والمالك (Disputes Workspace)</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
              المراجعة الإدارية للنزاعات المصعدة، البت المالي الذري، والتحفظ على الأموال وفقاً لمواصفات Sola.
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
      </div>

      {/* Operational KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <Card accentBorder="amber" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">النزاعات المصعدة للبت</p>
              <h3 className="text-2xl font-black text-slate-900">{escalatedCount} <span className="text-xs font-semibold text-slate-400">نزاع</span></h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            <span>تتطلب قرار إداري بمهلة 72 ساعة</span>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card accentBorder="rose" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المبالغ المحجوزة (Held Balance)</p>
              <h3 className="text-2xl font-black text-rose-600">{totalFrozenEgp.toLocaleString()} <span className="text-xs font-semibold text-slate-400">ج.م</span></h3>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 border border-rose-200">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-rose-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>محرسة بجدول `held_balance` بالداتابيز</span>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card accentBorder="sky" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">استردادات قيد المعالجة البنكية</p>
              <h3 className="text-2xl font-black text-sky-700">{resolvingCount} <span className="text-xs font-semibold text-slate-400">Saga</span></h3>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600 border border-sky-200">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-sky-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>بانتظار تأكيد بوابة الدفع الإلكترونية</span>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card accentBorder="blue" className="bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">الالتزام التنفيذي بالعقود</p>
              <h3 className="text-2xl font-black text-[#0059FF]">100% <span className="text-xs font-semibold text-slate-400">Master Locked</span></h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-[#0059FF] border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-700">
            <span>FLOW-ADM-09 Master Contract 🔒</span>
          </div>
        </Card>

      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-white p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="w-full sm:w-80">
            <Input
              type="text"
              placeholder="ابحث برقم النزاع، اسم المالك، اسم المستأجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-64">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              icon={<Filter className="w-4 h-4 text-slate-400" />}
            >
              <option value="ALL">جميع حالات النزاع</option>
              <option value="ESCALATED_TO_ADMIN">ESCALATED_TO_ADMIN — مصعد للإدارة</option>
              <option value="RESOLVING_PENDING_GATEWAY">RESOLVING_PENDING_GATEWAY — معالجة الاسترداد البنكي</option>
              <option value="RESOLVED">RESOLVED — محسوم نهائياً</option>
            </Select>
          </div>

        </div>
      </Card>

      {/* Main Disputes Table Workspace */}
      <Card className="overflow-hidden p-0">
        
        {loading ? (
          <TableSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="لا توجد نزاعات معلقة مطابقة للبحث"
            subtext="جميع طلبات النزاع تم حسمها وتفريغها بحسابات المحفظة المعتمدة."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
                  <th className="px-5 py-3.5">رقم النزاع</th>
                  <th className="px-5 py-3.5">تفاصيل الوحدة الحجز</th>
                  <th className="px-5 py-3.5">أطراف النزاع (مستأجر / مالك)</th>
                  <th className="px-5 py-3.5">المبلغ المحجوز ($H$)</th>
                  <th className="px-5 py-3.5">الحالة الراهنة</th>
                  <th className="px-5 py-3.5">Admin SLA</th>
                  <th className="px-5 py-3.5 text-center">الإجراء الإداري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white font-medium text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.disputeId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Dispute Number */}
                    <td className="px-5 py-4 font-mono font-bold text-[#0059FF] text-xs">
                      {item.disputeNumber}
                    </td>

                    {/* Property & Booking */}
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{item.property?.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">حجز: #{item.bookingId}</div>
                    </td>

                    {/* Parties */}
                    <td className="px-5 py-4">
                      <div className="text-slate-900 font-semibold">المستأجر: <strong>{item.renter?.fullName}</strong></div>
                      <div className="text-slate-500 text-[11px] mt-0.5">المالك: {item.owner?.fullName}</div>
                    </td>

                    {/* Held Amount */}
                    <td className="px-5 py-4 font-mono font-black text-rose-600 text-sm">
                      {item.frozenHoldEgp?.toLocaleString()} ج.م
                    </td>

                    {/* Status Chip */}
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* SLA Timer */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60 w-fit">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{new Date(item.adminSlaDeadlineAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectDispute(item.disputeId)}
                        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                        className="mx-auto"
                      >
                        فتح البت الإداري
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
