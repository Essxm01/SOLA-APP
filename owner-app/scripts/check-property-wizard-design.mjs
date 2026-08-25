import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/properties/AddPropertyWizard.tsx', import.meta.url), 'utf8');
const forbidden = ['min-h-[36px]', 'w-8 h-8', 'bg-black/', 'bg-white/90', 'text-rose-', 'hover:bg-rose-', 'text-[10px]', 'type="number"', 'as any'];
const violation = forbidden.find(token => source.includes(token));
if (violation) throw new Error(`Property Wizard design regression: ${violation}`);
if (!source.includes("bg-[var(--konfrm-color-primary)] text-[var(--konfrm-text-inverse)]")) {
  throw new Error('Property Wizard Plus control must use the KONFRM primary treatment.');
}
if (source.includes("compact ? 'flex-col self-center'")) {
  throw new Error('Property Wizard counters must remain horizontally arranged inside compact Bento tiles.');
}
if (source.includes('sm:grid-cols-2')) {
  throw new Error('Property Wizard Step 3 must not use viewport breakpoints inside the mobile shell.');
}
if (!source.includes('w-[calc(min(100vw,430px)-32px)]')) {
  throw new Error('Property Wizard action island must stay constrained to the mobile shell width.');
}
console.log('Property Wizard design guard passed.');
