import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/wallet/WalletFoundationView.tsx', import.meta.url), 'utf8');
const forbidden = ['bg-gradient-to-', 'blue-950', 'bg-slate-900', 'from-slate-', 'via-slate-', 'Sola', 'SOLA', 'صولا'];
const violation = forbidden.find((token) => source.includes(token));

if (violation) throw new Error(`Wallet design regression: ${violation}`);
if (!source.includes('bg-[var(--konfrm-text-primary)]')) throw new Error('Wallet withdraw CTA must retain its approved high-contrast action treatment.');
if (!source.includes('متاح للسحب الآن')) throw new Error('Wallet must retain canonical available balance hierarchy.');
console.log('Wallet design guard passed.');
