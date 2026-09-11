import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  count?: number;
}

export interface MultiSelectDropdownProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptySummary?: string;
  clearLabel?: string;
  searchPlaceholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  label,
  icon,
  options,
  selected,
  onChange,
  placeholder,
  emptySummary = placeholder || 'الكل (بدون تحديد)',
  clearLabel = 'مسح التحديد',
  searchPlaceholder = 'ابحث في الخيارات...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const summaryText = useMemo(() => {
    if (selected.length === 0) {
      return emptySummary;
    }
    const selectedLabels = selected
      .map((selId) => options.find((o) => o.id === selId)?.label)
      .filter((l): l is string => Boolean(l));

    if (selectedLabels.length === 0) return emptySummary;
    if (selectedLabels.length === 1) return selectedLabels[0];
    if (selectedLabels.length === 2) return `${selectedLabels[0]}، ${selectedLabels[1]}`;
    return `${selectedLabels[0]} + ${selectedLabels.length - 1}`;
  }, [selected, options, emptySummary]);

  const toggleOption = (optId: string) => {
    if (selected.includes(optId)) {
      onChange(selected.filter((item) => item !== optId));
    } else {
      onChange([...selected, optId]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={`${id}-trigger`} className="flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A]">
          {icon}
          <span>{label}</span>
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="min-h-[44px] px-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 rounded-lg"
          >
            {clearLabel}
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[50px] px-3.5 py-2.5 bg-[#F8FAFC] border rounded-xl flex items-center justify-between text-right text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0059FF]/15 ${
          isOpen ? 'border-[#0059FF] ring-2 ring-[#0059FF]/15' : 'border-[#E2E8F0] hover:border-slate-300'
        }`}
      >
        <span
          className={`truncate font-bold ${
            selected.length > 0 ? 'text-[#0F172A]' : 'text-[#64748B]'
          }`}
        >
          {summaryText}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 mr-2">
          {selected.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#0059FF] text-white text-[11px] font-extrabold flex items-center justify-center">
              {selected.length}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          )}
        </div>
      </button>

      {/* Collapsible Options Container */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="mt-2 p-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-md space-y-2"
        >
          {/* Internal search if > 5 options */}
          {options.length > 5 && (
            <div className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-h-[44px] pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0059FF]"
              />
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs font-bold text-[#64748B]">
                لا توجد خيارات مطابقة
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(opt.id)}
                    className={`min-h-[44px] w-full px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 text-[#0059FF]' : 'hover:bg-slate-50 text-[#0F172A]'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0059FF] border-[#0059FF] text-white'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer controls */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B]">
              {selected.length === 0
                ? 'لم يتم تحديد أي عنصر'
                : `${selected.length} محدد`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-[40px] px-4 rounded-xl bg-[#0059FF] text-white text-xs font-bold hover:bg-[#0046CC] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
