import { useState, useEffect } from 'react';
import './index.css';
import { AdminLogin } from './components/AdminLogin';
import { VerificationsQueue } from './components/VerificationsQueue';
import { PayoutsQueue } from './components/PayoutsQueue';
import { PayoutDetailExecution } from './components/PayoutDetailExecution';
import { DisputesQueue } from './components/DisputesQueue';
import { DisputeDetailExecution } from './components/DisputeDetailExecution';
import { PropertyReviewQueue } from './components/PropertyReviewQueue';
import { PropertyReviewDetail } from './components/PropertyReviewDetail';
import { getApiUrl } from './utils/api';
import {
  Scale,
  CreditCard,
  BarChart3,
  Bell,
  LogOut,
  UserCheck,
  Building2
} from 'lucide-react';
import { Card } from './components/ui/Card';

export function App() {
  const [adminUser, setAdminUser] = useState<any | null>(() => {
    const stored = localStorage.getItem('sola_admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'properties' | 'payouts' | 'disputes'>('overview');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [overviewStats, setOverviewStats] = useState<any>(null);

  const fetchAdminNotifications = async () => {
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      if (!token) return;
      const response = await fetch(getApiUrl('/admin/notifications'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setNotificationsCount(json.data.length);
      }
    } catch {
      // Quiet fallback
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      if (!token) return;
      const response = await fetch(getApiUrl('/admin/overview/stats'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.success && json.data) {
        setOverviewStats(json.data);
      }
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchAdminNotifications();
      fetchOverviewStats();
    }
  }, [adminUser]);

  const handleLogout = () => {
    localStorage.removeItem('sola_admin_access_token');
    localStorage.removeItem('sola_admin_user');
    setAdminUser(null);
  };

  const resetSubSelections = () => {
    setSelectedDisputeId(null);
    setSelectedPayoutId(null);
    setSelectedPropertyId(null);
  };

  if (!adminUser) {
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          setAdminUser(user);
          fetchAdminNotifications();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col dir-rtl" dir="rtl">
      
      {/* SOLA Master Header — Unified Design System Standard */}
      <header className="bg-white sticky top-0 z-40 px-4 sm:px-6 py-3.5 border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Standalone Brand Logo */}
          <div className="flex items-center">
            <img src="/favicon.svg" alt="Brand Logo" className="w-9 h-9 object-contain" />
          </div>

          {/* User Controls & Status Indicators */}
          <div className="flex items-center gap-3">
            
            {/* Live Status Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-2xl border border-emerald-200 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>النظام مستقر وتعمل الكيانات بنجاح</span>
            </div>

            {/* Notifications Counter */}
            <button className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0059FF] transition-all border border-slate-200 active:scale-95 cursor-pointer">
              <Bell className="w-4.5 h-4.5 text-slate-700" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#0059FF] text-[#FFD700] rounded-full text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                  {notificationsCount}
                </span>
              )}
            </button>

            {/* Admin User Profile Chip */}
            <div className="flex items-center gap-2 bg-slate-50 pl-3 pr-2 py-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800">
              <div className="w-7 h-7 rounded-xl bg-[#0059FF] flex items-center justify-center font-black text-[#FFD700] text-xs">
                A
              </div>
              <div className="text-right">
                <div className="text-slate-900 text-xs leading-none font-bold">{adminUser.fullName || 'مسؤول المنصة'}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">إدارة صولا</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 flex items-center gap-1 text-xs font-extrabold cursor-pointer active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

          </div>

        </div>
      </header>

      {/* Primary Core Navigation Bar — Sleek Professional Standard */}
      <div className="bg-white border-b border-slate-200/90 shadow-xs sticky top-[65px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto no-scrollbar scroll-smooth">
          
          <nav className="flex items-center space-x-1.5 space-x-reverse py-2.5">
            
            {/* Core Tab 1: Operational Overview */}
            <button
              onClick={() => {
                setActiveTab('overview');
                resetSubSelections();
              }}
              className={`px-4.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer active:scale-98 ${
                activeTab === 'overview'
                  ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/20 font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5 shrink-0" />
              <span>نظرة عامة تشغيلية</span>
            </button>

            {/* Core Tab 2: Owner Verifications */}
            <button
              onClick={() => {
                setActiveTab('verifications');
                resetSubSelections();
              }}
              className={`px-4.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer active:scale-98 ${
                activeTab === 'verifications'
                  ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/20 font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <UserCheck className="w-4.5 h-4.5 shrink-0" />
              <span>توثيق الملاك</span>
            </button>

            {/* Core Tab 3: Unit Reviews */}
            <button
              onClick={() => {
                setActiveTab('properties');
                resetSubSelections();
              }}
              className={`px-4.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer active:scale-98 ${
                activeTab === 'properties'
                  ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/20 font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <Building2 className="w-4.5 h-4.5 shrink-0" />
              <span>مراجعة الوحدات</span>
            </button>

            {/* Core Tab 4: Payout Requests */}
            <button
              onClick={() => {
                setActiveTab('payouts');
                resetSubSelections();
              }}
              className={`px-4.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer active:scale-98 ${
                activeTab === 'payouts'
                  ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/20 font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <CreditCard className="w-4.5 h-4.5 shrink-0" />
              <span>طلبات السحب المالي</span>
            </button>

            {/* Core Tab 5: Disputes Management */}
            <button
              onClick={() => {
                setActiveTab('disputes');
                resetSubSelections();
              }}
              className={`px-4.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer active:scale-98 ${
                activeTab === 'disputes'
                  ? 'bg-[#0059FF] text-white shadow-sm shadow-blue-500/20 font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <Scale className="w-4.5 h-4.5 shrink-0" />
              <span>إدارة النزاعات</span>
            </button>

          </nav>

        </div>
      </div>

      {/* Main Operational Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* CORE TAB 1: OPERATIONAL OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
            <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                      <BarChart3 className="w-3.5 h-3.5 text-[#0059FF]" />
                      <span>مركز التحكم</span>
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ المؤشرات التشغيلية الحية</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">لوحة النظرة العامة والعمليات التشغيلية</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    مؤشرات الأداء التشغيلية وموجز طلبات التوثيق والوحدات والسحوبات المالية والنزاعات.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-200 text-xs font-bold shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>جميع الأنظمة التشغيلية تعمل بنجاح</span>
                </div>
              </div>

              {/* Operational Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1: Pending Unit Reviews */}
                <div 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setActiveTab('properties'); setSelectedPropertyId(null); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">وحدات تنتظر المراجعة</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overviewStats?.properties?.pendingProperties ?? 0} <span className="text-xs font-semibold text-slate-400">وحدة</span></div>
                  <div className="text-[11px] font-bold text-[#0059FF]">طابور مراجعة العقارات والوحدات</div>
                </div>

                {/* Metric 2: Pending Verifications */}
                <div 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-[#0059FF] hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setActiveTab('verifications'); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">طلبات التوثيق المعلقة</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overviewStats?.verifications?.pendingVerifications ?? 0} <span className="text-xs font-semibold text-slate-400">طلبات</span></div>
                  <div className="text-[11px] font-bold text-[#0059FF]">قائمة انتظار توثيق هوية الملاك</div>
                </div>

                {/* Metric 3: Payout Requests */}
                <div 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setActiveTab('payouts'); setSelectedPayoutId(null); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">طلبات سحب الأرباح</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overviewStats?.payouts?.pendingPayouts ?? 0} <span className="text-xs font-semibold text-slate-400">طلبات</span></div>
                  <div className="text-[11px] font-bold text-amber-800">قائمة السحوبات المالية</div>
                </div>

                {/* Metric 4: Disputes Queue */}
                <div 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setActiveTab('disputes'); setSelectedDisputeId(null); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">النزاعات المفتوحة</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overviewStats?.disputes?.openDisputes ?? 0} <span className="text-xs font-semibold text-slate-400">نزاعات</span></div>
                  <div className="text-[11px] font-bold text-rose-600">طابور النزاعات والبت المالي</div>
                </div>

              </div>
            </Card>
          </div>
        )}

        {/* CORE TAB 2: VERIFICATIONS QUEUE */}
        {activeTab === 'verifications' && (
          <VerificationsQueue onStatusChange={fetchAdminNotifications} />
        )}

        {/* CORE TAB 3: PROPERTIES QUEUE */}
        {activeTab === 'properties' && (
          selectedPropertyId ? (
            <PropertyReviewDetail
              propertyId={selectedPropertyId}
              onBack={() => setSelectedPropertyId(null)}
            />
          ) : (
            <PropertyReviewQueue
              onSelectProperty={(id) => setSelectedPropertyId(id)}
              onStatusChange={fetchAdminNotifications}
            />
          )
        )}

        {/* CORE TAB 4: PAYOUTS QUEUE */}
        {activeTab === 'payouts' && (
          selectedPayoutId ? (
            <PayoutDetailExecution
              payoutId={selectedPayoutId}
              onBack={() => setSelectedPayoutId(null)}
            />
          ) : (
            <PayoutsQueue
              onSelectPayoutDetail={(id: string) => setSelectedPayoutId(id)}
            />
          )
        )}

        {/* CORE TAB 5: DISPUTES QUEUE */}
        {activeTab === 'disputes' && (
          selectedDisputeId ? (
            <DisputeDetailExecution
              disputeId={selectedDisputeId}
              onBack={() => setSelectedDisputeId(null)}
            />
          ) : (
            <DisputesQueue
              onSelectDispute={(id) => setSelectedDisputeId(id)}
            />
          )
        )}

      </main>

      {/* Unified Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs font-semibold text-slate-500">
        SOLA Vacation Rentals Hospitality Operations Platform © 2026 — Unified Design System
      </footer>

    </div>
  );
}

export default App;
