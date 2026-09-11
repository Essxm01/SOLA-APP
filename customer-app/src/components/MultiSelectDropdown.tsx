import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

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
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  label,
  icon,
  options,
  selected,
  onChange,
  placeholder,
  emptySummary = placeholder || 'كل الوجهات (اختياري)',
  clearLabel = 'مسح التحديد',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const summaryText = useMemo(() => {
    if (selected.length === 0) {
      return emptySummary;
    }
    const selectedLabels = selected
      .map((selId) => options.find((o) => o.id === selId)?.label)
      .filter((l): l is string => Boolean(l));

    if (selectedLabels.length === 0) return emptySummary;
    if (selectedLabels.length === 1) return selectedLabels[0];
    if (selectedLabels.length === 2) return `${selectedLabels[0]} + 1`;
    return `${selectedLabels.length} وجهات محددة`;
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

  const hasOptions = options.length > 0;

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

      {/* Trigger Button — Clarity & Simplicity matching guest stepper */}
      <button
        id={`${id}-trigger`}
        type="button"
        disabled={!hasOptions}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[50px] px-3.5 py-2.5 bg-[#F8FAFC] border rounded-xl flex items-center justify-between text-right text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0059FF]/15 ${
          !hasOptions
            ? 'border-[#E2E8F0] opacity-60 cursor-not-allowed text-[#94A3B8]'
            : isOpen
            ? 'border-[#0059FF] ring-2 ring-[#0059FF]/15'
            : 'border-[#E2E8F0] hover:border-slate-300'
        }`}
      >
        <span
          className={`truncate font-bold ${
            !hasOptions
              ? 'text-[#94A3B8]'
              : selected.length > 0
              ? 'text-[#0F172A]'
              : 'text-[#64748B]'
          }`}
        >
          {!hasOptions ? 'لا تتوفر وجهات حالياً' : summaryText}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 mr-2">
          {selected.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#0059FF] text-white text-[11px] font-bold flex items-center justify-center">
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

      {/* Collapsible Options Container — pure tap-to-select, zero typing */}
      {isOpen && hasOptions && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="mt-2 p-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-lg space-y-2"
        >
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-50">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(opt.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleOption(opt.id);
                    }
                  }}
                  className={`min-h-[44px] w-full px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40 ${
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
                </button>
              );
            })}
          </div>

          {/* Footer controls */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B]">
              {selected.length === 0
                ? 'لم يتم تحديد أي وجهة'
                : selected.length === 1
                ? 'وجهة واحدة محددة'
                : selected.length === 2
                ? 'وجهتان محددتان'
                : `${selected.length} وجهات محددة`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-[44px] px-5 rounded-xl bg-[#0059FF] text-white text-xs font-bold hover:bg-[#0046CC] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0059FF]/40"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
