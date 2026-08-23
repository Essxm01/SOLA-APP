import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { repositoryFactory } from '../../services/repositoryFactory';
import { Button } from '../ui/Button';

type DocumentType = 'NATIONAL_ID_FRONT' | 'NATIONAL_ID_BACK' | 'LIVE_FACE';
type LocalDocument = { file: File | null; preview: string; storageKey?: string };
const steps: Array<{ type: DocumentType; title: string; description: string; capture?: boolean }> = [
  { type: 'NATIONAL_ID_FRONT', title: 'صوّر وجه البطاقة', description: 'التقط صورة واضحة لوجه بطاقة الرقم القومي.' },
  { type: 'NATIONAL_ID_BACK', title: 'صوّر ظهر البطاقة', description: 'التقط صورة واضحة لظهر بطاقة الرقم القومي.' },
  { type: 'LIVE_FACE', title: 'صورة شخصية مباشرة', description: 'التقط صورة حديثة وواضحة لوجهك للمراجعة اليدوية.', capture: true },
];
const initialDocuments = (): Record<DocumentType, LocalDocument> => ({
  NATIONAL_ID_FRONT: { file: null, preview: '' },
  NATIONAL_ID_BACK: { file: null, preview: '' },
  LIVE_FACE: { file: null, preview: '' },
});

export const OwnerKycOnboarding: React.FC<{ onComplete: () => void; allowClose?: boolean; onClose?: () => void }> = ({ onComplete, allowClose = false, onClose }) => {
  const { refreshCanonicalOwner } = useAuth();
  const [current, setCurrent] = useState(0);
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pendingSubmitted, setPendingSubmitted] = useState(false);
  const step = steps[current];
  const complete = useMemo(() => steps.every(({ type }) => documents[type].file), [documents]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const status = await repositoryFactory.owner.getKycStatus();
        if (!active) return;
        if (status.verificationStatus === 'PENDING_VERIFICATION') setPendingSubmitted(true);
      } catch (err: any) {
        if (active) setError(err?.message || 'تعذر تحميل حالة التوثيق.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('اختر صورة JPG أو PNG أو WEBP بحجم لا يتجاوز 10 ميجابايت.');
      return;
    }
    setError('');
    setDocuments((previous) => {
      if (previous[step.type].preview) URL.revokeObjectURL(previous[step.type].preview);
      return { ...previous, [step.type]: { file, preview: URL.createObjectURL(file) } };
    });
  };

  const uploadAndSubmit = async () => {
    if (!complete || uploading) return;
    setUploading(true);
    setError('');
    try {
      const payload = [] as Array<{ documentType: DocumentType; storageKey: string; mimeType: string; fileSizeBytes: number }>;
      for (const { type } of steps) {
        const file = documents[type].file!;
        const signed = await repositoryFactory.owner.getKycPresignedUpload({ documentType: type, fileName: file.name, mimeType: file.type, fileSize: file.size });
        const response = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers || { 'Content-Type': file.type }, body: file });
        if (!response.ok) throw new Error('تعذر رفع إحدى صور التوثيق. حاول مرة أخرى.');
        payload.push({ documentType: type, storageKey: signed.storageKey, mimeType: file.type, fileSizeBytes: file.size });
      }
      await repositoryFactory.owner.submitKycPackage(payload);
      // Keep this local acknowledgement mounted until the Owner explicitly
      // chooses to enter the workspace. Refreshing now would unmount it.
      setPendingSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال بيانات التوثيق للمراجعة.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-[var(--konfrm-surface-canvas)] p-6 text-center text-[var(--konfrm-text-secondary)] dir-rtl">جاري تجهيز التوثيق…</main>;
  if (pendingSubmitted) return (
    <main className="min-h-screen bg-[var(--konfrm-surface-canvas)] px-6 py-10 text-center dir-rtl">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-[var(--konfrm-radius-modal)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-7">
        <CheckCircle2 className="mb-5 h-14 w-14 text-[var(--konfrm-semantic-success)]" />
        <h1 className="mb-3 text-xl font-extrabold text-[var(--konfrm-text-primary)]">تم إرسال بياناتك للمراجعة</h1>
        <p className="mb-7 leading-7 text-[var(--konfrm-text-secondary)]">سنوضح لك حالة التوثيق داخل حسابك بعد مراجعتها.</p>
        <Button type="button" variant="primary" size="lg" fullWidth onClick={async () => {
          setError('');
          const canonicalOwner = await refreshCanonicalOwner();
          if (!canonicalOwner) { setError('تعذر تحديث حالة حساب المالك. حاول مرة أخرى.'); return; }
          onComplete();
        }}>الدخول إلى حساب المالك</Button>
        {error && <p role="alert" className="mt-4 text-sm text-[var(--konfrm-semantic-danger)]">{error}</p>}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[var(--konfrm-surface-canvas)] px-6 py-8 text-right dir-rtl">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between">
          <img src="/LOGO.svg" alt="KONFRM / كونفرم" className="h-10 w-10" />
          {allowClose && <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-[var(--konfrm-text-secondary)]">لاحقاً</button>}
        </div>
        <div className="mb-6 flex gap-2" aria-label={`الخطوة ${current + 1} من 3`}>
          {steps.map((item, index) => <span key={item.type} className={`h-1.5 flex-1 rounded-full ${index <= current ? 'bg-[var(--konfrm-color-primary)]' : 'bg-[var(--konfrm-border-subtle)]'}`} />)}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--konfrm-radius-card)] bg-[var(--konfrm-color-primary-soft)] text-[var(--konfrm-color-primary)]">
            {step.capture ? <Camera className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <p className="mb-2 text-sm font-semibold text-[var(--konfrm-color-primary)]">الخطوة {current + 1} من 3</p>
          <h1 className="mb-2 text-2xl font-extrabold text-[var(--konfrm-text-primary)]">{step.title}</h1>
          <p className="mb-7 text-base leading-7 text-[var(--konfrm-text-secondary)]">{step.description}</p>
          {error && <div role="alert" className="mb-5 rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-semantic-danger)] bg-[var(--konfrm-semantic-danger-soft)] p-3 text-sm text-[var(--konfrm-semantic-danger)]">{error}</div>}
          <label className="block min-h-56 cursor-pointer rounded-[var(--konfrm-radius-card)] border-2 border-dashed border-[var(--konfrm-border-strong)] bg-[var(--konfrm-surface-secondary)] p-4 text-center">
            {documents[step.type].preview ? <img src={documents[step.type].preview} alt="معاينة الصورة المختارة" className="h-52 w-full rounded-[var(--konfrm-radius-control)] object-contain" /> : <span className="flex h-48 flex-col items-center justify-center gap-3 text-[var(--konfrm-text-secondary)]"><ImagePlus className="h-9 w-9 text-[var(--konfrm-color-primary)]" /><span className="font-semibold">اضغط لالتقاط أو اختيار صورة</span><span className="text-sm">JPG أو PNG أو WEBP — حتى 10 ميجابايت</span></span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture={step.capture ? 'user' : undefined} onChange={chooseFile} className="sr-only" />
          </label>
          {documents[step.type].file && <p className="mt-3 text-sm font-semibold text-[var(--konfrm-semantic-success)]">تم اختيار الصورة — يمكنك استبدالها إذا احتجت.</p>}
        </div>
        <div className="mt-7 flex gap-3">
          {current > 0 && <Button type="button" variant="outline" size="lg" onClick={() => setCurrent((value) => value - 1)} className="min-h-12"><ChevronRight className="h-5 w-5" /> السابق</Button>}
          {current < steps.length - 1 ? <Button type="button" variant="primary" size="lg" fullWidth onClick={() => documents[step.type].file ? setCurrent((value) => value + 1) : setError('اختر صورة لهذه الخطوة أولاً.')} className="min-h-12">التالي <ChevronLeft className="h-5 w-5" /></Button> : <Button type="button" variant="primary" size="lg" fullWidth disabled={!complete || uploading} onClick={() => void uploadAndSubmit()} className="min-h-12">{uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> جاري الإرسال</> : 'إرسال للمراجعة'}</Button>}
        </div>
      </div>
    </main>
  );
};
