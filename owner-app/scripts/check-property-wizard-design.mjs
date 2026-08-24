import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/properties/AddPropertyWizard.tsx', import.meta.url), 'utf8');
const forbidden = ['min-h-[36px]', 'w-8 h-8', 'bg-black/', 'bg-white/90', 'text-rose-', 'hover:bg-rose-', 'text-[10px]', 'type="number"', 'as any'];
const violation = forbidden.find(token => source.includes(token));
if (violation) throw new Error(`Property Wizard design regression: ${violation}`);
if (!source.includes("bg-[var(--konfrm-color-primary)] text-[var(--konfrm-text-inverse)]")) {
  throw new Error('Property Wizard Plus control must use the KONFRM primary treatment.');
}
console.log('Property Wizard design guard passed.');
