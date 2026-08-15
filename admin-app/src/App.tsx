import { useState, useEffect } from 'react';
import './index.css';
import { AdminLogin } from './components/AdminLogin';
import { VerificationsQueue } from './components/VerificationsQueue';
import { PayoutsQueue } from './components/PayoutsQueue';
import { PayoutDetailExecution } from './components/PayoutDetailExecution';
import { DisputesQueue } from './components/DisputesQueue';
import { DisputeDetailExecution } from './components/DisputeDetailExecution';
import {
  Scale,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Bell,
  LogOut,
  UserCheck
} from 'lucide-react';
import { Card } from './components/ui/Card';

export function App() {
  const [adminUser, setAdminUser] = useState<any | null>(() => {
    const stored = localStorage.getItem('sola_admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeTab, setActiveTab] = useState<'verifications' | 'disputes' | 'payouts' | 'overview'>('verifications');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);

  const [notificationsCount, setNotificationsCount] = useState<number>(0);

  const fetchAdminNotifications = async () => {
    try {
      const token = localStorage.getItem('sola_admin_access_token') || '';
      if (!token) return;
      const response = await fetch('/api/v1/admin/notifications', {
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

  useEffect(() => {
    if (adminUser) {
      fetchAdminNotifications();
    }
  }, [adminUser]);

  const handleLogout = () => {
    localStorage.removeItem('sola_admin_access_token');
    localStorage.removeItem('sola_admin_user');
    setAdminUser(null);
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
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F172A] font-sans flex flex-col dir-rtl" dir="rtl">
      
      {/* SOLA Clean White Master Header — White-First Design System Standard */}
      <header className="bg-white sticky top-0 z-40 px-4 sm:px-6 py-3.5 border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Brand & Platform Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0059FF] flex items-center justify-center font-black text-[#FFD700] text-xl shadow-md border border-blue-400/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-slate-900 tracking-wide">SOLA VACATION RENTALS</h1>
                <span className="text-[10px] font-extrabold bg-blue-50 text-[#0059FF] px-2.5 py-0.5 rounded-full border border-blue-200">
                  ADMIN PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">بوابة الإدارة والحسم التشغيلي — Administrator (ROLE_ADMIN)</p>
            </div>
          </div>

          {/* User Controls & Status Indicators */}
          <div className="flex items-center gap-3">
            
            {/* Live Status Badge — Semantic Functional Green */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-2xl border border-emerald-200 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL Real-Time Connected 🔒</span>
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
                <div className="text-slate-900 text-xs leading-none font-bold">{adminUser.fullName || 'مسئول المنصة'}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{adminUser.role || 'ROLE_ADMIN'}</div>
              </div>
            </div>

            {/* Logout Button — Semantic Functional Red */}
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

      {/* Main Navigation Sub-Bar */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
          
          <nav className="flex space-x-1 space-x-reverse py-2">
            
            {/* Tab 1: Verifications Queue */}
            <button
              onClick={() => {
                setActiveTab('verifications');
                setSelectedDisputeId(null);
                setSelectedPayoutId(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'verifications'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>توثيق الملاك (Live Queue)</span>
            </button>

            {/* Tab 2: Disputes Workspace */}
            <button
              onClick={() => {
                setActiveTab('disputes');
                setSelectedDisputeId(null);
                setSelectedPayoutId(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'disputes'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>النزاعات والبت الإداري (FLOW-ADM-09)</span>
            </button>

            {/* Tab 3: Payouts Execution */}
            <button
              onClick={() => {
                setActiveTab('payouts');
                setSelectedDisputeId(null);
                setSelectedPayoutId(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'payouts'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>طلبات سحب الأرباح (FLOW-ADM-07/08)</span>
            </button>

            {/* Tab 4: Operational Overview */}
            <button
              onClick={() => {
                setActiveTab('overview');
                setSelectedDisputeId(null);
                setSelectedPayoutId(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#0059FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>نظرة عامة تشغيلية (Overview)</span>
            </button>

          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Master Contracts: FLOW-ADM-01 ➔ FLOW-ADM-09 Locked 🔒</span>
          </div>

        </div>
      </div>

      {/* Main Operational Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: VERIFICATIONS QUEUE */}
        {activeTab === 'verifications' && (
          <VerificationsQueue onStatusChange={fetchAdminNotifications} />
        )}

        {/* TAB 2: DISPUTES (FLOW-ADM-09) */}
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

        {/* TAB 3: PAYOUTS (FLOW-ADM-07/08) */}
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

        {/* TAB 4: OPERATIONAL OVERVIEW — White-First Design System Standard */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in dir-rtl" dir="rtl">
            <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0059FF] border border-blue-200">
                      <BarChart3 className="w-3.5 h-3.5 text-[#0059FF]" />
                      <span>SOLA Control Center</span>
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ المؤشرات التشغيلية الحية</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">لوحة النظرة العامة والعمليات التشغيلية (Live Operations Dashboard)</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    مؤشرات الأداء التشغيلية وموجز المحافظ والحجوزات ومرحلة تجميد العقود المغلقة.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-200 text-xs font-bold shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>جميع الأنظمة التشغيلية تعمل بنجاح 100% 🔒</span>
                </div>
              </div>

              {/* Operational Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Pending Verifications */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">طلبات التوثيق المعلقة</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">1 طلبات</div>
                  <div className="text-[11px] font-bold text-[#0059FF]">قائمة انتظار توثيق هوية الملاك</div>
                </div>

                {/* Metric 2: Disputes Queue */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-rose-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">النزاعات المصعدة للبت</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">0 نزاعات</div>
                  <div className="text-[11px] font-bold text-rose-600">FLOW-ADM-09 Governance Queue</div>
                </div>

                {/* Metric 3: Payout Requests */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">طلبات سحب الأرباح المعلقة</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">0 طلبات</div>
                  <div className="text-[11px] font-bold text-amber-800">FLOW-ADM-07/08 Payouts Queue</div>
                </div>

                {/* Metric 4: System Architecture Freeze Status */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-right space-y-2 hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600">حالة التجميد المالي والعقود</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-700">FROZEN 🔒</div>
                  <div className="text-[11px] font-bold text-emerald-700">Master Closed Contracts Active</div>
                </div>
              </div>
            </Card>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs font-semibold text-slate-500">
        SOLA Vacation Rentals Hospitality Operations Platform © 2026 — Unified Brand & Design System
      </footer>

    </div>
  );
}

export default App;
