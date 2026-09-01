import React, { useMemo, useState } from 'react';
import { Building2, ChevronLeft, MapPin, Plus, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Property } from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { AddPropertyWizard } from './AddPropertyWizard';
import {
  getOwnerPropertyCollections,
  getPropertyStatusPresentation,
  isPropertyActionRequired,
  isRejectedProperty,
  ownerPropertyFilterCount,
  primaryPropertyAction,
  type OwnerPropertyFilter,
} from '../../utils/ownerProperties';

const filters: Array<{ id: OwnerPropertyFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'action', label: 'تحتاج إجراء' },
  { id: 'published', label: 'منشورة' },
  { id: 'review', label: 'قيد المراجعة' },
  { id: 'drafts', label: 'مسودات' },
  { id: 'other', label: 'أخرى' },
];

const money = (amount: number, currency = 'EGP') =>
  `${new Intl.NumberFormat('ar-EG').format(amount)} ${currency === 'EGP' || currency === 'ج.م' ? 'ج.م' : currency}`;

export const PropertiesFoundationView: React.FC = () => {
  const { properties, isLoading, error, refreshData, propertyViewMode, openAddPropertyWizard, openPropertyDetails, setDailyPricing } = useApp();
  const [filter, setFilter] = useState<OwnerPropertyFilter>('all');
  const [pricing, setPricing] = useState<Property | null>(null);
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const list = useMemo(() => getOwnerPropertyCollections(properties, filter), [properties, filter]);

  if (propertyViewMode === 'wizard') return <AddPropertyWizard />;
  if (isLoading) return <div className="flex flex-col gap-3 p-4"><div className="h-16 animate-pulse rounded-2xl bg-[var(--konfrm-surface-secondary)]" /><div className="h-32 animate-pulse rounded-2xl bg-[var(--konfrm-surface-secondary)]" /></div>;
  if (error) return <section className="p-6 text-center" dir="rtl"><h2 className="text-lg font-extrabold">تعذر تحميل وحداتك</h2><p className="mt-2 text-sm text-[var(--konfrm-text-secondary)]">تحقق من الاتصال وحاول مرة أخرى.</p><Button className="mt-4" onClick={() => void refreshData()}>إعادة المحاولة</Button></section>;

  const openPricing = (property: Property) => {
    setPricing(property);
    setDate('');
    setPrice(String(property.pricePerNight || ''));
    setMessage('');
  };
  const savePrice = async () => {
    if (!pricing || !date || !Number(price)) {
      setMessage('اختر التاريخ وأدخل سعرًا صحيحًا.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await setDailyPricing(pricing.id, { [date]: Number(price) });
      setPricing(null);
    } catch {
      setMessage('تعذر حفظ السعر. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="flex flex-col gap-5 p-4 pb-24" dir="rtl">
    <header className="flex items-start justify-between gap-3">
      <div><h1 className="text-[22px] font-extrabold text-[var(--konfrm-text-primary)]">وحداتك</h1><p className="mt-1 text-sm text-[var(--konfrm-text-secondary)]">تابع وحداتك وحالتها وإدارتها من مكان واحد.</p></div>
      <Button size="sm" icon={<Plus size={16} />} onClick={() => openAddPropertyWizard()}>إضافة وحدة</Button>
    </header>
    {properties.length === 0 ? <section className="rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-5 text-center"><Building2 className="mx-auto text-[var(--konfrm-text-muted)]" size={32} /><h2 className="mt-3 text-lg font-extrabold">ابدأ بإضافة أول وحدة</h2><p className="mt-2 text-sm leading-6 text-[var(--konfrm-text-secondary)]">أضف بيانات وحدتك وأرسلها للمراجعة لتصبح جاهزة للظهور للمستأجرين.</p><Button fullWidth className="mt-4" onClick={() => openAddPropertyWizard()}>إضافة وحدة</Button></section> : <>
      <nav className="flex gap-2 overflow-x-auto" aria-label="تصفية الوحدات">
        {filters.filter((item) => item.id === 'all' || ownerPropertyFilterCount(properties, item.id) > 0).map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className="min-h-11 shrink-0 rounded-full border px-3 text-[13px] font-bold" style={{ borderColor: filter === item.id ? 'var(--konfrm-border-focus)' : 'var(--konfrm-border-default)', background: filter === item.id ? 'var(--konfrm-interaction-selected)' : 'var(--konfrm-surface-primary)', color: filter === item.id ? 'var(--konfrm-color-primary)' : 'var(--konfrm-text-secondary)' }}>{item.label} <span className="text-[var(--konfrm-text-muted)]">{ownerPropertyFilterCount(properties, item.id)}</span></button>)}
      </nav>
      <section className="flex flex-col gap-3">
        {list.length === 0 ? <p className="py-8 text-center text-sm text-[var(--konfrm-text-secondary)]">لا توجد وحدات في هذا القسم.</p> : list.map((property) => {
          const rejected = isRejectedProperty(property);
          const urgent = isPropertyActionRequired(property);
          const presentation = getPropertyStatusPresentation(property);
          const image = property.images?.[0];
          const tone = property.status === 'PUBLISHED' ? 'success' : rejected || property.status === 'SUSPENDED' ? 'danger' : property.status === 'PENDING_REVIEW' || property.status === 'DRAFT' ? 'warning' : 'info';
          return <article key={property.id} className="rounded-[var(--konfrm-radius-card)] border border-[var(--konfrm-border-default)] bg-[var(--konfrm-surface-primary)] p-4 shadow-[var(--konfrm-shadow-subtle)]">
            <button type="button" onClick={() => urgent ? openAddPropertyWizard(property) : openPropertyDetails(property.id)} className="w-full text-right">
              <div className="flex gap-3"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[var(--konfrm-radius-control)] bg-[var(--konfrm-surface-secondary)] text-[var(--konfrm-text-muted)]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Building2 size={24} />}</div><div className="min-w-0 flex-1"><span className="inline-flex rounded-full border px-2 py-1 text-[13px] font-bold" style={{ borderColor: `var(--konfrm-semantic-${tone}-border)`, background: `var(--konfrm-semantic-${tone}-background)`, color: `var(--konfrm-semantic-${tone}-text)` }}>{presentation.label}</span><h2 className="mt-2 line-clamp-2 text-base font-bold text-[var(--konfrm-text-primary)]">{property.title || 'وحدة بلا عنوان'}</h2><p className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--konfrm-text-secondary)]"><MapPin size={16} />{property.locationName || property.region || 'الموقع غير محدد'}</p><p className="mt-1 text-base font-bold text-[var(--konfrm-text-primary)]">{money(property.pricePerNight, property.currency)} / ليلة</p></div></div>
              <div className="mt-3 flex min-h-11 items-center justify-between text-sm font-bold" style={{ color: urgent ? 'var(--konfrm-color-primary)' : 'var(--konfrm-text-secondary)' }}><span>{primaryPropertyAction(property)}</span><ChevronLeft size={20} /></div>
            </button>
            {property.status === 'PUBLISHED' && <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={16} />} onClick={() => openPricing(property)}>سعر ليلة محددة</Button>}
          </article>;
        })}
      </section>
    </>}
    <BottomSheet isOpen={!!pricing} onClose={() => !saving && setPricing(null)} title="سعر ليلة محددة"><div className="flex flex-col gap-3"><p className="text-sm text-[var(--konfrm-text-secondary)]">يمكنك تحديد سعر مختلف لليلة معينة.</p><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] px-3" /><input type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} className="min-h-11 rounded-[var(--konfrm-radius-control)] border border-[var(--konfrm-border-default)] px-3" />{message && <p className="text-sm text-[var(--konfrm-semantic-danger-text)]">{message}</p>}<Button fullWidth isLoading={saving} onClick={() => void savePrice()}>حفظ السعر</Button></div></BottomSheet>
  </main>;
};
