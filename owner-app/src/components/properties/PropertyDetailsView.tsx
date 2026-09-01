import React, { useState } from 'react';
import { ArrowRight, Bath, BedDouble, Building2, CalendarDays, Edit, MapPin, Maximize2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { PREDEFINED_AMENITIES } from '../../constants/theme';
import { getPropertyStatusPresentation, isRejectedProperty } from '../../utils/ownerProperties';

const money = (amount: number, currency = 'EGP') => `${new Intl.NumberFormat('ar-EG').format(amount)} ${currency === 'EGP' || currency === 'ج.م' ? 'ج.م' : currency}`;

export const PropertyDetailsView: React.FC = () => {
  const { properties, selectedPropertyId, setPropertyViewMode, openAddPropertyWizard, openCalendarForProperty, archiveProperty, restoreProperty, pauseProperty, resumeProperty } = useApp();
  const property = properties.find((item) => item.id === selectedPropertyId);
  const [imageIndex, setImageIndex] = useState(0);
  const [actionError, setActionError] = useState('');
  const [working, setWorking] = useState(false);
  if (!property) return <div className="p-6 text-center" dir="rtl"><p>لم يتم العثور على الوحدة المطلوبة.</p><Button variant="outline" onClick={() => setPropertyViewMode('list')} className="mt-4">العودة إلى الوحدات</Button></div>;

  const status = getPropertyStatusPresentation(property);
  const rejected = isRejectedProperty(property);
  const images = property.images || [];
  const run = async (action: () => Promise<void>) => { setWorking(true); setActionError(''); try { await action(); } catch { setActionError('تعذر تنفيذ الإجراء. حاول مرة أخرى.'); } finally { setWorking(false); } };
  const rules = [['التدخين', property.houseRules?.smokingAllowed], ['الحفلات', property.houseRules?.partiesAllowed], ['الحيوانات الأليفة', property.houseRules?.petsAllowed]].filter(([, value]) => value !== undefined);

  return <main className="space-y-5 p-4 pb-24 text-right" dir="rtl">
    <button type="button" onClick={() => setPropertyViewMode('list')} className="min-h-11 text-sm font-bold text-slate-700"><ArrowRight className="ml-1 inline h-4 w-4" />العودة إلى الوحدات</button>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {images.length ? <><img src={images[imageIndex] || images[0]} alt={property.title} className="h-60 w-full object-cover" />{images.length > 1 && <div className="flex gap-2 overflow-x-auto p-3">{images.map((src, index) => <button type="button" key={src} onClick={() => setImageIndex(index)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 ${imageIndex === index ? 'border-blue-600' : 'border-transparent'}`}><img src={src} alt={`صورة ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}</> : <div className="flex h-48 items-center justify-center bg-slate-100"><Building2 className="h-12 w-12 text-slate-400" /></div>}
      <div className="p-4"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span><h1 className="mt-3 text-xl font-black text-slate-900">{property.title || 'وحدة بلا عنوان'}</h1><p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" />{property.locationName || property.region || 'الموقع غير محدد'}</p><p className="mt-3 text-lg font-bold text-slate-900">{money(property.pricePerNight, property.currency)} / ليلة</p></div>
    </section>
    {rejected && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><h2 className="font-bold text-rose-900">تحتاج الوحدة إلى تعديلات</h2>{property.rejectionReason && <p className="mt-2 text-sm leading-6 text-rose-800">{property.rejectionReason}</p>}<Button fullWidth className="mt-3" onClick={() => openAddPropertyWizard(property)} icon={<Edit className="h-4 w-4" />}>تعديل الوحدة</Button></section>}
    {property.status === 'PENDING_REVIEW' && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تم إرسال الوحدة وهي قيد مراجعة الإدارة.</section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold">تفاصيل الوحدة</h2><div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div><BedDouble className="mx-auto h-5 w-5 text-blue-600" /><b>{property.bedrooms}</b><p>غرف</p></div><div><Bath className="mx-auto h-5 w-5 text-blue-600" /><b>{property.bathrooms}</b><p>حمامات</p></div><div><Users className="mx-auto h-5 w-5 text-blue-600" /><b>{property.maxGuests}</b><p>ضيوف</p></div>{property.areaSqM != null && <div><Maximize2 className="mx-auto h-5 w-5 text-blue-600" /><b>{property.areaSqM} م²</b><p>المساحة</p></div>}</div></section>
    {property.status === 'PUBLISHED' && <section className="space-y-2"><Button fullWidth onClick={() => openCalendarForProperty(property.id)} icon={<CalendarDays className="h-4 w-4" />}>إدارة التقويم والإتاحة</Button><Button variant="outline" fullWidth onClick={() => openAddPropertyWizard(property)} icon={<Edit className="h-4 w-4" />}>تعديل الوحدة</Button></section>}
    {property.description && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold">وصف الوحدة</h2><p className="mt-2 text-sm leading-6 text-slate-600">{property.description}</p></section>}
    {property.amenities?.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold">المرافق المتاحة</h2><div className="mt-3 flex flex-wrap gap-2">{PREDEFINED_AMENITIES.filter((amenity) => property.amenities.includes(amenity.id)).map((amenity) => <span key={amenity.id} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{amenity.name}</span>)}</div></section>}
    {rules.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold">قواعد الإقامة</h2><div className="mt-3 space-y-2 text-sm">{rules.map(([label, value]) => <p key={String(label)}>{label}: <b>{value ? 'مسموح' : 'غير مسموح'}</b></p>)}</div></section>}
    <section className="space-y-2 border-t border-slate-200 pt-4">{property.status === 'PAUSED' && <Button fullWidth variant="outline" isLoading={working} onClick={() => void run(() => resumeProperty(property.id))}>استئناف النشر</Button>}{property.status === 'ARCHIVED' && <Button fullWidth variant="outline" isLoading={working} onClick={() => void run(() => restoreProperty(property.id))}>استرجاع الوحدة</Button>}{property.status === 'PUBLISHED' && <Button fullWidth variant="outline" isLoading={working} onClick={() => void run(() => pauseProperty(property.id))}>إيقاف النشر مؤقتًا</Button>}{property.status !== 'ARCHIVED' && <Button fullWidth variant="outline" isLoading={working} onClick={() => { if (window.confirm('سيتم نقل الوحدة إلى الأرشيف، ويمكنك استرجاعها لاحقًا.')) void run(() => archiveProperty(property.id)); }}>أرشفة الوحدة</Button>}{actionError && <p className="text-center text-sm font-bold text-rose-700">{actionError}</p>}</section>
  </main>;
};
