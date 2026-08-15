import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface OwnerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerVerificationModal: React.FC<OwnerVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { owner } = useAuth();
  const { showToast, refreshData } = useApp();

  const [documentType, setDocumentType] = useState<'NATIONAL_ID' | 'PASSPORT' | 'COMMERCIAL_REGISTER'>('NATIONAL_ID');
  const [documentUrl, setDocumentUrl] = useState<string>('https://storage.sola.eg/uploads/national_id_front.jpg');
  const [nationalIdNumber, setNationalIdNumber] = useState<string>('29901011234567');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFilePreviewUrl(result);
        setDocumentUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile && !documentUrl) {
      setError('يرجى اختيار صورة بطاقة الرقم القومي أو مستند التوثيق أولاً');
      return;
    }

    setIsSubmitting(true);

    try {
      let token = localStorage.getItem('sola_access_token');
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        throw new Error('جلسة غير صالحة. يرجى إعادة تسجيل الدخول برقم الهاتف');
      }

      const uploadPayload = {
        documentType,
        documentUrl: filePreviewUrl || documentUrl || `uploaded_doc_${Date.now()}.png`,
        fileName: selectedFile?.name || 'national_id.jpg',
        fileSize: selectedFile?.size || 0,
        nationalIdNumber,
      };

      const response = await fetch('/api/v1/owner/verification/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(uploadPayload),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'فشل إرسال وثائق التوثيق');
      }

      setSuccessMessage('تم إرسال وثائق التوثيق بنجاح! طلبك الآن قيد مراجعة مسئولي المنصة بالداتابيز.');
      showToast('تم رفع وثائق الهوية بنجاح 🟢', 'success');

      // Update owner state in context
      if (owner) {
        (owner as any).verificationStatus = 'PENDING_VERIFICATION';
      }

      setTimeout(() => {
        onClose();
        refreshData();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال الوثائق');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl" dir="rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right animate-fade-in relative">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">توثيق هوية المالك (Identity Verification)</h3>
              <p className="text-[11px] text-slate-500 font-semibold">رفع الرقم القومي ووثائق التوثيق المعتمدة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {successMessage ? (
          <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-extrabold text-sm">{successMessage}</h4>
            <p className="text-xs text-emerald-700">ستصلك إشعارات حظر المعاملات فور اتخاذ قرار التوثيق من Admin Portal.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">نوع وثيقة التوثيق المرفوعة:</label>
              <select
                value={documentType}
                onChange={(e: any) => setDocumentType(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-[#0059FF]"
              >
                <option value="NATIONAL_ID">بطاقة الرقم القومي المصرية (National ID Card)</option>
                <option value="PASSPORT">جواز السفر (Passport)</option>
                <option value="COMMERCIAL_REGISTER">السجل التجاري / عقد الملكية (Deed / Register)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">الرقم القومي (14 رقم):</label>
              <input
                type="text"
                maxLength={14}
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-[#0059FF]"
                placeholder="29901011234567"
                required
              />
            </div>

            {/* Document Upload Field */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">تحميل صور الوثيقة الرسمية (الوجهين):</label>
              <label className="border-2 border-dashed border-slate-300 hover:border-[#0059FF] rounded-2xl p-4 text-center space-y-2 bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer block">
                <Upload className="w-8 h-8 text-[#0059FF] mx-auto" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="font-extrabold text-slate-900 text-xs text-emerald-600">✓ تم اختيار الملف: {selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">الحجم: {(selectedFile.size / 1024).toFixed(1)} KB | النوع: {selectedFile.type || 'Document'}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-slate-700">اضغط لاختيار صورة بطاقة الرقم القومي من جهازك</div>
                    <div className="text-[10px] text-slate-400">صيغ قابلة للرفع: JPG, PNG, PDF (حد أقصى 10MB)</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-xs"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#0059FF] hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 shrink-0" />
                )}
                <span>إرسال وثائق التوثيق للإدارة</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
