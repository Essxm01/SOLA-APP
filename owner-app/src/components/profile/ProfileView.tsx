import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VerificationBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { OwnerVerificationModal } from './OwnerVerificationModal';
import { repositoryFactory } from '../../services/repositoryFactory';
import {
  User,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  X,
  Phone,
  MessageCircle,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { owner, phoneNumber, logout } = useAuth();
  const { properties, bookings, showToast, refreshData } = useApp();

  // Modals state
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);

  // Edit profile form state
  const [fullName, setFullName] = useState<string>((owner as any)?.fullName || owner?.name || '');
  const [email, setEmail] = useState<string>((owner as any)?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    owner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  );
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // App settings state
  const [bookingNotifs, setBookingNotifs] = useState<boolean>(true);
  const [messageAlerts, setMessageAlerts] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);

  // Support FAQs state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  const ownerDisplayName = (owner as any)?.fullName || owner?.name || 'لم يتم إضافة الاسم بعد';
  const verificationStatus = owner?.verificationStatus || 'UNVERIFIED';
  const displayPhone = phoneNumber || owner?.phone || (owner as any)?.phoneNumber || '+201001234567';

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const repo = repositoryFactory;
      if (!repo.useMockMode) {
        await repo.owner.updateOwnerProfile({
          name: fullName,
          fullName,
          email,
          avatar: avatarUrl,
          avatarUrl,
        });
      }
      if (owner) {
        (owner as any).fullName = fullName;
        (owner as any).email = email;
        (owner as any).avatar = avatarUrl;
      }
      showToast('تم تحديث البيانات الشخصية بنجاح 🟢', 'success');
      setIsEditProfileOpen(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ البيانات', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Save App Settings
  const handleSaveSettings = () => {
    localStorage.setItem('sola_owner_notifs_booking', String(bookingNotifs));
    localStorage.setItem('sola_owner_notifs_msg', String(messageAlerts));
    localStorage.setItem('sola_owner_sound', String(soundEffects));
    showToast('تم حفظ إعدادات الإشعارات والتطبيق بنجاح ⚙️', 'success');
    setIsAppSettingsOpen(false);
  };

  // Handle Send Feedback
  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackText('');
      showToast('تم إرسال ملاحظاتك بنجاح لمسئولي منصة صولا. شكراً لك! ❤️', 'success');
    }, 800);
  };

  const faqs = [
    {
      q: 'كيف أضيف وحدة عقارية جديدة للمنصة؟',
      a: 'يمكنك إضافة وحدة جديدة عن طريق الانتقال لتبويب "الوحدات" والضغط على زر "إضافة وحدة جديدة +". سيتم توجيهك لمعالج الإضافة لملء البيانات والتصاوير والأسعار.',
    },
    {
      q: 'متى يتم تحويل أموال الحجوزات والمستحقات للحساب؟',
      a: 'يتم تحويل دفعة العربون فور تأكيد الحجز، ويتم تحويل المبالغ لبطاقتك أو حسابك البنكي خلال 24 إلى 48 ساعة عمل من طلب السحب عبر شاشة المحفظة.',
    },
    {
      q: 'كيف أتعامل مع طلبات الإلغاء أو النزاعات؟',
      a: 'يمكنك إدارة جميع النزاعات وطلبات الإلغاء رسمياً عبر تبويب "النزاعات" والمحادثات المباشرة لضمان حفظ حقوق المالك والمستأجر طبقاً للشروط والأحكام.',
    },
    {
      q: 'ما هي عمولة منصة Sola على الحجوزات؟',
      a: 'عمولة المنصة ثابتة ومحددة بـ 20% فقط من الإجمالي الكلي للحجز وتتضمن جميع مصاريف البوابة الإلكترونية والتسويق.',
    },
  ];

  return (
    <div className="p-4 space-y-4 dir-rtl text-right pb-24">
      <h2 className="text-xl font-black text-slate-900 mb-2">الملف الشخصي والحساب</h2>

      {/* Owner Header Info Card */}
      <div className="bg-gradient-to-br from-blue-900 via-[#0059FF] to-blue-700 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <img
            src={avatarUrl}
            alt={ownerDisplayName}
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/30 shadow-md shrink-0"
          />

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black truncate">{ownerDisplayName}</h3>
            <p className="text-xs text-blue-100 font-mono dir-ltr text-right mb-2 truncate">
              {displayPhone}
            </p>
            <VerificationBadge
              status={verificationStatus}
              label={
                verificationStatus === 'VERIFIED'
                  ? 'حساب موثق رسمياً ✅'
                  : verificationStatus === 'PENDING_VERIFICATION'
                  ? 'طلب التوثيق قيد مراجعة الإدارة'
                  : 'حساب غير موثق (اضغط للتوثيق)'
              }
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-white/20 text-center relative z-10">
          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md">
            <span className="text-xs text-blue-100 block">إجمالي الوحدات</span>
            <span className="text-xl font-black font-mono">{properties.length} وحدات</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-md">
            <span className="text-xs text-blue-100 block">الحجوزات النشطة</span>
            <span className="text-xl font-black font-mono">{bookings.length} حجوزات</span>
          </div>
        </div>
      </div>

      {/* Account Settings List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs">
        {/* 1. Identity Verification */}
        <button
          onClick={() => setIsVerificationModalOpen(true)}
          className="w-full p-4 flex items-center justify-between text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">توثيق المالك والهوية (Identity Verification)</span>
              <span className="text-xs text-slate-500">حالة التوثيق بالداتابيز: {verificationStatus}</span>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        {/* 2. Personal Details */}
        <button
          onClick={() => {
            setFullName((owner as any)?.fullName || owner?.name || '');
            setEmail((owner as any)?.email || '');
            setIsEditProfileOpen(true);
          }}
          className="w-full p-4 flex items-center justify-between text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0059FF] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">البيانات الشخصية ورقم الهاتف</span>
              <span className="text-xs text-slate-500">{displayPhone}</span>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        {/* 3. App Settings */}
        <button
          onClick={() => setIsAppSettingsOpen(true)}
          className="w-full p-4 flex items-center justify-between text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">إعدادات الإشعارات والتطبيق</span>
              <span className="text-xs text-slate-500">التنبيهات، الصوت، اللغة</span>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
        </button>

        {/* 4. Support & Help */}
        <button
          onClick={() => setIsSupportOpen(true)}
          className="w-full p-4 flex items-center justify-between text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">المساعدة والملاحظات</span>
              <span className="text-xs text-slate-500">الأسئلة الشائعة، التواصل مع الدعم</span>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Logout Button */}
      <div className="pt-4">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => setIsLogoutConfirmOpen(true)}
          icon={<LogOut className="w-5 h-5" />}
          className="py-3.5 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
        >
          تسجيل الخروج من حساب المالك
        </Button>
      </div>

      {/* 1. Identity Verification Modal */}
      <OwnerVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />

      {/* 2. Edit Personal Details Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 dir-rtl text-right shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#0059FF]" />
                <span>تعديل البيانات الشخصية</span>
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              {/* Profile Image URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">صورة الملف الشخصي (رابط الصورة)</label>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-100 shrink-0"
                  />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0059FF] outline-hidden font-mono dir-ltr"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الاسم الكامل للمالك</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0059FF] outline-hidden"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0059FF] outline-hidden font-mono dir-ltr text-right"
                />
              </div>

              {/* Phone (Readonly) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف (مسجل بالداتابيز)</label>
                <input
                  type="text"
                  disabled
                  value={displayPhone}
                  className="w-full text-xs p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono dir-ltr text-right cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  fullWidth
                  className="bg-[#0059FF] hover:bg-blue-700 text-white font-bold py-3"
                  icon={isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isSavingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="py-3"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. App Settings Modal */}
      {isAppSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 dir-rtl text-right shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <span>إعدادات التطبيق والإشعارات</span>
              </h3>
              <button
                onClick={() => setIsAppSettingsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggles */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">إشعارات الحجوزات والطلبات</span>
                  <span className="text-[11px] text-slate-500">تلقي تنبيهات فورية عند وصول حجز جديد</span>
                </div>
                <input
                  type="checkbox"
                  checked={bookingNotifs}
                  onChange={(e) => setBookingNotifs(e.target.checked)}
                  className="w-5 h-5 accent-[#0059FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">تنبيهات الرسائل والنزاعات</span>
                  <span className="text-[11px] text-slate-500">إشعار فور إرسال المستأجر لمحادثة أو نزاع</span>
                </div>
                <input
                  type="checkbox"
                  checked={messageAlerts}
                  onChange={(e) => setMessageAlerts(e.target.checked)}
                  className="w-5 h-5 accent-[#0059FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">أصوات التنبيهات</span>
                  <span className="text-[11px] text-slate-500">تشغيل صوت مميز عند وصول إشعار هائل</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="w-5 h-5 accent-[#0059FF] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-blue-900">
                <span className="font-bold">لغة واجهة التطبيق</span>
                <span className="font-bold bg-white px-2.5 py-1 rounded-xl border border-blue-200 text-[#0059FF]">العربية (افتراضي) 🇪🇬</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                onClick={handleSaveSettings}
                fullWidth
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
                icon={<Save className="w-4 h-4" />}
              >
                حفظ الإعدادات
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAppSettingsOpen(false)}
                className="py-3"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Support & Help Center Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 space-y-4 dir-rtl text-right shadow-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <span>مركز المساعدة والدعم الفني 24/7</span>
              </h3>
              <button
                onClick={() => setIsSupportOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="https://wa.me/201000000000"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>واتساب الدعم المباشر</span>
              </a>

              <a
                href="tel:+201000000000"
                className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center gap-2 font-bold text-blue-900 hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#0059FF]" />
                <span>اتصال هاتفى فوري</span>
              </a>
            </div>

            {/* FAQs Accordion */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900">الأسئلة الشائعة والإرشادات</h4>
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-3 bg-slate-50 flex items-center justify-between font-bold text-slate-800 text-right"
                  >
                    <span>{faq.q}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="p-3 bg-white text-slate-600 border-t border-slate-100 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Feedback */}
            <form onSubmit={handleSendFeedback} className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-900">إرسال مقترح أو إبلاغ عن مشكلة</h4>
              <textarea
                rows={3}
                required
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="اكتب تفاصيل مقترحك أو استفسارك هنا..."
                className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <Button
                type="submit"
                disabled={isSubmittingFeedback}
                fullWidth
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs"
              >
                {isSubmittingFeedback ? 'جاري الإرسال...' : 'إرسال الملاحظة للدعم'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 dir-rtl text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تأكيد تسجيل الخروج</h3>
              <p className="text-xs text-slate-500 mt-1">هل أنت متأكد من رغبتك في تسجيل الخروج من حساب المالك؟</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={logout}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 text-xs"
              >
                تأكيد الخروج
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="py-3 text-xs"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

